'use client';

import SafeCommunicationRewriter from '@/components/SafeCommunicationRewriter';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function DemoPage() {
  const [selectedExample, setSelectedExample] = useState(0);
  
  const exampleMessages = [
    {
      id: 1,
      title: "UPI Payment Scam",
      message: "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
      risk: "High",
      type: "SMS"
    },
    {
      id: 2,
      title: "Bank Account Suspension",
      message: "URGENT: Your account will be suspended in 24 hours. Verify now: https://bank-verify-now.com",
      risk: "High",
      type: "Email"
    },
    {
      id: 3,
      title: "Credit Card Fraud Alert",
      message: "Suspicious activity detected! Call 1800-XXX-XXXX immediately or your card will be blocked!",
      risk: "Medium",
      type: "SMS"
    },
    {
      id: 4,
      title: "Loan Approval Scam",
      message: "Congratulations! Your loan is approved. Click here to claim: http://instant-loan-approval.com",
      risk: "High",
      type: "WhatsApp"
    }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Demo: Scam Message Analyzer
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Try analyzing real-world scam examples and see how our AI protects you
                </p>
              </div>
              <Badge variant="secondary" className="px-4 py-2">
                🛡️ Live Demo
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Example Messages */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Try These Real Scam Examples
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {exampleMessages.map((example, index) => (
                <Card 
                  key={example.id}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    selectedExample === index 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedExample(index)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                        {example.title}
                      </CardTitle>
                      <Badge 
                        variant={example.risk === 'High' ? 'destructive' : 'warning'}
                        className="text-xs"
                      >
                        {example.risk}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {example.type}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {example.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Main Analyzer */}
          <SafeCommunicationRewriter 
            initialMessage={exampleMessages[selectedExample].message}
            onMessageAnalyzed={(comparison) => {
              console.log('Message analyzed:', comparison);
            }}
          />

          {/* Tips Section */}
          <div className="mt-12">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <span className="text-2xl">💡</span>
                  Pro Tips for Spotting Scams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Red Flags to Watch For:</h4>
                    <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        Suspicious links or shortened URLs
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        Urgent language and pressure tactics
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        Requests for personal information
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">❌</span>
                        Poor grammar and unprofessional tone
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-200">What Legitimate Messages Look Like:</h4>
                    <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        Professional language and formatting
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        Official contact information provided
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        No pressure to act immediately
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        Clear verification methods
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
