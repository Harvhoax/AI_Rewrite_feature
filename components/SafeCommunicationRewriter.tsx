'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSafeRewriter } from '@/hooks/useSafeRewriter';
import { copyToClipboard, getRiskLevelColor, getSeverityColor } from '@/lib/utils';
import { MessageComparison, MessageDifference, ToneAnalysis } from '@/lib/types/communication';

interface SafeCommunicationRewriterProps {
  initialMessage?: string;
  onMessageAnalyzed?: (comparison: MessageComparison) => void;
  className?: string;
}

export const SafeCommunicationRewriter: React.FC<SafeCommunicationRewriterProps> = ({
  initialMessage = '',
  onMessageAnalyzed,
  className = ''
}) => {
  const [scamMessage, setScamMessage] = useState(initialMessage);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const { isLoading, error, result, rewriteMessage, clearError, reset } = useSafeRewriter();

  // Copy to clipboard function
  const handleCopyToClipboard = async (text: string, type: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedMessage(type);
      setTimeout(() => setCopiedMessage(null), 2000);
    }
  };

  // Mock comparison data - in a real app, this would come from your AI service
  const comparisonData: MessageComparison = useMemo(() => ({
    scamMessage: {
      id: '1',
      content: scamMessage,
      timestamp: new Date(),
      source: 'sms'
    },
    officialMessage: {
      id: '2',
      content: "Dear Customer, we noticed an issue with your recent UPI transaction of ₹XXXX. Please check your transaction status in the official bank app. For assistance, call our customer care at 1800-XXX-XXXX between 9 AM - 3 PM IST.",
      bankName: 'Official Bank Communication',
      timestamp: new Date(),
      referenceNumber: 'REF-2024-001'
    },
    differences: [
      {
        type: 'url',
        description: 'Suspicious link in scam message',
        scamExample: 'http://refund-upi.com',
        officialExample: 'Official bank app or website',
        severity: 'high'
      },
      {
        type: 'urgency',
        description: 'Excessive urgency and pressure',
        scamExample: 'immediately',
        officialExample: 'Please check when convenient',
        severity: 'high'
      },
      {
        type: 'contact',
        description: 'No official contact information',
        scamExample: 'Click here to get refund',
        officialExample: 'Call customer care at 1800-XXX-XXXX',
        severity: 'medium'
      },
      {
        type: 'format',
        description: 'Unprofessional formatting',
        scamExample: 'Your UPI payment failed!',
        officialExample: 'Dear Customer, we noticed an issue...',
        severity: 'medium'
      }
    ],
    toneAnalysis: {
      scamTone: {
        urgency: 9,
        pressure: 8,
        fear: 7,
        authority: 3
      },
      officialTone: {
        professional: 9,
        reassuring: 8,
        informative: 9,
        helpful: 8
      },
      overallRisk: 'high'
    },
    keyLearnings: [
      'Official banks never send links in SMS messages',
      'Legitimate communications include proper verification methods',
      'Real bank messages use professional language and formatting',
      'Always verify through official channels before taking action'
    ],
    riskLevel: 'high'
  }), [scamMessage]);

  const handleAnalyze = async () => {
    if (!scamMessage.trim()) {
      return;
    }
    
    try {
      await rewriteMessage(scamMessage);
      onMessageAnalyzed?.(comparisonData);
    } catch (err) {
      console.error('Failed to analyze message:', err);
    }
  };

  const renderToneMeter = (label: string, value: number, max: number = 10) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderDifferenceRow = (difference: MessageDifference) => (
    <tr key={difference.type} className="border-b border-gray-100">
      <td className="py-3 px-4">
        <Badge variant={difference.severity === 'high' ? 'destructive' : difference.severity === 'medium' ? 'warning' : 'default'}>
          {difference.type.toUpperCase()}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-gray-700">{difference.description}</td>
      <td className="py-3 px-4">
        <div className="bg-red-50 p-2 rounded text-sm font-mono text-red-800">
          {difference.scamExample}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="bg-green-50 p-2 rounded text-sm font-mono text-green-800">
          {difference.officialExample}
        </div>
      </td>
    </tr>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Safe Communication Rewriter
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Analyze scam messages and learn how official bank communications should look. 
            Protect yourself with AI-powered security analysis.
          </p>
        </div>

        {/* Input Section */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enter Scam Message</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Paste the suspicious message you received to analyze it against official bank communication standards
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <textarea
                  value={scamMessage}
                  onChange={(e) => setScamMessage(e.target.value)}
                  placeholder="Paste the suspicious message here..."
                  className="w-full h-32 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={isLoading}
                  aria-label="Suspicious message input"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={!scamMessage.trim() || isLoading}
                  className="flex-1 h-12 text-lg font-semibold"
                >
                  {isLoading ? 'Analyzing with AI...' : 'Analyze Message'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setScamMessage('');
                    reset();
                  }}
                  disabled={isLoading}
                  className="h-12 px-6"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Analyzing Message with AI</h3>
                <p className="text-gray-600 dark:text-gray-300">This may take a few moments...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="backdrop-blur-sm bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Analysis Error</h3>
                  <p className="text-red-700 dark:text-red-300 mt-1">{error.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearError}
                    className="mt-4"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-8">
            {/* AI Rewritten Message */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  AI Rewritten Safe Message
                </CardTitle>
                <CardDescription>
                  This is how the message should look if it were legitimate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-mono text-sm whitespace-pre-wrap">
                    {result.rewrittenMessage}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopyToClipboard(result.rewrittenMessage, 'rewritten')}
                    className="flex-1"
                  >
                    {copiedMessage === 'rewritten' ? '✓ Copied!' : 'Copy Rewritten Message'}
                  </Button>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">AI Explanation:</h4>
                  <p className="text-sm text-gray-700">{result.explanation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Safety Features */}
            <Card>
              <CardHeader>
                <CardTitle>Safety Features in Rewritten Message</CardTitle>
                <CardDescription>
                  Security measures implemented in the AI-rewritten version
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.safetyFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="text-green-800 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Verification Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Steps</CardTitle>
                <CardDescription>
                  Always follow these steps when you receive suspicious messages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {result.verificationSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
};

export default SafeCommunicationRewriter;
