import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { APIError } from '../types';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    code = 'DUPLICATE_ENTRY';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.message.includes('rate limit')) {
    statusCode = 429;
    message = error.message;
    code = 'RATE_LIMIT_EXCEEDED';
  } else if (error.message.includes('Gemini API')) {
    statusCode = 502;
    message = 'AI service temporarily unavailable';
    code = 'AI_SERVICE_ERROR';
  } else if (error.message.includes('Cache')) {
    statusCode = 503;
    message = 'Cache service unavailable';
    code = 'CACHE_SERVICE_ERROR';
  } else if (error.message.includes('Database')) {
    statusCode = 503;
    message = 'Database service unavailable';
    code = 'DATABASE_SERVICE_ERROR';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  const errorResponse: APIError = {
    code,
    message,
    timestamp: new Date().toISOString(),
  };

  // Include additional details in development
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).details = {
      stack: error.stack,
      name: error.name,
    };
  }

  res.status(statusCode).json({
    success: false,
    error: errorResponse,
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'API_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends APIError {
  public field: string;
  public value: any;

  constructor(field: string, message: string, value?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Resource not found error class
 */
export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends APIError {
  public retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

/**
 * Service unavailable error class
 */
export class ServiceUnavailableError extends APIError {
  constructor(service: string = 'Service') {
    super(`${service} temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Error response helper
 */
export const sendErrorResponse = (
  res: Response,
  error: APIError | Error,
  statusCode?: number
): void => {
  const apiError = error instanceof APIError ? error : new APIError(error.message);
  
  res.status(statusCode || apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      timestamp: new Date().toISOString(),
      ...(apiError instanceof ValidationError && {
        field: apiError.field,
        value: apiError.value,
      }),
      ...(apiError instanceof RateLimitError && {
        retryAfter: apiError.retryAfter,
      }),
    },
  });
};

/**
 * Success response helper
 */
export const sendSuccessResponse = (
  res: Response,
  data: any,
  statusCode: number = 200,
  message?: string
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  });
};
