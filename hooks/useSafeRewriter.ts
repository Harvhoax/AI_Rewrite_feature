import React, { useState, useCallback } from 'react';
import { SafeRewriterResponse, SafeRewriterError, UseSafeRewriterReturn } from '../lib/types/communication';
import { getGeminiService } from '../lib/services/geminiService';
import { GeminiError } from '../lib/types/ai';

// Convert Gemini response to SafeRewriterResponse format
const convertGeminiResponse = (geminiResponse: any): SafeRewriterResponse => {
  return {
    rewrittenMessage: geminiResponse.safe_version,
    explanation: `This message has been analyzed and rewritten to follow official bank communication standards. ${geminiResponse.key_learning}`,
    safetyFeatures: [
      `Fixed ${geminiResponse.red_flags_fixed} red flags`,
      "Professional tone and language",
      "No suspicious links or URLs",
      "Official verification methods",
      "Clear security guidelines"
    ],
    verificationSteps: [
      "Use official banking app or website",
      "Contact customer care through official channels",
      "Never share sensitive information via SMS/email",
      "Verify sender authenticity before taking action"
    ],
    differences: geminiResponse.differences || [],
    toneComparison: geminiResponse.tone_comparison || { scam: '', official: '' }
  };
};

// Call Gemini AI service
const callGeminiAI = async (scamMessage: string): Promise<SafeRewriterResponse> => {
  try {
    const geminiService = getGeminiService();
    const response = await geminiService.analyzeMessage(scamMessage);
    return convertGeminiResponse(response);
  } catch (error) {
    if (error instanceof GeminiError) {
      // Convert Gemini errors to SafeRewriterError
      const safeRewriterError = new SafeRewriterError({
        message: error.message,
        code: error.code === 'RATE_LIMIT' ? 'API_ERROR' : 
              error.code === 'INVALID_KEY' ? 'API_ERROR' :
              error.code === 'QUOTA_EXCEEDED' ? 'API_ERROR' :
              error.code === 'NETWORK_ERROR' ? 'NETWORK_ERROR' :
              'API_ERROR',
        details: error.details
      });
      throw safeRewriterError;
    }
    
    throw new SafeRewriterError({
      message: 'Failed to process message with AI service',
      code: 'API_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const useSafeRewriter = (): UseSafeRewriterReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SafeRewriterError | null>(null);
  const [result, setResult] = useState<SafeRewriterResponse | null>(null);

  const rewriteMessage = useCallback(async (scamMessage: string) => {
    if (!scamMessage.trim()) {
      setError(new SafeRewriterError({
        message: 'Please enter a message to analyze',
        code: 'VALIDATION_ERROR'
      }));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await callGeminiAI(scamMessage);
      setResult(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(new SafeRewriterError({
        message: errorMessage,
        code: 'API_ERROR',
        details: err instanceof Error ? err.stack : undefined
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    result,
    rewriteMessage,
    clearError,
    reset
  };
};
