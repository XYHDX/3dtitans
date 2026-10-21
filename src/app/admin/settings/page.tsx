'use client';

import { useState, useEffect } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { AlertTriangle, Banknote, Building2, Smartphone, CreditCard, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/language-provider';
import { SITE_SETTING_KEYS, validateSiteSettings, type SiteSettingKey } from '@/lib/site-settings-shared';

type GeneralFormData = Record<SiteSettingKey, string>;

/** Same rules as the server (src/lib/site-settings-shared.ts), so errors show before saving. */
const generalResolver: Resolver<GeneralFormData> = async (values) => {
  const { errors } = validateSiteSettings(values);
  const keys = Object.keys(errors) as SiteSettingKey[];
  if (keys.length === 0) return { values, errors: {} };
  const fieldErrors: FieldErrors<GeneralFormData> = {};
  for (const key of keys) fieldErrors[key] = { type: 'validate', message: errors[key] };
  return { values: {}, errors: fieldErrors };
};

/** Bilingual text settings: [English key, Arabic key, label i18n key, multi-line rows]. */
const TEXT_PAIRS: Array<[SiteSettingKey, SiteSettingKey, string, number]> = [
  ['aboutHeroTitle', 'aboutHeroTitleAr', 'adminSettings.aboutHeroTitle', 0],
  ['aboutHeroSubtitle', 'aboutHeroSubtitleAr', 'adminSettings.aboutHeroSubtitle', 2],
  ['aboutMissionTitle', 'aboutMissionTitleAr', 'adminSettings.aboutMissionTitle', 0],
  ['aboutMission', 'aboutMissionAr', 'adminSettings.aboutMission', 4],
  ['aboutContactTitle', 'aboutContactTitleAr', 'adminSettings.aboutContactTitle', 0],
  ['aboutContact', 'aboutContactAr', 'adminSettings.aboutContact', 3],
  ['aboutContactCardTitle', 'aboutContactCardTitleAr', 'adminSettings.aboutContactCardTitle', 0],
  ['footerBlurb', 'footerBlurbAr', 'adminSettings.footerBlurb', 3],
];

export default function SettingsAdminPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useSessionUser();
  const { data: settings, loading: settingsLoading, saveSettings, refresh } = useSiteSettings();

  const {
    register, handleSubmit, formState: { errors }, reset,
  } = useForm<GeneralFormData>({ resolver: generalResolver });

  useEffect(() => {
    if (settings) {
      reset(Object.fromEntries(SITE_SETTING_KEYS.map((k) => [k, settings[k] || ''])) as GeneralFormData);
    }
  }, [settings, reset]);

  const onSubmit = async (data: GeneralFormData) => {
    setLoading(true);
    const ok = await saveSettings(data);
    toast(ok
      ? { title: t('adminSettings.savedTitle'), description: t('adminSettings.savedDesc') }
      : { variant: 'destructive', title: t('adminSettings.saveFailedTitle'), description: t('adminSettings.saveFailedDesc') });
    // Pull back the normalised values (e.g. WhatsApp number in +963… form).
    if (ok) await refresh();
    setLoading(false);
  };

  const errorText = (key: SiteSettingKey) => {
    const code = errors[key]?.message;
    return code ? t(`adminSettings.errors.${code}`, code) : undefined;
  };

  if (!user) {
    return <div className="text-center py-16"><p className="text-muted-foreground">{t('adminSettings.pleaseLogIn')}</p></div>;
  }
  if (user.role !== 'admin') {
    return <div className="text-center py-16"><h1 className="text-3xl font-bold">{t('adminSettings.accessDenied')}</h1></div>;
  }

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 max-w-xl">
        <TabsTrigger value="general">{t('adminSettings.tabGeneral')}</TabsTrigger>
        <TabsTrigger value="maintenance">
          <Wrench className="h-3.5 w-3.5 me-1.5" /> {t('adminSettings.tabMaintenance')}
        </TabsTrigger>
        <TabsTrigger value="payments">{t('adminSettings.tabPayments')}</TabsTrigger>
      </TabsList>

      {/* GENERAL */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>{t('adminSettings.generalTitle')}</CardTitle>
            <CardDescription>{t('adminSettings.generalDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8" noValidate>
                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="font-headline text-sm mb-2 sm:col-span-2">{t('adminSettings.contactSection')}</legend>
                  <p className="text-xs text-muted-foreground sm:col-span-2 -mt-1">{t('adminSettings.contactHint')}</p>
                  <Field id="whatsappNumber" label={t('adminSettings.whatsappNumber')} hint={t('adminSettings.whatsappHint')} error={errorText('whatsappNumber')}>
                    <Input id="whatsappNumber" dir="ltr" inputMode="tel" autoComplete="off" placeholder="+963 9XX XXX XXX" {...register('whatsappNumber')} />
                  </Field>
                  <Field id="contactPhone" label={t('adminSettings.contactPhone')} error={errorText('contactPhone')}>
                    <Input id="contactPhone" dir="ltr" inputMode="tel" autoComplete="off" placeholder="+963 11 XXX XXXX" {...register('contactPhone')} />
                  </Field>
                  <Field id="contactEmail" label={t('adminSettings.contactEmail')} error={errorText('contactEmail')}>
                    <Input id="contactEmail" dir="ltr" type="email" autoComplete="off" placeholder="support@3dtitans.org" {...register('contactEmail')} />
                  </Field>
                  <div className="hidden sm:block" aria-hidden />
                  <Field id="contactHours" label={t('adminSettings.contactHoursEn')} error={errorText('contactHours')}>
                    <Input id="contactHours" dir="ltr" lang="en" placeholder="Sat–Thu, 10:00–20:00" {...register('contactHours')} />
                  </Field>
                  <Field id="contactHoursAr" label={t('adminSettings.contactHoursAr')} error={errorText('contactHoursAr')}>
                    <Input id="contactHoursAr" dir="rtl" lang="ar" placeholder="السبت – الخميس، 10:00 – 20:00" {...register('contactHoursAr')} />
                  </Field>
                  <Field id="contactAddress" label={t('adminSettings.contactAddressEn')} error={errorText('contactAddress')}>
                    <Textarea id="contactAddress" dir="ltr" lang="en" rows={2} {...register('contactAddress')} />
                  </Field>
                  <Field id="contactAddressAr" label={t('adminSettings.contactAddressAr')} error={errorText('contactAddressAr')}>
                    <Textarea id="contactAddressAr" dir="rtl" lang="ar" rows={2} {...register('contactAddressAr')} />
                  </Field>
                </fieldset>

                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="font-headline text-sm mb-2 sm:col-span-2">{t('adminSettings.socialSection')}</legend>
                  <Field id="facebookUrl" label={t('adminSettings.facebookUrl')} error={errorText('facebookUrl')}>
                    <Input id="facebookUrl" dir="ltr" type="url" placeholder="https://www.facebook.com/..." {...register('facebookUrl')} />
                  </Field>
                  <Field id="instagramUrl" label={t('adminSettings.instagramUrl')} error={errorText('instagramUrl')}>
                    <Input id="instagramUrl" dir="ltr" type="url" placeholder="https://www.instagram.com/..." {...register('instagramUrl')} />
                  </Field>
                </fieldset>

                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="font-headline text-sm mb-2 sm:col-span-2">{t('adminSettings.textsSection')}</legend>
                  <p className="text-xs text-muted-foreground sm:col-span-2 -mt-1">{t('adminSettings.textsHint')}</p>
                  {TEXT_PAIRS.map(([enKey, arKey, labelKey, rows]) => (
                    <div key={enKey} className="contents">
                      <Field id={enKey} label={`${t(labelKey)} (${t('adminSettings.english')})`} error={errorText(enKey)}>
                        {rows ? (
                          <Textarea id={enKey} dir="ltr" lang="en" rows={rows} {...register(enKey)} />
                        ) : (
                          <Input id={enKey} dir="ltr" lang="en" {...register(enKey)} />
                        )}
                      </Field>
                      <Field id={arKey} label={`${t(labelKey)} (${t('adminSettings.arabic')})`} error={errorText(arKey)}>
                        {rows ? (
                          <Textarea id={arKey} dir="rtl" lang="ar" rows={rows} {...register(arKey)} />
                        ) : (
                          <Input id={arKey} dir="rtl" lang="ar" {...register(arKey)} />
                        )}
                      </Field>
                    </div>
                  ))}
                </fieldset>

                <Button type="submit" disabled={loading} className="w-fit">
                  {loading ? t('adminSettings.saving') : t('adminSettings.save')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* MAINTENANCE */}
      <TabsContent value="maintenance">
        <MaintenanceTab />
      </TabsContent>

      {/* PAYMENTS */}
      <TabsContent value="payments">
        <PaymentsTab />
      </TabsContent>
    </Tabs>
  );
}

function Field({
  label, children, id, hint, error,
}: {
  label: string;
  children: React.ReactNode;
  /** id of the control, so the label is associated with it. */
  id?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="grid gap-2 content-start">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-semibold text-destructive" role="alert">{error}</p>}
    </div>
  );
}

// ============================================================================
// MAINTENANCE TAB
// ============================================================================

function MaintenanceTab() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings?prefix=site.');
        const data = await res.json();
        const s = data.settings || {};
        setEnabled(s['site.maintenanceMode'] === 'true');
        setMessage(s['site.maintenanceMessage'] || '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'site.maintenanceMode': enabled ? 'true' : 'false',
          'site.maintenanceMessage': message,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Maintenance settings saved', description: enabled ? 'Site is now in maintenance mode.' : 'Site is live.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Maintenance Mode</CardTitle>
        <CardDescription>
          When enabled, all non-admin visitors see a maintenance page. Admins can browse normally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {enabled && (
          <div className="border-[3px] border-foreground bg-destructive text-destructive-foreground p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <strong>Site is currently in maintenance mode.</strong> Customers and creators cannot reach product pages, checkout, or any other part of the site.
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 border-[3px] border-foreground"
          />
          <span className="font-headline text-sm">Enable maintenance mode</span>
        </label>

        <div>
          <Label>Message shown to visitors</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="We're upgrading the marketplace. Be back shortly."
            className="mt-2"
          />
        </div>

        <Button onClick={save} disabled={saving} className="w-fit">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAYMENTS TAB
// ============================================================================

type PaymentSettings = {
  codEnabled: boolean;
  bankEnabled: boolean;
  shamCashEnabled: boolean;
  shamCashEpayEnabled: boolean;
  syriatelCashEnabled: boolean;
  stripeEnabled: boolean;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankAccountHolder: string;
  shamCashNumber: string;
  syriatelCashNumber: string;
  currencyLabel: string;
};

const PAYMENT_DEFAULTS: PaymentSettings = {
  codEnabled: false, bankEnabled: false, shamCashEnabled: false, shamCashEpayEnabled: false, syriatelCashEnabled: false, stripeEnabled: false,
  bankName: '', bankAccountNumber: '', bankIban: '', bankAccountHolder: '',
  shamCashNumber: '', syriatelCashNumber: '', currencyLabel: 'USD',
};

function PaymentsTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [state, setState] = useState<PaymentSettings>(PAYMENT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings?prefix=payment.');
        const data = await res.json();
        const s: Record<string, string> = data.settings || {};
        setState({
          codEnabled:          s['payment.codEnabled']          === 'true',
          bankEnabled:         s['payment.bankEnabled']         === 'true',
          shamCashEnabled:     s['payment.shamCashEnabled']     === 'true',
          shamCashEpayEnabled: s['payment.shamCashEpayEnabled'] === 'true',
          syriatelCashEnabled: s['payment.syriatelCashEnabled'] === 'true',
          stripeEnabled:       s['payment.stripeEnabled']       === 'true',
          bankName:            s['payment.bankName']            || '',
          bankAccountNumber:   s['payment.bankAccountNumber']   || '',
          bankIban:            s['payment.bankIban']            || '',
          bankAccountHolder:   s['payment.bankAccountHolder']   || '',
          shamCashNumber:      s['payment.shamCashNumber']      || '',
          syriatelCashNumber:  s['payment.syriatelCashNumber']  || '',
          // Only USD/SYP are accepted by the API; anything else shows (and saves) as USD.
          currencyLabel:       (s['payment.currencyLabel'] || '').toUpperCase() === 'SYP' ? 'SYP' : 'USD',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        'payment.codEnabled':           String(state.codEnabled),
        'payment.bankEnabled':          String(state.bankEnabled),
        'payment.shamCashEnabled':      String(state.shamCashEnabled),
        'payment.shamCashEpayEnabled':  String(state.shamCashEpayEnabled),
        'payment.syriatelCashEnabled':  String(state.syriatelCashEnabled),
        'payment.stripeEnabled':        String(state.stripeEnabled),
        'payment.bankName':             state.bankName,
        'payment.bankAccountNumber':    state.bankAccountNumber,
        'payment.bankIban':             state.bankIban,
        'payment.bankAccountHolder':    state.bankAccountHolder,
        'payment.shamCashNumber':       state.shamCashNumber,
        'payment.syriatelCashNumber':   state.syriatelCashNumber,
        'payment.currencyLabel':        state.currencyLabel,
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Save failed');
      }
      toast({ title: 'Payment settings saved' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e.message });
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) {
    setState((prev) => ({ ...prev, [k]: v }));
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('adminSettings.currencyTitle')}</CardTitle>
          <CardDescription>{t('adminSettings.currencyDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            aria-label={t('adminSettings.currencyTitle')}
            value={state.currencyLabel}
            onChange={(e) => patch('currencyLabel', e.target.value)}
            className="h-10 max-w-[240px] w-full border-[3px] border-foreground bg-background px-3 text-sm font-bold"
          >
            <option value="USD">{t('adminSettings.currencyUsd')}</option>
            <option value="SYP">{t('adminSettings.currencySyp')}</option>
          </select>
        </CardContent>
      </Card>

      <PaymentMethodCard
        icon={<Banknote className="h-5 w-5" />}
        title="Cash on Delivery"
        description="Customer pays in cash when the order arrives."
        enabled={state.codEnabled}
        onToggle={(v) => patch('codEnabled', v)}
      />

      <PaymentMethodCard
        icon={<Building2 className="h-5 w-5" />}
        title="Bank Transfer"
        description="Customer transfers to your bank account, then uploads a screenshot."
        enabled={state.bankEnabled}
        onToggle={(v) => patch('bankEnabled', v)}
      >
        {state.bankEnabled && !state.bankAccountNumber.trim() && !state.bankIban.trim() && (
          <MissingDetails text="Add an account number or IBAN — until then customers won't see this method." />
        )}
        <Field label="Bank name"><Input value={state.bankName} onChange={(e) => patch('bankName', e.target.value)} /></Field>
        <Field label="Account holder"><Input value={state.bankAccountHolder} onChange={(e) => patch('bankAccountHolder', e.target.value)} /></Field>
        <Field label="Account number"><Input value={state.bankAccountNumber} onChange={(e) => patch('bankAccountNumber', e.target.value)} /></Field>
        <Field label="IBAN (optional)"><Input value={state.bankIban} onChange={(e) => patch('bankIban', e.target.value)} /></Field>
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<Zap className="h-5 w-5" />}
        title="ShamCash — online payment (e-pay)"
        description="The customer is sent to the ShamCash app or website and confirms the bill with their transfer code. ShamCash notifies us automatically, so the order is marked paid without any screenshot. Needs SHAMCASH_BASE_URL, SHAMCASH_AGENT_KEY and SHAMCASH_SECRET_KEY in the server environment."
        enabled={state.shamCashEpayEnabled}
        onToggle={(v) => patch('shamCashEpayEnabled', v)}
      >
        {state.shamCashEpayEnabled && !['USD', 'SYP'].includes(state.currencyLabel.trim().toUpperCase()) && (
          <MissingDetails text="ShamCash bills only in USD or SYP — change the store currency above, otherwise customers won't see this method." />
        )}
        <ShamCashEpayStatus />
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<Smartphone className="h-5 w-5" />}
        title="Sham Cash (manual transfer)"
        description="Customer sends to your Sham Cash wallet with the order reference in the note, then uploads a screenshot. You confirm it in Orders."
        enabled={state.shamCashEnabled}
        onToggle={(v) => patch('shamCashEnabled', v)}
      >
        {state.shamCashEnabled && !state.shamCashNumber.trim() && (
          <MissingDetails text="Add your Sham Cash account number — until then customers won't see this method." />
        )}
        <Field label="Sham Cash account number / address (shown to customers)">
          <Input value={state.shamCashNumber} onChange={(e) => patch('shamCashNumber', e.target.value)} />
        </Field>
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<Smartphone className="h-5 w-5" />}
        title="Syriatel Cash"
        description="Customer pays via Syriatel Cash wallet, then uploads a screenshot."
        enabled={state.syriatelCashEnabled}
        onToggle={(v) => patch('syriatelCashEnabled', v)}
      >
        {state.syriatelCashEnabled && !state.syriatelCashNumber.trim() && (
          <MissingDetails text="Add your Syriatel Cash number — until then customers won't see this method." />
        )}
        <Field label="Syriatel Cash phone number"><Input value={state.syriatelCashNumber} onChange={(e) => patch('syriatelCashNumber', e.target.value)} placeholder="+963 9XX XXX XXX" /></Field>
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<CreditCard className="h-5 w-5" />}
        title="Stripe (international cards)"
        description="Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel env vars."
        enabled={state.stripeEnabled}
        onToggle={(v) => patch('stripeEnabled', v)}
      >
        <p className="text-xs text-muted-foreground">
          No customer-facing fields here — Stripe keys live in env vars and are never exposed to the browser.
        </p>
      </PaymentMethodCard>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? 'Saving…' : 'Save payment settings'}
        </Button>
      </div>
    </div>
  );
}

function MissingDetails({ text }: { text: string }) {
  return <p className="text-xs font-semibold text-destructive border-[2px] border-destructive p-2">{text}</p>;
}

type ShamCashEpayStatusResponse = {
  configured: boolean;
  ok: boolean;
  enabled?: boolean;
  currency?: string;
  currencySupported?: boolean;
  host?: string | null;
  result?: number | null;
  message?: string;
};

/** "Test connection" for ShamCash e-pay (keys live in server env vars; never shown here). */
function ShamCashEpayStatus() {
  const [status, setStatus] = useState<ShamCashEpayStatusResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  async function test() {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/shamcash/status', { cache: 'no-store' });
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false, ok: false, message: 'Could not reach the server.' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="border-[2px] border-foreground/30 p-3 space-y-2 text-xs sm:col-span-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <strong className="font-headline uppercase tracking-wider text-[10px]">ShamCash connection</strong>
        <Button type="button" size="sm" variant="outline" onClick={test} disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
      </div>
      {!status && (
        <p className="text-muted-foreground">
          Press &ldquo;Test connection&rdquo; to check the keys with ShamCash (it only reads your recent transactions).
        </p>
      )}
      {status && (
        <div className="space-y-1">
          <p className={status.ok ? 'text-[hsl(var(--pixel-green))] font-semibold' : 'text-destructive font-semibold'}>
            {status.ok ? 'Connected' : status.configured ? 'Connection problem' : 'Not configured'}
            {status.host ? ` — ${status.host}${status.host.startsWith('dev.') ? ' (sandbox)' : ''}` : ''}
          </p>
          {status.message && <p>{status.result ? `Code ${status.result}: ` : ''}{status.message}</p>}
          {status.currencySupported === false && (
            <p className="text-destructive">Store currency {status.currency || '?'} is not supported — use USD or SYP.</p>
          )}
        </div>
      )}
      <p className="text-muted-foreground break-all">
        Payment notifications (webhook) are sent by ShamCash to{' '}
        <span className="font-mono">{origin || 'https://your-domain'}/api/payments/shamcash/webhook</span> — it is passed with
        every bill, so there is nothing to register. Remember to save after switching this method on.
      </p>
    </div>
  );
}

function PaymentMethodCard({
  icon, title, description, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn(!enabled && 'opacity-60')}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 grid place-items-center border-[3px] border-foreground bg-accent text-accent-foreground shrink-0">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-5 w-5 border-[3px] border-foreground"
            />
            <span className="text-xs font-headline">{enabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>
      </CardHeader>
      {enabled && children && (
        <CardContent className="grid sm:grid-cols-2 gap-4">{children}</CardContent>
      )}
    </Card>
  );
}
