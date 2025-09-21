import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler';
import { config } from '../config/environment';

/**
 * Validation result handler
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    throw new ValidationError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      errorMessages
    );
  }
  
  next();
};

/**
 * Rewrite request validation
 */
export const validateRewriteRequest = [
  body('message')
    .isString()
    .withMessage('Message must be a string')
    .isLength({ min: 1, max: config.api.maxMessageLength })
    .withMessage(`Message must be between 1 and ${config.api.maxMessageLength} characters`)
    .trim()
    .escape(),
  
  body('region')
    .optional()
    .isString()
    .withMessage('Region must be a string')
    .isIn(['US', 'UK', 'CA', 'AU', 'IN', 'SG', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'BR', 'MX'])
    .withMessage('Invalid region code')
    .trim(),
  
  body('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters')
    .trim(),
  
  handleValidationErrors,
];

/**
 * User creation validation
 */
export const validateUserCreation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
  
  body('preferences.region')
    .optional()
    .isString()
    .withMessage('Region must be a string')
    .isIn(['US', 'UK', 'CA', 'AU', 'IN', 'SG', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'BR', 'MX'])
    .withMessage('Invalid region code')
    .trim(),
  
  body('preferences.language')
    .optional()
    .isString()
    .withMessage('Language must be a string')
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'hi'])
    .withMessage('Invalid language code')
    .trim(),
  
  handleValidationErrors,
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string')
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort must be between 1 and 50 characters')
    .trim(),
  
  query('order')
    .optional()
    .isString()
    .withMessage('Order must be a string')
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc')
    .trim(),
  
  handleValidationErrors,
];

/**
 * Analytics query validation
 */
export const validateAnalyticsQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),
  
  query('region')
    .optional()
    .isString()
    .withMessage('Region must be a string')
    .isIn(['US', 'UK', 'CA', 'AU', 'IN', 'SG', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'BR', 'MX'])
    .withMessage('Invalid region code')
    .trim(),
  
  query('userId')
    .optional()
    .isString()
    .withMessage('User ID must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('User ID must be between 1 and 100 characters')
    .trim(),
  
  handleValidationErrors,
];

/**
 * Pattern report validation
 */
export const validatePatternReport = [
  body('message')
    .isString()
    .withMessage('Message must be a string')
    .isLength({ min: 1, max: config.api.maxMessageLength })
    .withMessage(`Message must be between 1 and ${config.api.maxMessageLength} characters`)
    .trim()
    .escape(),
  
  body('category')
    .isString()
    .withMessage('Category must be a string')
    .isIn([
      'phishing',
      'urgent_payment',
      'fake_links',
      'personal_info',
      'suspicious_attachments',
      'fake_authority',
      'too_good_to_be_true',
      'pressure_tactics',
      'grammar_errors',
      'suspicious_sender',
      'other',
    ])
    .withMessage('Invalid category')
    .trim(),
  
  body('severity')
    .optional()
    .isString()
    .withMessage('Severity must be a string')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
    .trim(),
  
  handleValidationErrors,
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors,
];

/**
 * JWT token validation
 */
export const validateJWT = [
  body('token')
    .isString()
    .withMessage('Token must be a string')
    .isLength({ min: 10 })
    .withMessage('Token must be at least 10 characters')
    .trim(),
  
  handleValidationErrors,
];

/**
 * Sanitize input middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize string inputs
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Content type validation
 */
export const validateContentType = (expectedType: string = 'application/json') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes(expectedType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `Content-Type must be ${expectedType}`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
};

/**
 * Request size validation
 */
export const validateRequestSize = (maxSize: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds ${maxSize} bytes`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
};
