'use client';
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/use-data";
import { useTranslation } from "@/components/language-provider";
import { WhatsAppIcon } from "@/components/whatsapp-button";
import { localizedSetting, whatsappHref } from "@/lib/site-settings-shared";
import { track } from "@/lib/analytics";

type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot (M-10): hidden from people; bots that fill it are dropped by the API. */
  website?: string;
};

export default function AboutPage() {
  const { data: settings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, locale } = useTranslation();

  // Admin texts per language (…Ar fields for Arabic); translated defaults otherwise.
  const heroTitle = localizedSetting(settings, 'aboutHeroTitle', locale) || t('about.defaultHeroTitle');
  const heroSubtitle = localizedSetting(settings, 'aboutHeroSubtitle', locale) || t('about.defaultHeroSubtitle');
  const missionTitle = localizedSetting(settings, 'aboutMissionTitle', locale) || t('about.defaultMissionTitle');
  const missionBody = localizedSetting(settings, 'aboutMission', locale) || t('about.defaultMission');
  const contactTitle = localizedSetting(settings, 'aboutContactTitle', locale) || t('about.defaultContactTitle');
  const contactBody = localizedSetting(settings, 'aboutContact', locale) || t('about.defaultContact');
  const contactCardTitle = localizedSetting(settings, 'aboutContactCardTitle', locale) || t('about.defaultContactCard');
  const waHref = whatsappHref(settings?.whatsappNumber, t('whatsapp.prefill'));

  // Limits match the API (src/app/api/contact/route.ts).
  const contactSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('about.form.errors.name')).max(100, t('about.form.errors.tooLong')),
        email: z.string().trim().email(t('about.form.errors.email')).max(254, t('about.form.errors.tooLong')),
        subject: z.string().trim().min(3, t('about.form.errors.subject')).max(200, t('about.form.errors.tooLong')),
        message: z.string().trim().min(10, t('about.form.errors.message')).max(5000, t('about.form.errors.tooLong')),
        website: z.string().optional(),
      }),
    [t]
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 429) {
        toast({ variant: 'destructive', title: t('about.form.failedTitle'), description: t('about.form.tooMany') });
        return;
      }
      if (!res.ok) throw new Error('Could not submit contact form');
      track('generate_lead', { lead_type: 'contact' });
      toast({ title: t('about.form.sentTitle'), description: t('about.form.sentDesc') });
      reset();
    } catch {
      toast({ variant: 'destructive', title: t('about.form.failedTitle'), description: t('about.form.failedDesc') });
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (message?: string) =>
    message ? <p className="text-xs font-semibold text-destructive" role="alert">{message}</p> : null;

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="font-headline text-3xl md:text-5xl">{heroTitle}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{heroSubtitle}</p>
      </div>

      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="font-headline text-2xl md:text-4xl text-center mb-8">{missionTitle}</h2>
        <p className="text-lg text-muted-foreground text-center whitespace-pre-line">
          {missionBody}
        </p>
      </div>

      <section id="contact" aria-labelledby="contact-title" className="bg-card p-6 md:p-12 border-[3px] border-foreground scroll-mt-24">
        <h2 id="contact-title" className="font-headline text-2xl md:text-4xl text-center mb-8">{contactTitle}</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto whitespace-pre-line">
          {contactBody}
        </p>
        {waHref && (
          <div className="flex justify-center mb-8">
            <Button asChild variant="outline" size="lg">
              <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={() => track('generate_lead', { lead_type: 'contact' })}>
                <WhatsAppIcon className="h-5 w-5" />
                {t('about.whatsappCta')}
              </a>
            </Button>
          </div>
        )}
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>{contactCardTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="relative grid gap-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="name">{t('about.form.name')}</Label>
                <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
                {fieldError(errors.name?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t('about.form.email')}</Label>
                <Input id="email" type="email" dir="ltr" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
                {fieldError(errors.email?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">{t('about.form.subject')}</Label>
                <Input id="subject" aria-invalid={!!errors.subject} {...register('subject')} />
                {fieldError(errors.subject?.message)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">{t('about.form.message')}</Label>
                <Textarea id="message" rows={5} aria-invalid={!!errors.message} {...register('message')} />
                {fieldError(errors.message?.message)}
              </div>
              {/* Honeypot: off-screen and hidden from assistive tech; people never fill it. */}
              <div aria-hidden="true" className="absolute -start-[10000px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="contact-website">{t('form.honeypotLabel')}</label>
                <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? t('about.form.sending') : t('about.form.send')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
