"use client";

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-gray-200 p-4">
          <WifiOff className="h-10 w-10 text-gray-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">You are offline</h1>
        <p className="max-w-md text-gray-500">
          It looks like you've lost your internet connection. The YardFlow Hitlist requires a
          connection to sync the latest Manifest 2026 data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          Go to Dashboard Cache
        </Link>
      </div>
    </div>
  );
}
