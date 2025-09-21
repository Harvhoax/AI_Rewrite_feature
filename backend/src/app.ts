import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/environment';
import { logger, requestLogger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimiter';
import { validateContentType, validateRequestSize } from './middleware/validation';
import communicationRoutes from './routes/communicationRoutes';

/**
 * Express application setup
 */
const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
if (config.features.securityHeaders) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

// CORS configuration
app.use(cors(config.cors));

// Compression middleware
if (config.features.compression) {
  app.use(compression());
}

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Content type validation
app.use(validateContentType());

// Request size validation
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB

// Input sanitization
app.use((req, res, next) => {
  // Basic input sanitization
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/[<>]/g, '').trim();
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitize(req.body);
  }
  next();
});

// Rate limiting
app.use(generalRateLimit);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    services: {
      database: 'connected', // Will be updated by database connection
      redis: 'connected',    // Will be updated by cache service
      gemini: 'available',   // Will be updated by gemini service
    },
  };

  res.status(200).json(healthCheck);
});

// API routes
app.use('/api', communicationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Safe Communication Rewriter API',
    version: process.env.npm_package_version || '1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Safe Communication Rewriter API',
    version: '1.0.0',
    description: 'AI-powered scam message detection and rewriting service',
    endpoints: {
      'POST /api/rewrite': {
        description: 'Rewrite a scam message using AI',
        parameters: {
          message: 'string (required) - The suspicious message to analyze',
          region: 'string (optional) - Region code (US, UK, CA, etc.)',
          userId: 'string (optional) - User identifier',
        },
        example: {
          message: 'Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately',
          region: 'IN',
        },
      },
      'GET /api/history': {
        description: 'Get user rewrite history (requires authentication)',
        parameters: {
          page: 'number (optional) - Page number',
          limit: 'number (optional) - Items per page',
          sort: 'string (optional) - Sort field',
          order: 'string (optional) - Sort order (asc/desc)',
        },
      },
      'GET /api/analytics': {
        description: 'Get usage analytics (requires authentication)',
        parameters: {
          startDate: 'string (optional) - Start date (ISO 8601)',
          endDate: 'string (optional) - End date (ISO 8601)',
          region: 'string (optional) - Filter by region',
          userId: 'string (optional) - Filter by user',
        },
      },
      'POST /api/patterns': {
        description: 'Report a new scam pattern',
        parameters: {
          message: 'string (required) - Example scam message',
          category: 'string (required) - Pattern category',
          severity: 'string (optional) - Severity level',
        },
      },
      'GET /api/patterns/trending': {
        description: 'Get trending scam patterns',
        parameters: {
          limit: 'number (optional) - Number of patterns to return',
        },
      },
    },
    rateLimits: {
      general: `${config.rateLimit.max} requests per ${config.rateLimit.windowMs / 1000} seconds`,
      rewrite: '5 requests per minute',
      analytics: '10 requests per 5 minutes',
      patterns: '3 reports per minute',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
