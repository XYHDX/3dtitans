'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSessionUser } from '@/hooks/use-session';

export type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useAddresses() {
  const { user } = useSessionUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/addresses');
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: Partial<Address>) => {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save');
    }
    const data = await res.json();
    await refresh();
    return data.address as Address;
  }, [refresh]);

  const update = useCallback(async (id: string, patch: Partial<Address>) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    await refresh();
  }, [refresh]);

  const setDefault = useCallback((id: string) => update(id, { isDefault: true }), [update]);

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  return { addresses, loading, defaultAddress, refresh, create, update, remove, setDefault };
}
