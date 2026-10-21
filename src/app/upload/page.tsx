'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, File as FileIcon, AlertCircle, CheckCircle2, MessageCircle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';
import { UploadProgress } from '@/components/upload-progress';
import { uploadReference } from '@/components/admin/upload-request-details';
import { track } from '@/lib/analytics';
import { DirectUploadError, uploadErrorMessage, uploadFileDirect } from '@/lib/supabase/direct-upload';
import { acceptAttribute, allowedExtension, maxMegabytes, UPLOAD_KINDS } from '@/lib/supabase/upload-kinds';

const MAX_FILE_SIZE_MB = maxMegabytes('model');
const MATERIALS = ['PLA', 'PETG', 'TPU', 'Resin', 'not_sure'] as const;
type Material = (typeof MATERIALS)[number];

/** Text fields survive the trip to /login (the file itself has to be picked again). */
const DRAFT_KEY = '3dt-print-request-draft';
type Draft = {
  modelName: string;
  phoneNumber: string;
  material: Material;
  colour: string;
  approxSize: string;
  quantity: string;
  deadline: string;
  notes: string;
};
const EMPTY_DRAFT: Draft = {
  modelName: '',
  phoneNumber: '',
  material: 'not_sure',
  colour: '',
  approxSize: '',
  quantity: '1',
  deadline: '',
  notes: '',
};

/**
 * The Upload table has no columns for material/colour/size/quantity/deadline,
 * so they are written into `notes` in a fixed, readable block for the team.
 */
function composeNotes(d: Draft): string {
  const lines = [
    `Material: ${d.material === 'not_sure' ? 'Not sure' : d.material}`,
    d.colour.trim() && `Colour: ${d.colour.trim()}`,
    d.approxSize.trim() && `Approx. size: ${d.approxSize.trim()}`,
    `Quantity: ${Math.max(1, parseInt(d.quantity, 10) || 1)}`,
    d.deadline && `Needed by: ${d.deadline}`,
  ].filter(Boolean) as string[];
  const extra = d.notes.trim();
  return extra ? `${lines.join('\n')}\n---\n${extra}` : lines.join('\n');
}

