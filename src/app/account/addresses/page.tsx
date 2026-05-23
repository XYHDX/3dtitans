'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useAddresses, type Address } from '@/hooks/use-addresses';
import { cn } from '@/lib/utils';

const EMPTY: Partial<Address> = {
  label: '', name: '', line1: '', line2: '', city: '',
  postalCode: '', country: '', phone: '', isDefault: false,
};

export default function AddressesPage() {
  const { user } = useSessionUser();
  const { addresses, loading, create, update, remove, setDefault } = useAddresses();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Address>>(EMPTY);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setForm({ ...EMPTY, isDefault: addresses.length === 0 });
    setEditingId(null);
    setOpen(true);
  }
  function startEdit(a: Address) {
    setForm({ ...a });
    setEditingId(a.id);
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await update(editingId, form);
        toast({ title: 'Address updated' });
      } else {
        await create(form);
        toast({ title: 'Address saved' });
      }
      setOpen(false);
      setForm(EMPTY);
      setEditingId(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: err.message });
    } finally {
      setSaving(false);
    }
  }
  async function onRemove(id: string) {
    if (!confirm('Delete this address?')) return;
    try {
      await remove(id);
      toast({ title: 'Address deleted' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not delete', description: err.message });
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-foreground/40" />
          <p className="mb-4 text-sm">Sign in to manage saved addresses.</p>
          <Button asChild><Link href="/login">Sign in</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="font-headline text-xs px-3 py-2 bg-foreground text-background">AD</span>
          <div>
            <h1 className="font-headline text-3xl md:text-4xl">Saved Addresses</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Speed up checkout — pick a default and we'll pre-fill it for you.
            </p>
          </div>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add address
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : addresses.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <article
              key={a.id}
              className={cn(
                'border-[3px] border-foreground bg-card text-card-foreground p-5',
                a.isDefault
                  ? 'shadow-[6px_6px_0_0_hsl(var(--accent))]'
                  : 'shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))]'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {a.label && <Badge variant="default">{a.label}</Badge>}
                  {a.isDefault && <Badge variant="featured">DEFAULT</Badge>}
                </div>
              </div>
              <div className="text-sm space-y-1 mb-4">
                <p className="font-bold">{a.name}</p>
                <p>{a.line1}</p>
                {a.line2 && <p>{a.line2}</p>}
                <p>{a.city}, {a.postalCode}</p>
                <p>{a.country}</p>
                {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(a)}>Edit</Button>
                {!a.isDefault && (
                  <Button size="sm" variant="outline" onClick={() => setDefault(a.id).catch(() => {})}>
                    <Star className="h-3 w-3 mr-1" /> Set default
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onRemove(a.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-foreground/40" />
          <p className="mb-4 text-sm">No saved addresses yet.</p>
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> Add your first address</Button>
        </div>
      )}

      {/* Inline add/edit form */}
      {open && (
        <form
          onSubmit={save}
          className="mt-10 border-[3px] border-foreground bg-card text-card-foreground p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))]"
        >
          <h2 className="font-headline text-xl mb-5">{editingId ? 'Edit address' : 'New address'}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Label (Home, Office)" value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} aria-label="Label" />
            <Input placeholder="Full name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required aria-label="Full name" />
            <Input placeholder="Address line 1 *" value={form.line1 || ''} onChange={(e) => setForm({ ...form, line1: e.target.value })} required className="sm:col-span-2" aria-label="Address line 1" />
            <Input placeholder="Address line 2 (optional)" value={form.line2 || ''} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="sm:col-span-2" aria-label="Address line 2" />
            <Input placeholder="City *" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} required aria-label="City" />
            <Input placeholder="Postal code *" value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required aria-label="Postal code" />
            <Input placeholder="Country *" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} required aria-label="Country" />
            <Input placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label="Phone" />
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            <span>Use as my default address</span>
          </label>
          <div className="flex gap-3 mt-5">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}</Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingId(null); setForm(EMPTY); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}
