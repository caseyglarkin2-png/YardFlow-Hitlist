'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">
                Critical Application Error
              </CardTitle>
              <CardDescription>
                A critical error has occurred in the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800 font-mono break-words">
                  {error.message || 'An unexpected critical error occurred'}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={reset} variant="default">
                Try again
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
              >
                Go home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  );
}
