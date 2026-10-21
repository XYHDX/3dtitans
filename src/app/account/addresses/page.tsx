'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { AddressSaveError, useAddresses, type Address } from '@/hooks/use-addresses';
import { useTranslation } from '@/components/language-provider';
import {
  DEFAULT_COUNTRY,
  GovernorateSelect,
  isSyria,
  matchGovernorate,
  useGovernorateLabel,
} from '@/components/governorate-select';
import { cn } from '@/lib/utils';

const EMPTY: Partial<Address> = {
  label: '', name: '', line1: '', line2: '', city: '',
  postalCode: '', country: DEFAULT_COUNTRY, phone: '', isDefault: false,
};

/** Translated message for a failed save (never the raw server text). */
const SAVE_ERRORS: Record<string, [string, string]> = {
  name: ['addressBook.errors.name', 'Please enter the recipient’s full name.'],
  line1: ['addressBook.errors.line1', 'Please enter the area, street and a nearby landmark.'],
  city: ['addressBook.errors.city', 'Please choose a governorate.'],
};

export default function AddressesPage() {
  const { user } = useSessionUser();
  const { addresses, loading, create, update, remove, setDefault } = useAddresses();
  const { toast } = useToast();
  const { t } = useTranslation();
  const governorateLabel = useGovernorateLabel();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Address>>(EMPTY);
  const [saving, setSaving] = useState(false);
  // In-page confirmation for delete (no browser dialogs).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const syria = isSyria(form.country);

  function startCreate() {
    setForm({ ...EMPTY, isDefault: addresses.length === 0 });
    setEditingId(null);
    setOpen(true);
  }
  function startEdit(a: Address) {
    const country = a.country || DEFAULT_COUNTRY;
    // Legacy free-text cities that aren't a governorate must be re-picked.
    setForm({ ...a, country, city: isSyria(country) ? matchGovernorate(a.city) : a.city });
    setEditingId(a.id);
    setOpen(true);
  }
  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city?.trim()) {
      toast({ variant: 'destructive', title: t('addressBook.saveFailed', 'Could not save'), description: t(...SAVE_ERRORS.city) });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Address> = {
        label: form.label || '',
        name: form.name || '',
        line1: form.line1 || '',
        line2: form.line2 || '',
        city: form.city || '',
        postalCode: form.postalCode || '',
        country: form.country?.trim() || DEFAULT_COUNTRY,
        phone: form.phone || '',
        isDefault: !!form.isDefault,
      };
      if (editingId) {
        await update(editingId, payload);
        toast({ title: t('addressBook.updated', 'Address updated') });
      } else {
        await create(payload);
        toast({ title: t('addressBook.saved', 'Address saved') });
      }
      closeForm();
    } catch (err) {
      const field = err instanceof AddressSaveError ? err.field : undefined;
      const message = (field && SAVE_ERRORS[field]) || (['addressBook.errors.generic', 'Please check the address and try again.'] as [string, string]);
      toast({ variant: 'destructive', title: t('addressBook.saveFailed', 'Could not save'), description: t(message[0], message[1]) });
    } finally {
      setSaving(false);
    }
  }
  async function onRemove(id: string) {
    try {
      await remove(id);
      toast({ title: t('addressBook.deleted', 'Address deleted') });
    } catch {
      toast({
        variant: 'destructive',
        title: t('addressBook.deleteFailed', 'Could not delete'),
        description: t('addressBook.errors.generic', 'Please check the address and try again.'),
      });
    } finally {
      setConfirmDeleteId(null);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-foreground/40" aria-hidden="true" />
          <h1 className="font-headline text-xl mb-3">{t('addressBook.title', 'Saved addresses')}</h1>
          <p className="mb-4 text-sm">{t('addressBook.loginPrompt', 'Log in to manage your saved addresses.')}</p>
          <Button asChild><Link href={`/login?next=${encodeURIComponent('/account/addresses')}`}>{t('nav.login')}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="font-headline text-xs px-3 py-2 bg-foreground text-background" aria-hidden="true">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <h1 className="font-headline text-3xl md:text-4xl">{t('addressBook.title', 'Saved addresses')}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('addressBook.subtitle', "Speed up checkout — pick a default and we'll pre-fill it for you.")}
            </p>
          </div>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 me-1" /> {t('addressBook.add', 'Add address')}
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
                  {a.isDefault && <Badge variant="featured">{t('addressBook.defaultBadge', 'Default')}</Badge>}
                </div>
              </div>
              <div className="text-sm space-y-1 mb-4">
                <p className="font-bold">{a.name}</p>
                <p>{a.line1}</p>
                {a.line2 && <p>{a.line2}</p>}
                <p>{[governorateLabel(a.city), a.postalCode].filter(Boolean).join(', ')}</p>
                <p>{a.country}</p>
                {a.phone && <p className="text-muted-foreground" dir="ltr">{a.phone}</p>}
              </div>
              {confirmDeleteId === a.id ? (
                <div className="border-[2px] border-destructive p-3 space-y-2 text-sm" role="group" aria-label={t('addressBook.confirmDeleteAria', 'Confirm delete')}>
                  <p>{t('addressBook.confirmDelete', 'Delete this address?')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" onClick={() => onRemove(a.id)}>
                      {t('addressBook.confirmDeleteYes', 'Yes, delete')}
                    </Button>
                    <Button size="sm" variant="outline" autoFocus onClick={() => setConfirmDeleteId(null)}>
                      {t('addressBook.cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(a)}>{t('addressBook.edit', 'Edit')}</Button>
                  {!a.isDefault && (
                    <Button size="sm" variant="outline" onClick={() => setDefault(a.id).catch(() => {})}>
                      <Star className="h-3 w-3 me-1" /> {t('addressBook.setDefault', 'Set default')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(a.id)}>
                    <Trash2 className="h-3 w-3 me-1" /> {t('addressBook.delete', 'Delete')}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="border-[3px] border-dashed border-foreground/30 p-10 text-center">
          <MapPin className="h-10 w-10 mx-auto mb-3 text-foreground/40" aria-hidden="true" />
          <p className="mb-4 text-sm">{t('addressBook.empty', 'No saved addresses yet.')}</p>
          <Button onClick={startCreate}><Plus className="h-4 w-4 me-1" /> {t('addressBook.addFirst', 'Add your first address')}</Button>
        </div>
      )}

      {/* Inline add/edit form */}
      {open && (
        <form
          onSubmit={save}
          className="mt-10 border-[3px] border-foreground bg-card text-card-foreground p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))]"
        >
          <h2 className="font-headline text-xl mb-5">
            {editingId ? t('addressBook.editTitle', 'Edit address') : t('addressBook.newTitle', 'New address')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="addr-label">
                {t('addressBook.label', 'Label')}{' '}
                <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
              </Label>
              <Input
                id="addr-label"
                placeholder={t('addressBook.labelPlaceholder', 'Home, Office…')}
                value={form.label || ''}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-name">{t('checkout.labels.fullName', 'Full Name')}</Label>
              <Input id="addr-name" autoComplete="name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-country">{t('checkout.labels.country', 'Country')}</Label>
              <Input
                id="addr-country"
                autoComplete="country-name"
                value={form.country || ''}
                onChange={(e) => {
                  const country = e.target.value;
                  // Back to Syria: keep the city only if it's a governorate.
                  setForm({ ...form, country, city: isSyria(country) ? matchGovernorate(form.city) : form.city });
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-city">{syria ? t('checkout.labels.governorate', 'Governorate') : t('checkout.labels.city', 'City')}</Label>
              {syria ? (
                <GovernorateSelect id="addr-city" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              ) : (
                <Input id="addr-city" autoComplete="address-level2" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="addr-line1">{t('checkout.labels.areaStreet', 'Area, street and nearest landmark')}</Label>
              <Input
                id="addr-line1"
                autoComplete="address-line1"
                placeholder={t('checkout.areaStreetPlaceholder', 'e.g. Mezzeh, Villas St., near the pharmacy')}
                value={form.line1 || ''}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="addr-line2">
                {t('addressBook.line2', 'Building, floor, apartment')}{' '}
                <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
              </Label>
              <Input id="addr-line2" autoComplete="address-line2" value={form.line2 || ''} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-postal">
                {t('checkout.labels.postalCode', 'Postal Code')}{' '}
                <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
              </Label>
              <Input id="addr-postal" autoComplete="postal-code" dir="ltr" value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-phone">
                {t('checkout.labels.phoneWhatsapp', 'Phone / WhatsApp')}{' '}
                <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
              </Label>
              <Input id="addr-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            <span>{t('addressBook.useAsDefault', 'Use as my default address')}</span>
          </label>
          <div className="flex gap-3 mt-5">
            <Button type="submit" disabled={saving}>
              {saving ? t('addressBook.saving', 'Saving…') : editingId ? t('addressBook.saveChanges', 'Save changes') : t('addressBook.saveAddress', 'Save address')}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>{t('addressBook.cancel', 'Cancel')}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
