import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Safe Communication Rewriter
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Analyze scam messages and learn how official bank communications should look
        </p>
        <Link
          href="/demo"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try the Demo
        </Link>
      </div>
    </div>
  );
}
