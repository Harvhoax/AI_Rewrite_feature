import Redis from 'redis';
import { config } from '../config/environment';
import { logger, loggers } from '../utils/logger';
import { CacheEntry } from '../types';

/**
 * Redis Cache Service for performance optimization
 */
class CacheService {
  private static instance: CacheService;
  private client: Redis.RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        return;
      }

      if (!config.redis.url) {
        logger.warn('Redis URL not provided, cache will be disabled');
        return;
      }

      this.client = Redis.createClient({
        url: config.redis.url,
        ...config.redis.options,
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('Successfully connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      // Don't throw error, allow app to continue without cache
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Disconnected from Redis');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Generate cache key
   */
  private generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Get data from cache
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const startTime = Date.now();
      const cachedData = await this.client.get(key);
      const duration = Date.now() - startTime;

      if (cachedData) {
        const parsedData: CacheEntry<T> = JSON.parse(cachedData);
        
        // Check if data is expired
        if (Date.now() - parsedData.timestamp > parsedData.ttl * 1000) {
          await this.delete(key);
          loggers.cache('miss', key);
          return null;
        }

        loggers.cache('hit', key);
        return parsedData.data;
      }

      loggers.cache('miss', key);
      return null;
    } catch (error) {
      logger.error('Error getting data from cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  public async set<T>(key: string, data: T, ttl: number = config.cache.ttl): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
      loggers.cache('set', key, ttl);
      return true;
    } catch (error) {
      logger.error('Error setting data in cache:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      loggers.cache('delete', key);
      return result > 0;
    } catch (error) {
      logger.error('Error deleting data from cache:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache key existence:', error);
      return false;
    }
  }

  /**
   * Get multiple keys from cache
   */
  public async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || !this.client || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map((value, index) => {
        if (!value) {
          loggers.cache('miss', keys[index]);
          return null;
        }

        try {
          const parsedData: CacheEntry<T> = JSON.parse(value);
          
          // Check if data is expired
          if (Date.now() - parsedData.timestamp > parsedData.ttl * 1000) {
            this.delete(keys[index]);
            loggers.cache('miss', keys[index]);
            return null;
          }

          loggers.cache('hit', keys[index]);
          return parsedData.data;
        } catch {
          loggers.cache('miss', keys[index]);
          return null;
        }
      });
    } catch (error) {
      logger.error('Error getting multiple keys from cache:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys in cache
   */
  public async mset<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<boolean> {
    if (!this.isConnected || !this.client || entries.length === 0) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      for (const entry of entries) {
        const cacheEntry: CacheEntry<T> = {
          data: entry.data,
          timestamp: Date.now(),
          ttl: entry.ttl || config.cache.ttl,
        };
        
        pipeline.setEx(entry.key, cacheEntry.ttl, JSON.stringify(cacheEntry));
      }

      await pipeline.exec();
      
      entries.forEach(entry => {
        loggers.cache('set', entry.key, entry.ttl || config.cache.ttl);
      });
      
      return true;
    } catch (error) {
      logger.error('Error setting multiple keys in cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<any> {
    if (!this.isConnected || !this.client) {
      return {
        connected: false,
        memory: null,
        keys: 0,
      };
    }

    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();
      
      return {
        connected: true,
        memory: info,
        keys: dbSize,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        connected: false,
        memory: null,
        keys: 0,
        error: error.message,
      };
    }
  }

  /**
   * Clear all cache data
   */
  public async clear(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get cache key for rewrite request
   */
  public getRewriteKey(message: string, region: string): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${message}:${region}`)
      .digest('hex');
    return this.generateKey('rewrite', hash);
  }

  /**
   * Get cache key for user stats
   */
  public getUserStatsKey(userId: string): string {
    return this.generateKey('user_stats', userId);
  }

  /**
   * Get cache key for analytics
   */
  public getAnalyticsKey(period: string): string {
    return this.generateKey('analytics', period);
  }
}

export const cacheService = CacheService.getInstance();
export default cacheService;
