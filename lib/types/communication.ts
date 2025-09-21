export interface ScamMessage {
  id: string;
  content: string;
  timestamp: Date;
  source: 'sms' | 'email' | 'whatsapp' | 'call' | 'other';
  sender?: string;
}

export interface OfficialMessage {
  id: string;
  content: string;
  bankName: string;
  timestamp: Date;
  referenceNumber?: string;
}

export interface MessageComparison {
  scamMessage: ScamMessage;
  officialMessage: OfficialMessage;
  differences: MessageDifference[];
  toneAnalysis: ToneAnalysis;
  keyLearnings: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface MessageDifference {
  type: 'url' | 'urgency' | 'contact' | 'format' | 'language' | 'verification';
  description: string;
  scamExample: string;
  officialExample: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ToneAnalysis {
  scamTone: {
    urgency: number; // 1-10
    pressure: number; // 1-10
    fear: number; // 1-10
    authority: number; // 1-10
  };
  officialTone: {
    professional: number; // 1-10
    reassuring: number; // 1-10
    informative: number; // 1-10
    helpful: number; // 1-10
  };
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface SafeRewriterResponse {
  rewrittenMessage: string;
  explanation: string;
  safetyFeatures: string[];
  verificationSteps: string[];
  differences?: Array<{
    aspect: string;
    scam: string;
    official: string;
    status: string;
  }>;
  toneComparison?: {
    scam: string;
    official: string;
  };
}

export class SafeRewriterError extends Error {
  public code: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN';
  public details?: string;

  constructor({ message, code, details }: {
    message: string;
    code: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN';
    details?: string;
  }) {
    super(message);
    this.name = 'SafeRewriterError';
    this.code = code;
    this.details = details;
  }
}

export interface UseSafeRewriterReturn {
  isLoading: boolean;
  error: SafeRewriterError | null;
  result: SafeRewriterResponse | null;
  rewriteMessage: (scamMessage: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}
