import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Rate limiting middleware configurations
 */

// General API rate limiter
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

// Strict rate limiter for rewrite endpoint
export const rewriteRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 5, // More restrictive for AI operations
  message: {
    success: false,
    error: 'Too many rewrite requests. Please wait before trying again.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rewrite rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many rewrite requests. Please wait before trying again.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});

// User-specific rate limiter (requires authentication)
export const userRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20, // Higher limit for authenticated users
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
  message: {
    success: false,
    error: 'Too many requests for this user, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('User rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests for this user, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});

// Analytics endpoint rate limiter
export const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: {
    success: false,
    error: 'Too many analytics requests, please try again later.',
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Analytics rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many analytics requests, please try again later.',
      retryAfter: 300,
    });
  },
});

// Pattern reporting rate limiter
export const patternRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 pattern reports per minute
  message: {
    success: false,
    error: 'Too many pattern reports, please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Pattern rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many pattern reports, please try again later.',
      retryAfter: 60,
    });
  },
});

// Custom rate limiter factory
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message || 'Rate limit exceeded',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip),
    skip: options.skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id,
        key: options.keyGenerator ? options.keyGenerator(req) : req.ip,
      });
      
      res.status(429).json({
        success: false,
        error: options.message || 'Rate limit exceeded',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Rate limit bypass for trusted IPs (if needed)
export const bypassRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
  
  if (trustedIPs.includes(req.ip)) {
    logger.info('Rate limit bypassed for trusted IP', { ip: req.ip });
    return next();
  }
  
  next();
};

// Rate limit status middleware
export const rateLimitStatus = (req: Request, res: Response, next: NextFunction) => {
  const rateLimitInfo = {
    limit: config.rateLimit.max,
    remaining: (req as any).rateLimit?.remaining || 'unknown',
    reset: (req as any).rateLimit?.resetTime || 'unknown',
  };
  
  res.set({
    'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
    'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitInfo.reset).toISOString(),
  });
  
  next();
};
