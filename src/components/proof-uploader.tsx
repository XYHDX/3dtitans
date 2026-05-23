'use client';

import { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

/**
 * Upload a payment-proof screenshot for an order.
 *
 * Flow: client uploads file to Supabase Storage 'payment-proofs' bucket,
 * then POSTs the public URL to /api/payments/proof to attach it to the order.
 * Admin then verifies via the admin orders dashboard.
 *
 * NOTE: requires a Supabase Storage bucket named 'payment-proofs' to be
 * created (public-read recommended). See scripts/phase4_payments_migration.sql
 * for the setup steps.
 */
export function ProofUploader({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast({ variant: 'destructive', title: 'Storage unavailable', description: 'Supabase is not configured.' });
      return;
    }
    if (!file && !reference.trim()) {
      toast({ variant: 'destructive', title: 'Add proof', description: 'Upload a screenshot or paste a transfer reference.' });
      return;
    }
    setUploading(true);
    try {
      let proofUrl = '';
      if (file) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${orderId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        proofUrl = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl;
      }

      const res = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, proofUrl, reference: reference.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach proof');

      setDone(true);
      toast({ title: 'Proof submitted', description: 'We’ll verify and confirm your order shortly.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" />
          <strong className="font-headline text-sm">PROOF SUBMITTED</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          Our team will verify within 24 hours. You&rsquo;ll get an email when payment is confirmed.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]"
    >
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4" />
        <strong className="font-headline text-xs uppercase tracking-wider">Confirm your payment</strong>
      </div>
      <div className="space-y-3">
        <label className="block text-xs">
          <span className="font-headline uppercase tracking-wider text-[10px]">Screenshot of transfer</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full mt-1 text-xs file:mr-3 file:border-[2px] file:border-foreground file:bg-background file:text-foreground file:px-3 file:py-1 file:font-headline file:text-[10px] file:cursor-pointer hover:file:bg-accent"
          />
        </label>
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Or paste a transfer reference number"
          aria-label="Transfer reference"
        />
        <Button type="submit" disabled={uploading} className="w-full">
          {uploading ? 'Uploading...' : 'Submit payment proof'}
        </Button>
      </div>
    </form>
  );
}
