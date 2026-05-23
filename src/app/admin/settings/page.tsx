'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, Banknote, Building2, Smartphone, CreditCard, Wrench } from 'lucide-react';
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

const generalSchema = z.object({
  aboutHeroTitle: z.string().min(3),
  aboutHeroSubtitle: z.string().min(5),
  aboutMissionTitle: z.string().min(3),
  aboutMission: z.string().min(10),
  aboutContactTitle: z.string().min(3),
  aboutContact: z.string().min(10),
  aboutContactCardTitle: z.string().min(3),
  footerBlurb: z.string().min(10),
  facebookUrl: z.string().trim().url().or(z.literal('')),
  instagramUrl: z.string().trim().url().or(z.literal('')),
});
type GeneralFormData = z.infer<typeof generalSchema>;

export default function SettingsAdminPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useSessionUser();
  const { data: settings, loading: settingsLoading, saveSettings } = useSiteSettings();

  const {
    register, handleSubmit, formState: { errors }, reset,
  } = useForm<GeneralFormData>({ resolver: zodResolver(generalSchema) });

  useEffect(() => {
    if (settings) {
      reset({
        aboutHeroTitle: settings.aboutHeroTitle || '',
        aboutHeroSubtitle: settings.aboutHeroSubtitle || '',
        aboutMissionTitle: settings.aboutMissionTitle || '',
        aboutMission: settings.aboutMission || '',
        aboutContactTitle: settings.aboutContactTitle || '',
        aboutContact: settings.aboutContact || '',
        aboutContactCardTitle: settings.aboutContactCardTitle || '',
        footerBlurb: settings.footerBlurb || '',
        facebookUrl: settings.facebookUrl || '',
        instagramUrl: settings.instagramUrl || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: GeneralFormData) => {
    setLoading(true);
    const ok = await saveSettings(data);
    toast(ok
      ? { title: 'Settings saved', description: 'Site content updated.' }
      : { variant: 'destructive', title: 'Save failed', description: 'Could not update settings.' });
    setLoading(false);
  };

  if (!user) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Please log in.</p></div>;
  }
  if (user.role !== 'admin') {
    return <div className="text-center py-16"><h1 className="text-3xl font-bold">Access Denied</h1></div>;
  }

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 max-w-xl">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="maintenance">
          <Wrench className="h-3.5 w-3.5 mr-1.5" /> Maintenance
        </TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>

      {/* GENERAL */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>About page content, footer, social links.</CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
                <Field label="About: Hero Title">          <Input {...register('aboutHeroTitle')} /></Field>
                <Field label="About: Hero Subtitle">       <Textarea {...register('aboutHeroSubtitle')} rows={2} /></Field>
                <Field label="About: Mission Title">       <Input {...register('aboutMissionTitle')} /></Field>
                <Field label="About: Mission Statement">   <Textarea {...register('aboutMission')} rows={4} /></Field>
                <Field label="About: Contact Title">       <Input {...register('aboutContactTitle')} /></Field>
                <Field label="About: Contact Text">        <Textarea {...register('aboutContact')} rows={3} /></Field>
                <Field label="About: Contact Card Title">  <Input {...register('aboutContactCardTitle')} /></Field>
                <Field label="Footer Blurb">               <Textarea {...register('footerBlurb')} rows={3} /></Field>
                <Field label="Facebook URL">               <Input {...register('facebookUrl')} placeholder="https://facebook.com/..." /></Field>
                <Field label="Instagram URL">              <Input {...register('instagramUrl')} placeholder="https://instagram.com/..." /></Field>
                <Button type="submit" disabled={loading} className="w-fit">
                  {loading ? 'Saving…' : 'Save'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
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
  codEnabled: false, bankEnabled: false, shamCashEnabled: false, syriatelCashEnabled: false, stripeEnabled: false,
  bankName: '', bankAccountNumber: '', bankIban: '', bankAccountHolder: '',
  shamCashNumber: '', syriatelCashNumber: '', currencyLabel: 'SYP',
};

function PaymentsTab() {
  const { toast } = useToast();
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
          syriatelCashEnabled: s['payment.syriatelCashEnabled'] === 'true',
          stripeEnabled:       s['payment.stripeEnabled']       === 'true',
          bankName:            s['payment.bankName']            || '',
          bankAccountNumber:   s['payment.bankAccountNumber']   || '',
          bankIban:            s['payment.bankIban']            || '',
          bankAccountHolder:   s['payment.bankAccountHolder']   || '',
          shamCashNumber:      s['payment.shamCashNumber']      || '',
          syriatelCashNumber:  s['payment.syriatelCashNumber']  || '',
          currencyLabel:       s['payment.currencyLabel']       || 'SYP',
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
      if (!res.ok) throw new Error('Save failed');
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
          <CardTitle>Currency</CardTitle>
          <CardDescription>Label shown on the order summary and checkout success page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={state.currencyLabel}
            onChange={(e) => patch('currencyLabel', e.target.value)}
            placeholder="e.g. SYP, USD, EUR"
            className="max-w-[200px]"
          />
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
        <Field label="Bank name"><Input value={state.bankName} onChange={(e) => patch('bankName', e.target.value)} /></Field>
        <Field label="Account holder"><Input value={state.bankAccountHolder} onChange={(e) => patch('bankAccountHolder', e.target.value)} /></Field>
        <Field label="Account number"><Input value={state.bankAccountNumber} onChange={(e) => patch('bankAccountNumber', e.target.value)} /></Field>
        <Field label="IBAN (optional)"><Input value={state.bankIban} onChange={(e) => patch('bankIban', e.target.value)} /></Field>
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<Smartphone className="h-5 w-5" />}
        title="Sham Cash"
        description="Customer pays via Sham Cash wallet, then uploads a screenshot."
        enabled={state.shamCashEnabled}
        onToggle={(v) => patch('shamCashEnabled', v)}
      >
        <Field label="Sham Cash phone number"><Input value={state.shamCashNumber} onChange={(e) => patch('shamCashNumber', e.target.value)} placeholder="+963 9XX XXX XXX" /></Field>
      </PaymentMethodCard>

      <PaymentMethodCard
        icon={<Smartphone className="h-5 w-5" />}
        title="Syriatel Cash"
        description="Customer pays via Syriatel Cash wallet, then uploads a screenshot."
        enabled={state.syriatelCashEnabled}
        onToggle={(v) => patch('syriatelCashEnabled', v)}
      >
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
