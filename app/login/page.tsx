'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ApiError, login, saveSession } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(username, password);
      await saveSession(res.token, res.user);
      toast.success('Login berhasil!');
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rbn-dark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rbn-primary text-xl font-black text-rbn-dark">
            RBN
          </div>
          <h1 className="text-2xl font-bold text-white">Boarding System</h1>
          <p className="mt-1 text-sm text-white/50">Roti Bakar Ngeunah</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4">
            <Label htmlFor="username" required>
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Masuk
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          © {new Date().getFullYear()} RBN Boarding System
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