function whatsappLink(number: string, text: string): string | null {
  let digits = String(number || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function todayIso(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; fileName: string } | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { user, status } = useSessionUser();
  const { t } = useTranslation();
  const busy = phase !== 'idle';

  // Restore what the visitor typed before being sent to log in.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        setForm({ ...EMPTY_DRAFT, ...saved, material: MATERIALS.includes(saved.material) ? saved.material : 'not_sure' });
        setRestored(true);
      }
    } catch {
      // storage unavailable — nothing to restore
    }
  }, []);

  // WhatsApp number for the confirmation screen (optional setting).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const n = data?.settings?.whatsappNumber ?? data?.whatsappNumber;
        if (!cancelled && typeof n === 'string') setWhatsappNumber(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Stop an upload in progress when the page is left.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Set after mount so server and browser render the same HTML.
  useEffect(() => setMinDate(todayIso()), []);

  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const chooseFile = (selected: File | null) => {
    setError(null);
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    if (!allowedExtension('model', selected.name)) {
      setFile(null);
      setFileError(t('uploads.request.badType', 'Please choose a .STL, .3MF or .OBJ file.'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (selected.size > UPLOAD_KINDS.model.maxBytes) {
      setFile(null);
      setFileError(t('uploads.err.tooLarge', 'This file is too large. The maximum is {size} MB.', { size: MAX_FILE_SIZE_MB }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(selected);
    setFileError(null);
    setRestored(false);
    if (!form.modelName.trim()) {
      setForm((prev) => ({ ...prev, modelName: selected.name.replace(/\.(stl|3mf|obj)$/i, '').slice(0, 100) }));
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileError(null);
    setForm(EMPTY_DRAFT);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || status === 'loading') return;

    // Log in only when sending: keep the typed details for when they come back.
    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // not critical
      }
      router.push('/login?next=/upload');
      return;
    }
    if (!file) {
      setFileError(t('uploads.request.noFile', 'Please choose your 3D model file.'));
      return;
    }

    setError(null);
    setProgress(0);
    setPhase('uploading');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const stored = await uploadFileDirect(file, 'model', { onProgress: setProgress, signal: controller.signal });

      setPhase('saving');
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: form.modelName.trim(),
          fileName: file.name,
          filePath: stored.path,
          fileUrl: stored.url,
          downloadURL: stored.url,
          notes: composeNotes(form),
          phoneNumber: form.phoneNumber.trim(),
        }),
      }).catch(() => {
        throw new DirectUploadError('network');
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.upload?.id) {
        throw new Error(
          res.status === 401
            ? t('uploads.err.login', 'Your session has expired. Please log in again and retry.')
            : res.status === 429
              ? t('uploads.err.rateLimited', 'Too many uploads in a short time. Please wait a few minutes and try again.')
              : t('uploads.request.saveFailed', 'Your file was uploaded but we could not register the request. Please try again, or contact us on WhatsApp.')
        );
      }

      const id = String(data.upload.id);
      setDone({ reference: uploadReference(id), fileName: file.name });
      track('generate_lead', { lead_type: 'print_request' });
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (err instanceof DirectUploadError && err.code === 'aborted') {
        toast({ title: t('uploads.err.aborted', 'Upload cancelled.') });
        return;
      }
      const message = err instanceof DirectUploadError ? uploadErrorMessage(err, t, 'model') : err?.message || uploadErrorMessage(err, t, 'model');
      setError(message);
      toast({ variant: 'destructive', title: t('uploads.request.failTitle', 'Upload failed'), description: message });
    } finally {
      abortRef.current = null;
      setPhase('idle');
    }
  };

  if (user?.role === 'store-owner') {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-headline break-words">{t('upload.storeOwnerBlockedTitle')}</h1>
          <p className="text-muted-foreground">{t('upload.storeOwnerBlockedDesc')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/store-dashboard">{t('uploads.request.storeDashboard', 'Go to store dashboard')}</Link>
            </Button>
            <Button asChild>
              <Link href="/">{t('uploads.request.home', 'Return home')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const wa = whatsappLink(
      whatsappNumber,
      t('uploads.done.whatsappText', 'Hello 3D Titans, I just sent a print request. Reference: {ref}', { ref: done.reference })
    );
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-[hsl(var(--pixel-green))]" aria-hidden="true" />
              <h1 className="font-headline text-xl sm:text-2xl uppercase leading-tight break-words">
                {t('uploads.done.title', 'Request received!')}
              </h1>
              <CardDescription>
                {t('uploads.done.fileReceived', 'We received your file "{file}".', { file: done.fileName })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-[3px] border-foreground bg-background p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t('uploads.done.referenceLabel', 'Your reference')}
                </p>
                <p className="mt-1 font-headline text-lg" dir="ltr">
                  {done.reference}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('uploads.done.referenceHint', 'Mention this reference when you contact us.')}
                </p>
              </div>
              <div>
                <h2 className="font-headline text-sm uppercase mb-3">{t('uploads.done.nextTitle', 'What happens next')}</h2>
                <ol className="list-decimal space-y-2 ps-5 text-sm">
                  <li>{t('uploads.done.step1', 'Our team checks your file and the details you gave us.')}</li>
                  <li>
                    {t('uploads.done.step2', 'We’ll contact you on WhatsApp or by phone within 24 hours with the price and the delivery time.')}
                  </li>
                  <li>{t('uploads.done.step3', 'Once you approve the quote, we print your model and arrange delivery.')}</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {wa && (
                <Button asChild className="w-full sm:w-auto">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" /> {t('uploads.done.whatsapp', 'Message us on WhatsApp')}
                  </a>
                </Button>
              )}
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDone(null)}>
                {t('uploads.done.another', 'Send another request')}
              </Button>
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href="/products">{t('uploads.done.shop', 'Browse the shop')}</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  const fieldIds = {
    material: 'print-material',
    colour: 'print-colour',
    size: 'print-size',
    quantity: 'print-quantity',
    deadline: 'print-deadline',
  };

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <h1 className="font-headline text-2xl sm:text-3xl uppercase leading-tight break-words">
              {t('uploads.request.title', 'Custom print request')}
            </h1>
            <CardDescription>
              {t(
                'uploads.request.subtitle',
                'Send us your 3D model and tell us how you want it printed. We reply with a price within 24 hours.'
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-6">
              {restored && (
                <p role="status" className="border-[3px] border-foreground bg-accent/30 p-3 text-sm">
                  {t('uploads.request.restored', 'Welcome back! Your details are still here — please choose your file again.')}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="file-upload">{t('uploads.request.file', '3D model file')}</Label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  className="peer sr-only"
                  accept={acceptAttribute('model')}
                  disabled={busy}
                  aria-describedby="file-upload-hint"
                  aria-invalid={!!fileError}
                  onChange={(e) => chooseFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="file-upload"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (!busy) chooseFile(e.dataTransfer.files?.[0] || null);
                  }}
                  className={`peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 flex flex-col items-center justify-center w-full min-h-[11rem] border-[3px] border-dashed p-4 text-center cursor-pointer transition-colors ${
                    fileError ? 'border-destructive' : 'border-foreground'
                  } ${dragging ? 'bg-accent/40' : 'bg-card hover:bg-muted/50'}`}
                >
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" aria-hidden="true" />
                  <span className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4">
                      {t('uploads.request.fileCta', 'Choose a file')}
                    </span>{' '}
                    {t('uploads.request.fileDrop', 'or drag and drop it here')}
                  </span>
                  <span className="text-xs text-muted-foreground" id="file-upload-hint">
                    {t('uploads.request.fileTypes', '.STL, .3MF or .OBJ — up to {size} MB', { size: MAX_FILE_SIZE_MB })}
                  </span>
                </label>
                {file && !fileError && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3">
                    <FileIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="break-all" dir="ltr">{file.name}</span>
                    <span className="shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                )}
                {fileError && (
                  <div role="alert" className="flex items-center justify-center gap-2 text-sm text-destructive bg-destructive/10 p-3">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="model-name">{t('uploads.request.modelName', 'What should we print?')}</Label>
                  <Input
                    id="model-name"
                    placeholder={t('uploads.request.modelNamePlaceholder', 'e.g. Phone stand, spare part')}
                    required
                    maxLength={200}
                    value={form.modelName}
                    onChange={set('modelName')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone-number">{t('uploads.request.phone', 'WhatsApp / phone number')}</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="+963 9XX XXX XXX"
                    required
                    minLength={6}
                    maxLength={40}
                    value={form.phoneNumber}
                    onChange={set('phoneNumber')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={fieldIds.material}>{t('uploads.request.material', 'Material')}</Label>
                  <select
                    id={fieldIds.material}
                    value={form.material}
                    onChange={set('material')}
                    className="flex h-10 w-full border-[3px] border-foreground bg-background px-3 py-1 text-base font-mono shadow-[3px_3px_0_0_hsl(var(--foreground))] ring-offset-background focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    {MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m === 'not_sure' ? t('uploads.request.materialNotSure', 'Not sure — advise me') : m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={fieldIds.colour}>{t('uploads.request.colour', 'Colour (optional)')}</Label>
                  <Input
                    id={fieldIds.colour}
                    maxLength={60}
                    placeholder={t('uploads.request.colourPlaceholder', 'e.g. black, white, any')}
                    value={form.colour}
                    onChange={set('colour')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={fieldIds.size}>{t('uploads.request.size', 'Approximate size (optional)')}</Label>
                  <Input
                    id={fieldIds.size}
                    maxLength={80}
                    placeholder={t('uploads.request.sizePlaceholder', 'e.g. 10 × 5 × 3 cm, or "as in the file"')}
                    value={form.approxSize}
                    onChange={set('approxSize')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={fieldIds.quantity}>{t('uploads.request.quantity', 'Quantity')}</Label>
                  <Input
                    id={fieldIds.quantity}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    step={1}
                    required
                    value={form.quantity}
                    onChange={set('quantity')}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor={fieldIds.deadline}>{t('uploads.request.deadline', 'Needed by (optional)')}</Label>
                  <Input
                    id={fieldIds.deadline}
                    type="date"
                    min={minDate}
                    value={form.deadline}
                    onChange={set('deadline')}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">{t('uploads.request.notes', 'Anything else? (optional)')}</Label>
                <Textarea
                  id="notes"
                  maxLength={2000}
                  placeholder={t('uploads.request.notesPlaceholder', 'Infill, finish, which parts must be strong, delivery city...')}
                  value={form.notes}
                  onChange={set('notes')}
                />
              </div>

              {phase !== 'idle' && (
                <div className="grid gap-2" aria-live="polite">
                  <UploadProgress
                    value={phase === 'saving' ? 100 : progress}
                    label={
                      phase === 'saving'
                        ? t('uploads.request.saving', 'Sending your request...')
                        : t('uploads.request.uploadingFile', 'Uploading your file...')
                    }
                  />
                  {phase === 'uploading' && (
                    <Button type="button" variant="ghost" size="sm" className="justify-self-end" onClick={() => abortRef.current?.abort()}>
                      {t('uploads.request.cancel', 'Cancel upload')}
                    </Button>
                  )}
                </div>
              )}

              {error && (
                <div role="alert" className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3">
                  <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={busy || status === 'loading'}>
                {!user && status !== 'loading' && <LogIn aria-hidden="true" />}
                {busy
                  ? t('uploads.request.submitting', 'Sending...')
                  : user || status === 'loading'
                    ? t('uploads.request.submit', 'Send request')
                    : t('uploads.request.submitLogin', 'Log in and send request')}
              </Button>
              {!user && status !== 'loading' && (
                <p className="text-xs text-center text-muted-foreground">
                  {t('uploads.request.loginHint', 'You’ll log in or create a free account first, so we can send you the quote.')}
                </p>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
