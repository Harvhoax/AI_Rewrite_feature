import { Request } from 'express';

// API Request/Response Types
export interface RewriteRequest {
  message: string;
  region?: string;
  userId?: string;
}

export interface RewriteResponse {
  success: boolean;
  data?: {
    original_message: string;
    safe_version: string;
    differences: Array<{
      aspect: string;
      scam: string;
      official: string;
      status: string;
    }>;
    red_flags_fixed: number;
    tone_comparison: {
      scam: string;
      official: string;
    };
    key_learning: string;
  };
  cached?: boolean;
  error?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    gemini: 'available' | 'unavailable';
  };
}

export interface StatsResponse {
  total_rewrites: number;
  unique_users: number;
  cache_hit_rate: number;
  average_response_time: number;
  top_regions: Array<{
    region: string;
    count: number;
  }>;
  recent_patterns: Array<{
    pattern: string;
    frequency: number;
  }>;
}

// Database Models
export interface IUser {
  _id: string;
  email: string;
  usage_count: number;
  created_at: Date;
  last_active: Date;
  is_active: boolean;
  preferences?: {
    region: string;
    language: string;
  };
}

export interface IRewriteHistory {
  _id: string;
  user_id?: string;
  original_message: string;
  safe_version: string;
  region: string;
  created_at: Date;
  response_time: number;
  cached: boolean;
  red_flags_fixed: number;
  differences: Array<{
    aspect: string;
    scam: string;
    official: string;
    status: string;
  }>;
}

export interface IScamPattern {
  _id: string;
  pattern_hash: string;
  category: string;
  frequency: number;
  created_at: Date;
  last_seen: Date;
  examples: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
}

// Gemini AI Types
export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// JWT Types
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Request with User
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Analytics
export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  region?: string;
  userId?: string;
}

export interface AnalyticsResponse {
  totalRewrites: number;
  uniqueUsers: number;
  averageResponseTime: number;
  cacheHitRate: number;
  topRegions: Array<{
    region: string;
    count: number;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
  patternTrends: Array<{
    pattern: string;
    frequency: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}
