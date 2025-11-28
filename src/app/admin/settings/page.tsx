'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettings } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';

const settingsSchema = z.object({
  aboutMission: z.string().min(10, 'Mission statement must be at least 10 characters'),
  aboutContact: z.string().min(10, 'Contact text must be at least 10 characters'),
  footerBlurb: z.string().min(10, 'Footer blurb must be at least 10 characters'),
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
        aboutMission: settings.aboutMission || '',
        aboutContact: settings.aboutContact || '',
        footerBlurb: settings.footerBlurb || '',
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
            <Label htmlFor="aboutMission">About Page: Mission Statement</Label>
            <Textarea id="aboutMission" {...register('aboutMission')} rows={4} />
            {errors.aboutMission && <p className="text-xs text-destructive">{errors.aboutMission.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aboutContact">About Page: "Get in Touch" Text</Label>
            <Textarea id="aboutContact" {...register('aboutContact')} rows={3} />
            {errors.aboutContact && <p className="text-xs text-destructive">{errors.aboutContact.message}</p>}
          </div>
          
           <div className="grid gap-2">
            <Label htmlFor="footerBlurb">Footer Blurb</Label>
            <Textarea id="footerBlurb" {...register('footerBlurb')} rows={3} />
            {errors.footerBlurb && <p className="text-xs text-destructive">{errors.footerBlurb.message}</p>}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
