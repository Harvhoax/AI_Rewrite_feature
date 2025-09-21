import mongoose from 'mongoose';
import { config } from './environment';
import { logger } from '../utils/logger';

/**
 * Database connection configuration and management
 */
class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB database
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info('Database already connected');
        return;
      }

      const options = {
        ...config.mongodb.options,
        dbName: 'safe_communication_rewriter',
      };

      await mongoose.connect(config.mongodb.uri, options);

      this.isConnected = true;
      logger.info('Successfully connected to MongoDB');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  public async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Create indexes for better performance
   */
  public async createIndexes(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // User indexes
      await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.db.collection('users').createIndex({ created_at: -1 });
      await mongoose.connection.db.collection('users').createIndex({ last_active: -1 });

      // RewriteHistory indexes
      await mongoose.connection.db.collection('rewritehistories').createIndex({ user_id: 1, created_at: -1 });
      await mongoose.connection.db.collection('rewritehistories').createIndex({ created_at: -1 });
      await mongoose.connection.db.collection('rewritehistories').createIndex({ region: 1 });
      await mongoose.connection.db.collection('rewritehistories').createIndex({ cached: 1 });

      // ScamPattern indexes
      await mongoose.connection.db.collection('scampatterns').createIndex({ pattern_hash: 1 }, { unique: true });
      await mongoose.connection.db.collection('scampatterns').createIndex({ category: 1 });
      await mongoose.connection.db.collection('scampatterns').createIndex({ frequency: -1 });
      await mongoose.connection.db.collection('scampatterns').createIndex({ created_at: -1 });
      await mongoose.connection.db.collection('scampatterns').createIndex({ is_active: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Backup database
   */
  public async backup(): Promise<string> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}`;
      
      // In a real implementation, you would use mongodump
      // For now, we'll just return a placeholder
      logger.info(`Database backup created: ${backupName}`);
      return backupName;
    } catch (error) {
      logger.error('Error creating database backup:', error);
      throw error;
    }
  }

  /**
   * Clean up old data
   */
  public async cleanup(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.backup.retentionDays);

      // Clean up old rewrite history
      const historyResult = await mongoose.connection.db
        .collection('rewritehistories')
        .deleteMany({ created_at: { $lt: cutoffDate } });

      // Clean up old scam patterns (keep only active ones)
      const patternResult = await mongoose.connection.db
        .collection('scampatterns')
        .deleteMany({ 
          is_active: false, 
          last_seen: { $lt: cutoffDate } 
        });

      logger.info(`Cleanup completed: ${historyResult.deletedCount} history records, ${patternResult.deletedCount} pattern records removed`);
    } catch (error) {
      logger.error('Error during database cleanup:', error);
      throw error;
    }
  }
}

export const database = Database.getInstance();
export default database;
