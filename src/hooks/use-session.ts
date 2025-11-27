'use client';

import { useAppStore } from '@/lib/app-store';
import { useMemo } from 'react';

export function useSessionUser() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const user = useMemo(() => {
    const base = users.find((u) => u.id === currentUserId) || null;
    if (!base) return null;
    // Hard enforce special roles for known accounts to avoid stale local storage state.
    if (base.email === 'yahyademeriah@gmail.com') {
      return { ...base, role: 'admin' as const };
    }
    if (base.email === 'aboude.murad@gmail.com') {
      return { ...base, role: 'store-owner' as const };
    }
    return base;
  }, [users, currentUserId]);
  return { user };
}

export function useLogin() {
  const login = useAppStore((s) => s.login);
  const signup = useAppStore((s) => s.signup);
  const logout = useAppStore((s) => s.logout);
  return { login, signup, logout };
}

export function useUsers() {
  const users = useAppStore((s) => s.users);
  const updateUserRole = useAppStore((s) => s.updateUserRole);
  const updateUserVerification = useAppStore((s) => s.updateUserVerification);
  const deleteUser = useAppStore((s) => s.deleteUser);
  return { data: users, users, loading: false, updateUserRole, updateUserVerification, deleteUser };
}
