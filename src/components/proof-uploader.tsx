'use client';

import { useId, useState } from 'react';
import { Upload, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/components/language-provider';
import { UploadProgress } from '@/components/upload-progress';
import { uploadErrorMessage, uploadFileDirect, DirectUploadError } from '@/lib/supabase/direct-upload';
import { acceptAttribute, allowedExtension, maxMegabytes, UPLOAD_KINDS } from '@/lib/supabase/upload-kinds';

type Props = {
  orderId: string;
  /** Payment method of the order (bank_transfer / sham_cash / syriatel_cash). */
  method?: string | null;
  /** Current payment status, so a returning customer sees the right state. */
  paymentStatus?: string;
  /** Called after the payment is confirmed or submitted for review. */
  onStatusChange?: (status: 'paid' | 'verifying') => void;
};

/**
 * Confirm a manual payment (bank transfer / Sham Cash / Syriatel Cash):
 * upload a screenshot and/or a transfer reference; an admin confirms it.
 * (ShamCash ONLINE payment is a different method with its own panel.)
 *
 * Screenshots go straight to the PRIVATE payment-proofs bucket through a
 * signed upload URL (/api/storage/upload-url), then /api/payments/proof
 * attaches them to the order.
 */
export function ProofUploader({ orderId, paymentStatus, onStatusChange }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'verifying' | 'paid'>(
    paymentStatus === 'verifying' ? 'verifying' : paymentStatus === 'paid' ? 'paid' : 'idle'
  );

  function settle(status: 'paid' | 'verifying') {
    setState(status);
    onStatusChange?.(status);
  }

  function pickFile(f: File | null) {
    setFormError(null);
    if (!f) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!allowedExtension('proof', f.name)) {
      setFile(null);
      setFileError(t('uploads.proof.badType', 'Please choose a JPG, PNG or WEBP image, or a PDF.'));
      return;
    }
    if (f.size > UPLOAD_KINDS.proof.maxBytes) {
      setFile(null);
      setFileError(t('uploads.err.tooLarge', 'This file is too large. The maximum is {size} MB.', { size: maxMegabytes('proof') }));
      return;
    }
    setFile(f);
    setFileError(null);
  }

  async function submitProof(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!file && !reference.trim()) {
      const msg = t('uploads.proof.needProof', 'Upload a screenshot or paste a transfer reference.');
      setFormError(msg);
      toast({ variant: 'destructive', title: t('uploads.proof.addProofTitle', 'Add proof'), description: msg });
      return;
    }
    setBusy(true);
    try {
      let proofUrl = '';
      if (file) {
        setProgress(0);
        const stored = await uploadFileDirect(file, 'proof', { onProgress: setProgress });
        proofUrl = stored.url;
      }

      const res = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, proofUrl: proofUrl || undefined, reference: reference.trim() }),
      }).catch(() => {
        throw new DirectUploadError('network');
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Server messages here are specific (already paid, cancelled, ...).
        throw new Error(
          res.status === 401
            ? t('uploads.err.login', 'Your session has expired. Please log in again and retry.')
            : data.error || t('uploads.proof.attachFailed', 'We could not attach your proof. Please try again.')
        );
      }

      if (data.paymentStatus === 'paid') {
        settle('paid');
        toast({
          title: t('uploads.proof.paidToastTitle', 'Payment confirmed'),
          description: t('uploads.proof.paidToastDesc', 'Thank you! Your order is now paid.'),
        });
      } else {
        settle('verifying');
        toast({
          title: t('uploads.proof.sentToastTitle', 'Proof submitted'),
          description: t('uploads.proof.sentToastDesc', 'We’ll verify it and confirm your order shortly.'),
        });
      }
    } catch (err: any) {
      const msg = err instanceof DirectUploadError ? uploadErrorMessage(err, t, 'proof') : err?.message || uploadErrorMessage(err, t, 'proof');
      setFormError(msg);
      toast({ variant: 'destructive', title: t('uploads.proof.failTitle', 'Upload failed'), description: msg });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (state === 'paid') {
    return (
      <div className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pixel-green))]" aria-hidden="true" />
          <strong className="font-headline text-sm">{t('uploads.proof.paidTitle', 'PAYMENT CONFIRMED')}</strong>
        </div>
        <p className="text-xs text-muted-foreground">{t('uploads.proof.paidBody', 'Thank you — we’ll start processing your order.')}</p>
      </div>
    );
  }

  if (state === 'verifying') {
    return (
      <div className="border-[3px] border-foreground bg-card p-4 mt-4 shadow-[4px_4px_0_0_hsl(var(--accent))]">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5" aria-hidden="true" />
          <strong className="font-headline text-sm">{t('uploads.proof.reviewTitle', 'PAYMENT UNDER REVIEW')}</strong>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('uploads.proof.reviewBody', 'Our team will verify it within 24 hours. You’ll get an email when payment is confirmed.')}
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
        <Upload className="h-4 w-4" aria-hidden="true" />
        <strong className="font-headline text-xs uppercase tracking-wider">{t('uploads.proof.title', 'Confirm your payment')}</strong>
      </div>
      <div className="space-y-3">
        <ScreenshotInput onChange={pickFile} disabled={busy} error={fileError} />
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t('uploads.proof.referencePlaceholder', 'Or paste a transfer reference number')}
          aria-label={t('uploads.proof.referenceLabel', 'Transfer reference')}
          maxLength={200}
          disabled={busy}
        />
        {progress !== null && (
          <UploadProgress value={progress} label={t('uploads.proof.uploading', 'Uploading screenshot...')} />
        )}
        {formError && (
          <p role="alert" className="text-xs text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t('uploads.proof.submitting', 'Sending...') : t('uploads.proof.submit', 'Submit payment proof')}
        </Button>
      </div>
    </form>
  );
}

function ScreenshotInput({
  onChange,
  disabled,
  error,
}: {
  onChange: (f: File | null) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="text-xs">
      <label htmlFor={id} className="font-headline uppercase tracking-wider text-[10px]">
        {t('uploads.proof.screenshotLabel', 'Screenshot of transfer')}
      </label>
      <input
        id={id}
        type="file"
        accept={acceptAttribute('proof')}
        disabled={disabled}
        aria-describedby={hintId}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full mt-1 text-xs file:me-3 file:border-[2px] file:border-foreground file:bg-background file:text-foreground file:px-3 file:py-1 file:font-headline file:text-[10px] file:cursor-pointer hover:file:bg-accent"
      />
      <p id={hintId} className={error ? 'mt-1 text-destructive' : 'mt-1 text-muted-foreground'} role={error ? 'alert' : undefined}>
        {error || t('uploads.proof.hint', 'JPG, PNG, WEBP or PDF, up to {size} MB.', { size: maxMegabytes('proof') })}
      </p>
    </div>
  );
}
