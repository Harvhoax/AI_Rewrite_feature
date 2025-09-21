'use client';

import SafeCommunicationRewriter from '@/components/SafeCommunicationRewriter';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DemoPage() {
  const exampleScamMessage = "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SafeCommunicationRewriter 
            initialMessage={exampleScamMessage}
            onMessageAnalyzed={(comparison) => {
              console.log('Message analyzed:', comparison);
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
