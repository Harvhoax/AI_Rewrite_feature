import { Request, Response, NextFunction } from 'express';
import { RewriteRequest, RewriteResponse, AuthenticatedRequest } from '../types';
import { geminiService } from '../services/geminiService';
import { cacheService } from '../services/cacheService';
import { User } from '../models/User';
import { RewriteHistory } from '../models/RewriteHistory';
import { ScamPattern } from '../models/ScamPattern';
import { logger, PerformanceMonitor } from '../utils/logger';
import { sendSuccessResponse, sendErrorResponse, APIError } from '../middleware/errorHandler';

/**
 * Communication Controller for handling rewrite requests
 */
export class CommunicationController {
  /**
   * Rewrite a scam message using AI
   */
  public static async rewriteMessage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { message, region = 'US', userId } = req.body as RewriteRequest;
      const startTime = Date.now();

      // Check cache first
      const cacheKey = cacheService.getRewriteKey(message, region);
      const cachedResult = await cacheService.get<RewriteResponse['data']>(cacheKey);

      if (cachedResult) {
        logger.info('Cache hit for rewrite request', { messageLength: message.length, region });
        
        // Update user usage count if authenticated
        if (req.user) {
          await req.user.incrementUsage();
        }

        sendSuccessResponse(res, {
          ...cachedResult,
          cached: true,
        });
        return;
      }

      // Call Gemini AI service
      const aiResult = await PerformanceMonitor.measureAsync('gemini_rewrite', async () => {
        return await geminiService.rewriteMessage(message, region);
      });

      // Cache the result
      await cacheService.set(cacheKey, aiResult, 300); // 5 minutes TTL

      // Save to database
      const historyRecord = new RewriteHistory({
        user_id: req.user?.id || userId,
        original_message: message,
        safe_version: aiResult.safe_version,
        region,
        response_time: Date.now() - startTime,
        cached: false,
        red_flags_fixed: aiResult.red_flags_fixed,
        differences: aiResult.differences,
      });

      await historyRecord.save();

      // Update user usage count if authenticated
      if (req.user) {
        await req.user.incrementUsage();
      }

      // Learn from the pattern
      await ScamPattern.findOrCreatePattern(
        message,
        this.categorizeMessage(message),
        this.assessSeverity(aiResult.red_flags_fixed)
      );

      logger.info('Message successfully rewritten', {
        messageLength: message.length,
        region,
        responseTime: Date.now() - startTime,
        redFlagsFixed: aiResult.red_flags_fixed,
        userId: req.user?.id || userId,
      });

      sendSuccessResponse(res, {
        ...aiResult,
        cached: false,
      });
    } catch (error: any) {
      logger.error('Error in rewriteMessage:', error);
      next(error);
    }
  }

  /**
   * Get rewrite history for a user
   */
  public static async getHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        throw new APIError('User authentication required', 401, 'AUTHENTICATION_REQUIRED');
      }

      const skip = (Number(page) - 1) * Number(limit);
      const sortOrder = order === 'asc' ? 1 : -1;

      const [history, total] = await Promise.all([
        RewriteHistory.find({ user_id: userId })
          .sort({ [sort as string]: sortOrder })
          .skip(skip)
          .limit(Number(limit)),
        RewriteHistory.countDocuments({ user_id: userId }),
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      sendSuccessResponse(res, {
        data: history,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error: any) {
      logger.error('Error in getHistory:', error);
      next(error);
    }
  }

  /**
   * Get analytics data
   */
  public static async getAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate, region, userId } = req.query;
      
      // Build match criteria
      const matchCriteria: any = {};
      
      if (startDate || endDate) {
        matchCriteria.created_at = {};
        if (startDate) matchCriteria.created_at.$gte = new Date(startDate as string);
        if (endDate) matchCriteria.created_at.$lte = new Date(endDate as string);
      }
      
      if (region) matchCriteria.region = region;
      if (userId) matchCriteria.user_id = userId;

      const [
        totalRewrites,
        uniqueUsers,
        averageResponseTime,
        cacheHitRate,
        topRegions,
        dailyStats,
        patternTrends,
      ] = await Promise.all([
        RewriteHistory.countDocuments(matchCriteria),
        RewriteHistory.distinct('user_id', matchCriteria).then(ids => ids.length),
        RewriteHistory.aggregate([
          { $match: matchCriteria },
          { $group: { _id: null, avg: { $avg: '$response_time' } } },
        ]).then(result => result[0]?.avg || 0),
        RewriteHistory.aggregate([
          { $match: matchCriteria },
          { $group: { _id: null, rate: { $avg: { $cond: ['$cached', 1, 0] } } } },
        ]).then(result => result[0]?.rate || 0),
        RewriteHistory.getStatsByRegion(),
        RewriteHistory.getStatsByDate(
          startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate ? new Date(endDate as string) : new Date()
        ),
        ScamPattern.aggregate([
          { $match: { is_active: true } },
          { $sort: { frequency: -1 } },
          { $limit: 10 },
          { $project: { pattern: '$category', frequency: 1, trend: 'stable' } },
        ]),
      ]);

      sendSuccessResponse(res, {
        totalRewrites,
        uniqueUsers,
        averageResponseTime: Math.round(averageResponseTime),
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        topRegions,
        dailyStats,
        patternTrends,
      });
    } catch (error: any) {
      logger.error('Error in getAnalytics:', error);
      next(error);
    }
  }

  /**
   * Report a new scam pattern
   */
  public static async reportPattern(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { message, category, severity = 'medium' } = req.body;

      const pattern = await ScamPattern.findOrCreatePattern(message, category, severity);

      logger.info('Scam pattern reported', {
        patternId: pattern._id,
        category,
        severity,
        userId: req.user?.id,
      });

      sendSuccessResponse(res, {
        patternId: pattern._id,
        message: 'Pattern reported successfully',
      });
    } catch (error: any) {
      logger.error('Error in reportPattern:', error);
      next(error);
    }
  }

  /**
   * Get trending scam patterns
   */
  public static async getTrendingPatterns(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      
      const patterns = await ScamPattern.findTrending(Number(limit));

      sendSuccessResponse(res, {
        patterns: patterns.map(pattern => ({
          id: pattern._id,
          category: pattern.category,
          frequency: pattern.frequency,
          severity: pattern.severity,
          lastSeen: pattern.last_seen,
          examples: pattern.examples.slice(0, 3), // Show only first 3 examples
        })),
      });
    } catch (error: any) {
      logger.error('Error in getTrendingPatterns:', error);
      next(error);
    }
  }

  /**
   * Categorize message based on content
   */
  private static categorizeMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('click') || lowerMessage.includes('http')) {
      return 'fake_links';
    }
    if (lowerMessage.includes('urgent') || lowerMessage.includes('immediately')) {
      return 'urgent_payment';
    }
    if (lowerMessage.includes('password') || lowerMessage.includes('pin')) {
      return 'personal_info';
    }
    if (lowerMessage.includes('bank') || lowerMessage.includes('account')) {
      return 'fake_authority';
    }
    if (lowerMessage.includes('free') || lowerMessage.includes('win')) {
      return 'too_good_to_be_true';
    }
    
    return 'other';
  }

  /**
   * Assess severity based on red flags
   */
  private static assessSeverity(redFlags: number): 'low' | 'medium' | 'high' | 'critical' {
    if (redFlags >= 7) return 'critical';
    if (redFlags >= 5) return 'high';
    if (redFlags >= 3) return 'medium';
    return 'low';
  }
}
