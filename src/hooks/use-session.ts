'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export function useSessionUser() {
  const { data, status } = useSession();

  const user = useMemo(() => {
    const base = data?.user;
    if (!base) return null;
    return {
      id: base.id || '',
      uid: base.id || '',
      email: base.email || '',
      displayName: base.name || base.email || 'User',
      photoURL: base.image || null,
      role: (base.role as any) || 'user',
      isPrioritizedStore: (base as any).isPrioritizedStore || false,
      registrationDate: { toDate: () => new Date() },
      emailVerified: (base as any).emailVerified ? true : false,
    };
  }, [data]);

  return { user, status };
}

export function useLogin() {
  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      return { ok: false, message: 'Invalid credentials' };
    }

    return { ok: true };
  };

  const signup = async (params: { email: string; password: string; displayName?: string }) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        name: params.displayName,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, message: body?.error || 'Could not sign up' };
    }

    return login(params.email, params.password);
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  return { login, signup, logout };
}

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'user' | 'store-owner' | 'admin';
  registrationDate: { toDate: () => Date };
  emailVerified?: boolean;
  isPrioritizedStore?: boolean;
};

export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const mapUser = useCallback((user: any): AdminUser => {
    return {
      id: user.id,
      email: user.email || '',
      displayName: user.name || user.email || 'User',
      photoURL: user.image || null,
      role: (user.role as any) || 'user',
      registrationDate: { toDate: () => new Date(user.createdAt || Date.now()) },
      emailVerified: !!user.emailVerified,
      isPrioritizedStore: !!user.isPrioritizedStore,
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        console.error('Failed to load users', res.status);
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers((data.users || []).map((u: any) => mapUser(u)));
    } catch (error) {
      console.error('Failed to load users', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [mapUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateUserRole = async (userId: string, role: AdminUser['role']) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      console.error('Failed to update role');
      return false;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    return true;
  };

  const updateUserVerification = async (userId: string, verified: boolean) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailVerified: verified }),
    });
    if (!res.ok) {
      console.error('Failed to update verification');
      return false;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, emailVerified: verified } : u)));
    return true;
  };

  const updateUserPriority = async (userId: string, isPrioritizedStore: boolean) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrioritizedStore }),
    });
    if (!res.ok) {
      console.error('Failed to update store priority');
      let message = 'Could not update store priority.';
      try {
        const body = await res.json();
        message = body?.error || message;
      } catch {
        try {
          message = await res.text();
        } catch {
          // keep default
        }
      }
      return { ok: false, message };
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isPrioritizedStore } : u)));
    return { ok: true };
  };

  const deleteUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      console.error('Failed to delete user');
      return false;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return true;
  };

  return { data: users, users, loading, refresh, updateUserRole, updateUserVerification, updateUserPriority, deleteUser };
}
