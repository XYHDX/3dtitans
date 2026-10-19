'use client';

import { useState } from 'react';
import { Upload, CheckCircle2, Search, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Props = {
  orderId: string;
  /** Payment method of the order — Sham Cash gets the automatic check. */
  method?: string | null;
  /** True when Sham Cash payments are verified through the Sham Cash API. */
  autoVerify?: boolean;
  /** Current payment status, so a returning customer sees the right state. */
  paymentStatus?: string;
  /** Called after the payment is confirmed or submitted for review. */
  onStatusChange?: (status: 'paid' | 'verifying') => void;
};

/**
 * Confirm a manual payment (bank transfer / Sham Cash / Syriatel Cash).
 *
 * - Sham Cash with the API connected: "I've paid — check now" looks the transfer
 *   up instantly (by the order reference in the transfer note, or the
 *   transaction number the customer types).
 * - Otherwise: upload a screenshot and/or a reference; an admin confirms it.
 *
 * Screenshots are uploaded through /api/storage/upload into a PRIVATE bucket.
 */
export function ProofUploader({ orderId, method, autoVerify, paymentStatus, onStatusChange }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'verifying' | 'paid'>(
    paymentStatus === 'verifying' ? 'verifying' : paymentStatus === 'paid' ? 'paid' : 'idle'
  );
  const [lastMessage, setLastMessage] = useState('');

  const shamAuto = method === 'sham_cash' && !!autoVerify;

  function settle(status: 'paid' | 'verifying') {
    setState(status);
    onStatusChange?.(status);
  }

  async function checkShamCash() {
    setBusy(true);
    setLastMessage('');
    try {
      const res = await fetch('/api/payments/shamcash/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, transactionId: reference.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.outcome === 'paid') {
        settle('paid');
        toast({ title: 'Payment confirmed', description: 'Thank you! Your order is now paid.' });
      } else if (data?.outcome === 'needs_review') {
        settle('verifying');
        toast({ title: 'Transfer found', description: data.message });
      } else {
        setLastMessage(data?.message || data?.error || 'We could not confirm the payment yet.');
      }
    } catch {
      setLastMessage('Could not check right now. Please try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  async function submitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !reference.trim()) {
      toast({ variant: 'destructive', title: 'Add proof', description: 'Upload a screenshot or paste a transfer reference.' });
      return;
    }
    setBusy(true);
    try {
      let proofUrl = '';
      if (file) {
        const form = new FormData();
        form.append('kind', 'proof');
        form.append('file', file);
        const up = await fetch('/api/storage/upload', { method: 'POST', body: form });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || !upData?.url) throw new Error(upData?.error || 'Upload failed');
        proofUrl = upData.url;
      }

      const res = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, proofUrl: proofUrl || undefined, reference: reference.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to attach proof');

      if (data.paymentStatus === 'paid') {
        settle('paid');
        toast({ title: 'Payment confirmed', description: 'Thank you! Your order is now paid.' });
      } else {
        settle('verifying');
        toast({ title: 'Proof submitted', description: 'We’ll verify and confirm your order shortly.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (state === 'paid') {
    return (
      <div className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" />
          <strong className="font-headline text-sm">PAYMENT CONFIRMED</strong>
        </div>
        <p className="text-xs text-muted-foreground">Thank you — we&rsquo;ll start processing your order.</p>
      </div>
    );
  }

  if (state === 'verifying') {
    return (
      <div className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5" />
          <strong className="font-headline text-sm">PAYMENT UNDER REVIEW</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          Our team will verify it within 24 hours. You&rsquo;ll get an email when payment is confirmed.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitProof}
      className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]"
    >
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4" />
        <strong className="font-headline text-xs uppercase tracking-wider">Confirm your payment</strong>
      </div>
      <div className="space-y-3">
        {shamAuto ? (
          <>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Sham Cash transaction number (optional)"
              aria-label="Sham Cash transaction number"
              inputMode="numeric"
            />
            <Button type="button" onClick={checkShamCash} disabled={busy} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {busy ? 'Checking...' : 'I’ve paid — check now'}
            </Button>
            {lastMessage && <p className="text-xs text-destructive">{lastMessage}</p>}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Still not found? Send a screenshot instead</summary>
              <div className="space-y-3 mt-3">
                <ScreenshotInput onChange={setFile} />
                <Button type="submit" variant="outline" disabled={busy} className="w-full">
                  {busy ? 'Uploading...' : 'Submit screenshot for review'}
                </Button>
              </div>
            </details>
          </>
        ) : (
          <>
            <ScreenshotInput onChange={setFile} />
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Or paste a transfer reference number"
              aria-label="Transfer reference"
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Uploading...' : 'Submit payment proof'}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function ScreenshotInput({ onChange }: { onChange: (f: File | null) => void }) {
  return (
    <label className="block text-xs">
      <span className="font-headline uppercase tracking-wider text-[10px]">Screenshot of transfer</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full mt-1 text-xs file:mr-3 file:border-[2px] file:border-foreground file:bg-background file:text-foreground file:px-3 file:py-1 file:font-headline file:text-[10px] file:cursor-pointer hover:file:bg-accent"
      />
    </label>
  );
}
