import winston from 'winston';
import { config } from '../config/environment';

/**
 * Winston logger configuration for production-ready logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'safe-communication-rewriter-api',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: config.env === 'production' ? logFormat : consoleFormat,
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels and their descriptions
 */
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;

/**
 * Structured logging helper functions
 */
export const loggers = {
  /**
   * Log API request
   */
  request: (req: any, res: any, responseTime: number) => {
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      userId: req.user?.id,
    });
  },

  /**
   * Log API error
   */
  error: (error: Error, req?: any, additionalInfo?: any) => {
    logger.error('API Error', {
      message: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      ip: req?.ip,
      userId: req?.user?.id,
      ...additionalInfo,
    });
  },

  /**
   * Log database operation
   */
  database: (operation: string, collection: string, duration: number, success: boolean) => {
    const level = success ? 'info' : 'error';
    logger[level]('Database Operation', {
      operation,
      collection,
      duration: `${duration}ms`,
      success,
    });
  },

  /**
   * Log Gemini AI request
   */
  gemini: (requestId: string, messageLength: number, responseTime: number, success: boolean) => {
    const level = success ? 'info' : 'error';
    logger[level]('Gemini AI Request', {
      requestId,
      messageLength,
      responseTime: `${responseTime}ms`,
      success,
    });
  },

  /**
   * Log cache operation
   */
  cache: (operation: 'hit' | 'miss' | 'set' | 'delete', key: string, ttl?: number) => {
    logger.info('Cache Operation', {
      operation,
      key,
      ttl,
    });
  },

  /**
   * Log security event
   */
  security: (event: string, ip: string, userId?: string, details?: any) => {
    logger.warn('Security Event', {
      event,
      ip,
      userId,
      ...details,
    });
  },

  /**
   * Log performance metrics
   */
  performance: (metric: string, value: number, unit: string = 'ms') => {
    logger.info('Performance Metric', {
      metric,
      value,
      unit,
    });
  },
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggers.request(req, res, duration);
  });
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  loggers.error(error, req);
  next(error);
};

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static start(label: string): void {
    this.timers.set(label, Date.now());
  }

  static end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      logger.warn(`Performance timer '${label}' not found`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);
    
    loggers.performance(label, duration);
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
}

export default logger;
