'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Link from 'next/link';

export default function ClientLoginPage() {
  const router = useRouter();

  // Redirect to main signin page immediately
  React.useEffect(() => {
    router.push('/auth/signin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Client Login Moved
            </CardTitle>
            <CardDescription>
              Client login has been integrated with the main login system
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Client login has been integrated with the main login system.
                You will be redirected automatically.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                If you are not redirected automatically, click the button below:
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/signin">Go to Login</Link>
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Login Credentials:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Email: Any client email from the database</p>
                <p>Password: Password001, Password002, etc.</p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your dietitian
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


