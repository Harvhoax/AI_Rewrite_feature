import { 
  GeminiResponse, 
  GeminiError, 
  GeminiServiceConfig, 
  CachedResponse, 
  RateLimitInfo 
} from '../types/ai';

class GeminiService {
  private config: GeminiServiceConfig;
  private cache: Map<string, CachedResponse> = new Map();
  private rateLimitInfo: RateLimitInfo = {
    requests: 0,
    resetTime: Date.now() + 60000, // 1 minute
    isLimited: false
  };

  constructor(config: GeminiServiceConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      maxTokens: 2048,
      temperature: 0.7,
      cacheEnabled: true,
      rateLimitEnabled: true,
      maxRequestsPerMinute: 10,
      ...config
    };
  }

  private generateMessageHash(message: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private isCacheValid(cached: CachedResponse): boolean {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cached.timestamp < CACHE_DURATION;
  }

  private checkRateLimit(): boolean {
    if (!this.config.rateLimitEnabled) return true;

    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now > this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.requests = 0;
      this.rateLimitInfo.resetTime = now + 60000;
      this.rateLimitInfo.isLimited = false;
    }

    if (this.rateLimitInfo.requests >= (this.config.maxRequestsPerMinute || 10)) {
      this.rateLimitInfo.isLimited = true;
      return false;
    }

    return true;
  }

  private incrementRateLimit(): void {
    this.rateLimitInfo.requests++;
  }

  private async makeAPICall(message: string): Promise<GeminiResponse> {
    const prompt = `You are a financial security expert. Analyze this suspicious message and rewrite it as a proper official bank communication.

Original message: "${message}"

Please analyze the message and return a JSON response with the following exact structure:
{
  "original_message": "string",
  "safe_version": "string",
  "differences": [
    {
      "aspect": "Links",
      "scam": "Contains suspicious link",
      "official": "No external links",
      "status": "✅ Fixed"
    }
  ],
  "red_flags_fixed": 4,
  "tone_comparison": {
    "scam": "Urgent, Fearful, Demanding",
    "official": "Professional, Calm, Helpful"
  },
  "key_learning": "string"
}

Focus on:
1. Identifying suspicious elements (links, urgency, pressure tactics)
2. Rewriting with professional bank communication standards
3. Highlighting key differences and red flags
4. Providing educational insights about scam detection

Return only valid JSON, no additional text.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: 0.8,
          topK: 10
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new GeminiError({
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT',
          retryAfter
        });
      }
      
      if (response.status === 400) {
        throw new GeminiError({
          message: 'Invalid API key or request format.',
          code: 'INVALID_KEY',
          details: errorData.error?.message
        });
      }
      
      if (response.status === 429) {
        throw new GeminiError({
          message: 'API quota exceeded. Please check your usage limits.',
          code: 'QUOTA_EXCEEDED',
          details: errorData.error?.message
        });
      }

      throw new GeminiError({
        message: `API request failed with status ${response.status}`,
        code: 'API_ERROR',
        details: errorData.error?.message || response.statusText
      });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new GeminiError({
        message: 'Invalid response format from Gemini API',
        code: 'API_ERROR',
        details: 'No content in API response'
      });
    }

    const content = data.candidates[0].content.parts[0].text;
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]) as GeminiResponse;
      
      // Validate required fields
      if (!parsedResponse.original_message || !parsedResponse.safe_version) {
        throw new Error('Missing required fields in response');
      }
      
      return parsedResponse;
    } catch (parseError) {
      throw new GeminiError({
        message: 'Failed to parse AI response',
        code: 'PARSE_ERROR',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      });
    }
  }

  async analyzeMessage(message: string): Promise<GeminiResponse> {
    if (!message.trim()) {
      throw new GeminiError({
        message: 'Message cannot be empty',
        code: 'API_ERROR'
      });
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      const retryAfter = Math.ceil((this.rateLimitInfo.resetTime - Date.now()) / 1000);
      throw new GeminiError({
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        code: 'RATE_LIMIT',
        retryAfter
      });
    }

    // Check cache
    if (this.config.cacheEnabled) {
      const messageHash = this.generateMessageHash(message);
      const cached = this.cache.get(messageHash);
      
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    try {
      // Make API call
      const result = await this.makeAPICall(message);
      
      // Update rate limit
      this.incrementRateLimit();
      
      // Cache result
      if (this.config.cacheEnabled) {
        const messageHash = this.generateMessageHash(message);
        this.cache.set(messageHash, {
          data: result,
          timestamp: Date.now(),
          messageHash
        });
      }
      
      return result;
    } catch (error) {
      if (error instanceof GeminiError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new GeminiError({
          message: 'Network error. Please check your internet connection.',
          code: 'NETWORK_ERROR',
          details: error.message
        });
      }
      
      throw new GeminiError({
        message: 'An unexpected error occurred',
        code: 'API_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  updateConfig(newConfig: Partial<GeminiServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
let geminiServiceInstance: GeminiService | null = null;

export const getGeminiService = (): GeminiService => {
  if (!geminiServiceInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY environment variable is required');
    }
    
    geminiServiceInstance = new GeminiService({
      apiKey,
      cacheEnabled: true,
      rateLimitEnabled: true,
      maxRequestsPerMinute: 10
    });
  }
  
  return geminiServiceInstance;
};

export default GeminiService;
