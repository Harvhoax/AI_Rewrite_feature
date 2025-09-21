import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .default(3001),
  
  MONGODB_URI: Joi.string()
    .required()
    .description('MongoDB connection string'),
  
  REDIS_URL: Joi.string()
    .optional()
    .description('Redis connection string'),
  
  GEMINI_API_KEY: Joi.string()
    .required()
    .description('Google Gemini API key'),
  
  JWT_SECRET: Joi.string()
    .required()
    .min(32)
    .description('JWT secret key'),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('24h')
    .description('JWT expiration time'),
  
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(60000)
    .description('Rate limit window in milliseconds'),
  
  RATE_LIMIT_MAX: Joi.number()
    .default(10)
    .description('Maximum requests per window'),
  
  CACHE_TTL: Joi.number()
    .default(300)
    .description('Cache TTL in seconds'),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  CORS_ORIGIN: Joi.string()
    .default('*')
    .description('CORS origin'),
  
  API_VERSION: Joi.string()
    .default('v1')
    .description('API version'),
  
  MAX_MESSAGE_LENGTH: Joi.number()
    .default(1000)
    .description('Maximum message length'),
  
  GEMINI_MODEL: Joi.string()
    .default('gemini-1.5-flash')
    .description('Gemini model to use'),
  
  GEMINI_MAX_TOKENS: Joi.number()
    .default(2048)
    .description('Maximum tokens for Gemini'),
  
  GEMINI_TEMPERATURE: Joi.number()
    .min(0)
    .max(1)
    .default(0.7)
    .description('Gemini temperature'),
  
  BACKUP_RETENTION_DAYS: Joi.number()
    .default(30)
    .description('Backup retention in days'),
  
  MONITORING_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable monitoring'),
  
  SECURITY_HEADERS: Joi.boolean()
    .default(true)
    .description('Enable security headers'),
  
  COMPRESSION_ENABLED: Joi.boolean()
    .default(true)
    .description('Enable compression'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export configuration
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongodb: {
    uri: envVars.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  redis: {
    url: envVars.REDIS_URL,
    options: {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    },
  },
  gemini: {
    apiKey: envVars.GEMINI_API_KEY,
    model: envVars.GEMINI_MODEL,
    maxTokens: envVars.GEMINI_MAX_TOKENS,
    temperature: envVars.GEMINI_TEMPERATURE,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX,
  },
  cache: {
    ttl: envVars.CACHE_TTL,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
  cors: {
    origin: envVars.CORS_ORIGIN === '*' ? true : envVars.CORS_ORIGIN.split(','),
    credentials: true,
  },
  api: {
    version: envVars.API_VERSION,
    maxMessageLength: envVars.MAX_MESSAGE_LENGTH,
  },
  backup: {
    retentionDays: envVars.BACKUP_RETENTION_DAYS,
  },
  features: {
    monitoring: envVars.MONITORING_ENABLED,
    securityHeaders: envVars.SECURITY_HEADERS,
    compression: envVars.COMPRESSION_ENABLED,
  },
} as const;

// Type for configuration
export type Config = typeof config;

// Helper functions
export const isDevelopment = () => config.env === 'development';
export const isProduction = () => config.env === 'production';
export const isTest = () => config.env === 'test';

// Database connection string validation
export const validateDatabaseConnection = (uri: string): boolean => {
  try {
    new URL(uri);
    return uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  } catch {
    return false;
  }
};

// Redis connection string validation
export const validateRedisConnection = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('redis://') || url.startsWith('rediss://');
  } catch {
    return false;
  }
};
