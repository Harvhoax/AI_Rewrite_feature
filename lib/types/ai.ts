export interface GeminiDifference {
  aspect: string;
  scam: string;
  official: string;
  status: string;
}

export interface GeminiToneComparison {
  scam: string;
  official: string;
}

export interface GeminiResponse {
  original_message: string;
  safe_version: string;
  differences: GeminiDifference[];
  red_flags_fixed: number;
  tone_comparison: GeminiToneComparison;
  key_learning: string;
}

export class GeminiError extends Error {
  public code: 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'PARSE_ERROR';
  public details?: string;
  public retryAfter?: number;

  constructor({ message, code, details, retryAfter }: {
    message: string;
    code: 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'PARSE_ERROR';
    details?: string;
    retryAfter?: number;
  }) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }
}

export interface GeminiServiceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheEnabled?: boolean;
  rateLimitEnabled?: boolean;
  maxRequestsPerMinute?: number;
}

export interface CachedResponse {
  data: GeminiResponse;
  timestamp: number;
  messageHash: string;
}

export interface RateLimitInfo {
  requests: number;
  resetTime: number;
  isLimited: boolean;
}
