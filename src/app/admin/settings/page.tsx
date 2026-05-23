'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettings } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';

const settingsSchema = z.object({
  aboutHeroTitle: z.string().min(3, 'Hero title must be at least 3 characters'),
  aboutHeroSubtitle: z.string().min(5, 'Hero subtitle must be at least 5 characters'),
  aboutMissionTitle: z.string().min(3, 'Mission title must be at least 3 characters'),
  aboutMission: z.string().min(10, 'Mission statement must be at least 10 characters'),
  aboutContactTitle: z.string().min(3, 'Contact section title must be at least 3 characters'),
  aboutContact: z.string().min(10, 'Contact text must be at least 10 characters'),
  aboutContactCardTitle: z.string().min(3, 'Contact card title must be at least 3 characters'),
  footerBlurb: z.string().min(10, 'Footer blurb must be at least 10 characters'),
  facebookUrl: z.string().trim().url('Enter a valid Facebook URL').or(z.literal('')),
  instagramUrl: z.string().trim().url('Enter a valid Instagram URL').or(z.literal('')),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsAdminPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useSessionUser();
  const { data: settings, loading: settingsLoading, saveSettings } = useSiteSettings();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });
  
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

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    const ok = await saveSettings(data);
    if (ok) {
      toast({
        title: 'Settings Saved',
        description: 'Your website settings have been updated.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update settings.',
      });
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Please log in to manage settings.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (settingsLoading) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your store and website settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
            <div className="grid gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full" />
            </div>
             <div className="grid gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full" />
            </div>
             <Skeleton className="h-10 w-24" />
        </CardContent>
       </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your store and website settings. Changes will be live immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="aboutHeroTitle">About Page: Hero Title</Label>
            <Input id="aboutHeroTitle" {...register('aboutHeroTitle')} />
            {errors.aboutHeroTitle && <p className="text-xs text-destructive">{errors.aboutHeroTitle.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutHeroSubtitle">About Page: Hero Subtitle</Label>
            <Textarea id="aboutHeroSubtitle" {...register('aboutHeroSubtitle')} rows={2} />
            {errors.aboutHeroSubtitle && <p className="text-xs text-destructive">{errors.aboutHeroSubtitle.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutMissionTitle">About Page: Mission Section Title</Label>
            <Input id="aboutMissionTitle" {...register('aboutMissionTitle')} />
            {errors.aboutMissionTitle && <p className="text-xs text-destructive">{errors.aboutMissionTitle.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutMission">About Page: Mission Statement</Label>
            <Textarea id="aboutMission" {...register('aboutMission')} rows={4} />
            {errors.aboutMission && <p className="text-xs text-destructive">{errors.aboutMission.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutContactTitle">About Page: Contact Section Title</Label>
            <Input id="aboutContactTitle" {...register('aboutContactTitle')} />
            {errors.aboutContactTitle && <p className="text-xs text-destructive">{errors.aboutContactTitle.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutContact">About Page: Contact Intro Text</Label>
            <Textarea id="aboutContact" {...register('aboutContact')} rows={3} />
            {errors.aboutContact && <p className="text-xs text-destructive">{errors.aboutContact.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutContactCardTitle">About Page: Contact Card Title</Label>
            <Input id="aboutContactCardTitle" {...register('aboutContactCardTitle')} />
            {errors.aboutContactCardTitle && <p className="text-xs text-destructive">{errors.aboutContactCardTitle.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="footerBlurb">Footer Blurb</Label>
            <Textarea id="footerBlurb" {...register('footerBlurb')} rows={3} />
            {errors.footerBlurb && <p className="text-xs text-destructive">{errors.footerBlurb.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="facebookUrl">Facebook Link</Label>
            <Input id="facebookUrl" {...register('facebookUrl')} placeholder="https://www.facebook.com/yourpage" />
            {errors.facebookUrl && <p className="text-xs text-destructive">{errors.facebookUrl.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instagramUrl">Instagram Link</Label>
            <Input id="instagramUrl" {...register('instagramUrl')} placeholder="https://www.instagram.com/yourprofile" />
            {errors.instagramUrl && <p className="text-xs text-destructive">{errors.instagramUrl.message}</p>}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
