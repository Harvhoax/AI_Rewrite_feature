import app from './app';
import { config } from './config/environment';
import { database } from './config/database';
import { cacheService } from './services/cacheService';
import { geminiService } from './services/geminiService';
import { logger } from './utils/logger';

/**
 * Start the server and initialize services
 */
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await database.connect();
    await database.createIndexes();
    logger.info('MongoDB connected successfully');

    // Connect to Redis (optional)
    logger.info('Connecting to Redis...');
    await cacheService.connect();
    if (cacheService.getConnectionStatus()) {
      logger.info('Redis connected successfully');
    } else {
      logger.warn('Redis connection failed, continuing without cache');
    }

    // Test Gemini AI connection
    logger.info('Testing Gemini AI connection...');
    const geminiAvailable = await geminiService.testConnection();
    if (geminiAvailable) {
      logger.info('Gemini AI service is available');
    } else {
      logger.error('Gemini AI service is not available');
      process.exit(1);
    }

    // Start the server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.env}`);
      logger.info(`🔗 API Documentation: http://localhost:${config.port}/api/docs`);
      logger.info(`❤️  Health Check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        try {
          // Close database connection
          await database.disconnect();
          logger.info('Database disconnected');
          
          // Close cache connection
          await cacheService.disconnect();
          logger.info('Cache disconnected');
          
          logger.info('Server shut down complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
