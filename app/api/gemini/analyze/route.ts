import { NextRequest, NextResponse } from 'next/server';
import { getGeminiService } from '../../../lib/services/geminiService';
import { GeminiError } from '../../../lib/types/ai';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters allowed.' },
        { status: 400 }
      );
    }

    const geminiService = getGeminiService();
    const result = await geminiService.analyzeMessage(message);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof GeminiError) {
      const statusCode = error.code === 'RATE_LIMIT' ? 429 :
                        error.code === 'INVALID_KEY' ? 401 :
                        error.code === 'QUOTA_EXCEEDED' ? 429 :
                        500;

      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details,
          retryAfter: error.retryAfter
        },
        { 
          status: statusCode,
          headers: error.retryAfter ? {
            'Retry-After': error.retryAfter.toString()
          } : undefined
        }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Gemini Analysis API',
      version: '1.0.0',
      endpoints: {
        POST: '/api/gemini/analyze - Analyze a message for scam detection'
      }
    }
  );
}
