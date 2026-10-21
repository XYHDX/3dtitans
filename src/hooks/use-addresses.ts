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

/**
 * Thrown by create/update. `field` names the invalid field when the server
 * rejected the input (400), so the page can show a translated message instead
 * of raw server text.
 */
export class AddressSaveError extends Error {
  constructor(public status: number, public field?: string) {
    super(field ? `${field} is invalid` : `Address request failed (${status})`);
    this.name = 'AddressSaveError';
  }
}

async function toSaveError(res: Response): Promise<AddressSaveError> {
  const body = await res.json().catch(() => ({}));
  if (body?.error) console.warn('Address save failed:', res.status, body.error);
  return new AddressSaveError(res.status, typeof body?.field === 'string' ? body.field : undefined);
}

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
    if (!res.ok) throw await toSaveError(res);
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
    if (!res.ok) throw await toSaveError(res);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new AddressSaveError(res.status);
    await refresh();
  }, [refresh]);

  const setDefault = useCallback((id: string) => update(id, { isDefault: true }), [update]);

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  return { addresses, loading, defaultAddress, refresh, create, update, remove, setDefault };
}
