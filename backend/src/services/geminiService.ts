import axios, { AxiosResponse } from 'axios';
import { config } from '../config/environment';
import { logger, loggers } from '../utils/logger';
import { GeminiRequest, GeminiResponse, RewriteResponse } from '../types';
import { PerformanceMonitor } from '../utils/logger';

/**
 * Google Gemini AI Service for message rewriting
 */
class GeminiService {
  private static instance: GeminiService;
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  private constructor() {
    this.apiKey = config.gemini.apiKey;
    this.baseURL = config.gemini.baseURL;
    this.model = config.gemini.model;
    this.maxTokens = config.gemini.maxTokens;
    this.temperature = config.gemini.temperature;
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Generate a comprehensive prompt for scam message analysis
   */
  private generatePrompt(message: string, region: string = 'US'): string {
    const regionContext = this.getRegionContext(region);
    
    return `You are a financial security expert specializing in scam detection and official bank communication standards. Analyze this suspicious message and rewrite it as a proper official bank communication.

Original message: "${message}"

Context: ${regionContext}

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
1. Identifying suspicious elements (links, urgency, pressure tactics, grammar errors)
2. Rewriting with professional bank communication standards
3. Highlighting key differences and red flags
4. Providing educational insights about scam detection
5. Using appropriate regional banking terminology and contact methods

Return only valid JSON, no additional text.`;
  }

  /**
   * Get region-specific context for better analysis
   */
  private getRegionContext(region: string): string {
    const contexts = {
      'US': 'US banking regulations, FDIC insurance, official bank websites (.com domains)',
      'UK': 'UK banking regulations, FCA oversight, official bank websites (.co.uk domains)',
      'CA': 'Canadian banking regulations, CDIC insurance, official bank websites (.ca domains)',
      'AU': 'Australian banking regulations, APRA oversight, official bank websites (.com.au domains)',
      'IN': 'Indian banking regulations, RBI oversight, UPI, official bank websites (.in domains)',
      'SG': 'Singapore banking regulations, MAS oversight, official bank websites (.sg domains)',
      'DE': 'German banking regulations, BaFin oversight, official bank websites (.de domains)',
      'FR': 'French banking regulations, ACPR oversight, official bank websites (.fr domains)',
      'ES': 'Spanish banking regulations, CNMV oversight, official bank websites (.es domains)',
      'IT': 'Italian banking regulations, Banca d\'Italia oversight, official bank websites (.it domains)',
      'JP': 'Japanese banking regulations, FSA oversight, official bank websites (.jp domains)',
      'KR': 'Korean banking regulations, FSC oversight, official bank websites (.kr domains)',
      'BR': 'Brazilian banking regulations, BCB oversight, official bank websites (.br domains)',
      'MX': 'Mexican banking regulations, CNBV oversight, official bank websites (.mx domains)',
    };

    return contexts[region as keyof typeof contexts] || contexts['US'];
  }

  /**
   * Call Gemini AI API
   */
  private async callGeminiAPI(prompt: string): Promise<GeminiResponse> {
    const requestId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const requestData: GeminiRequest = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
          topP: 0.8,
          topK: 10
        }
      };

      const response: AxiosResponse<GeminiResponse> = await axios.post(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const responseTime = Date.now() - startTime;
      loggers.gemini(requestId, prompt.length, responseTime, true);

      if (!response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }

      return response.data;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      loggers.gemini(requestId, prompt.length, responseTime, false);

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        switch (status) {
          case 400:
            throw new Error(`Invalid request to Gemini API: ${errorData.error?.message || 'Bad Request'}`);
          case 401:
            throw new Error('Invalid Gemini API key');
          case 403:
            throw new Error('Gemini API access forbidden');
          case 429:
            throw new Error('Gemini API rate limit exceeded. Please try again later.');
          case 500:
            throw new Error('Gemini API internal server error');
          default:
            throw new Error(`Gemini API error: ${status} - ${errorData.error?.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Gemini API');
      } else {
        throw new Error(`Gemini API error: ${error.message}`);
      }
    }
  }

  /**
   * Parse and validate Gemini response
   */
  private parseGeminiResponse(response: GeminiResponse): RewriteResponse['data'] {
    try {
      const content = response.candidates[0].content.parts[0].text;
      
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsedResponse.original_message || !parsedResponse.safe_version) {
        throw new Error('Missing required fields in Gemini response');
      }

      // Validate differences array
      if (!Array.isArray(parsedResponse.differences)) {
        throw new Error('Differences must be an array');
      }

      // Validate tone comparison
      if (!parsedResponse.tone_comparison || 
          !parsedResponse.tone_comparison.scam || 
          !parsedResponse.tone_comparison.official) {
        throw new Error('Invalid tone comparison in response');
      }

      // Ensure red_flags_fixed is a number
      if (typeof parsedResponse.red_flags_fixed !== 'number') {
        parsedResponse.red_flags_fixed = parsedResponse.differences.length;
      }

      return parsedResponse;
    } catch (error: any) {
      logger.error('Error parsing Gemini response:', error);
      throw new Error(`Failed to parse Gemini response: ${error.message}`);
    }
  }

  /**
   * Main method to rewrite a scam message
   */
  public async rewriteMessage(message: string, region: string = 'US'): Promise<RewriteResponse['data']> {
    return PerformanceMonitor.measureAsync('gemini_rewrite', async () => {
      try {
        // Validate input
        if (!message || typeof message !== 'string') {
          throw new Error('Message is required and must be a string');
        }

        if (message.length > config.api.maxMessageLength) {
          throw new Error(`Message too long. Maximum ${config.api.maxMessageLength} characters allowed.`);
        }

        if (message.trim().length === 0) {
          throw new Error('Message cannot be empty');
        }

        // Generate prompt
        const prompt = this.generatePrompt(message, region);
        
        // Call Gemini API
        const response = await this.callGeminiAPI(prompt);
        
        // Parse and validate response
        const parsedResponse = this.parseGeminiResponse(response);
        
        logger.info('Message successfully rewritten', {
          messageLength: message.length,
          region,
          redFlagsFixed: parsedResponse.red_flags_fixed,
        });

        return parsedResponse;
      } catch (error: any) {
        logger.error('Error rewriting message:', error);
        throw error;
      }
    });
  }

  /**
   * Test Gemini API connectivity
   */
  public async testConnection(): Promise<boolean> {
    try {
      const testPrompt = 'Test message: "Hello world"';
      const response = await this.callGeminiAPI(testPrompt);
      return !!response.candidates?.[0]?.content;
    } catch (error) {
      logger.error('Gemini API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  public getStats(): any {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      baseURL: this.baseURL,
    };
  }
}

export const geminiService = GeminiService.getInstance();
export default geminiService;
