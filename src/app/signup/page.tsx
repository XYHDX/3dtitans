'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useLogin } from '@/hooks/use-session';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { signup } = useLogin();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasMinLength || !hasLetter || !hasNumber) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 8 characters and include a letter and a number.',
      });
      return;
    }
    setLoading(true);

    try {
      const result = await signup({
        email,
        password,
        displayName,
      });
      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: 'Sign Up Failed',
          description: result.message || 'An unknown error occurred.',
        });
      } else {
        toast({
          title: 'Account Created!',
          description: 'Welcome to 3D Titans.',
        });
        router.push('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join the 3D Titans community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form onSubmit={handleSignUp} className="grid gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                      id="display-name"
                      type="text"
                      placeholder="Your Name"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
