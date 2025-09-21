import { Router } from 'express';
import { CommunicationController } from '../controllers/communicationController';
import { 
  generalRateLimit, 
  rewriteRateLimit, 
  userRateLimit, 
  analyticsRateLimit, 
  patternRateLimit 
} from '../middleware/rateLimiter';
import { 
  validateRewriteRequest, 
  validatePagination, 
  validateAnalyticsQuery, 
  validatePatternReport 
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   POST /api/rewrite
 * @desc    Rewrite a scam message using AI
 * @access  Public (with optional authentication)
 */
router.post(
  '/rewrite',
  rewriteRateLimit,
  validateRewriteRequest,
  asyncHandler(CommunicationController.rewriteMessage)
);

/**
 * @route   GET /api/history
 * @desc    Get user's rewrite history
 * @access  Private (requires authentication)
 */
router.get(
  '/history',
  userRateLimit,
  validatePagination,
  asyncHandler(CommunicationController.getHistory)
);

/**
 * @route   GET /api/analytics
 * @desc    Get usage analytics and statistics
 * @access  Private (requires authentication)
 */
router.get(
  '/analytics',
  analyticsRateLimit,
  validateAnalyticsQuery,
  asyncHandler(CommunicationController.getAnalytics)
);

/**
 * @route   POST /api/patterns
 * @desc    Report a new scam pattern
 * @access  Public (with optional authentication)
 */
router.post(
  '/patterns',
  patternRateLimit,
  validatePatternReport,
  asyncHandler(CommunicationController.reportPattern)
);

/**
 * @route   GET /api/patterns/trending
 * @desc    Get trending scam patterns
 * @access  Public
 */
router.get(
  '/patterns/trending',
  generalRateLimit,
  asyncHandler(CommunicationController.getTrendingPatterns)
);

export default router;
