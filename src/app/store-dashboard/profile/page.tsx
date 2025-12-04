'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useStores } from '@/hooks/use-data';
import { useSessionUser } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';

type FormState = {
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  websiteUrl: string;
};

const defaultState: FormState = {
  name: '',
  slug: '',
  bio: '',
  avatarUrl: '',
  coverUrl: '',
  websiteUrl: '',
};

function initials(name: string) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function StoreProfilePage() {
  const { user } = useSessionUser();
  const { toast } = useToast();
  const { data: stores, loading, createStore, updateStore } = useStores(
    user?.role === 'store-owner' && user.id
      ? { ownerId: user.id, includeUnpublished: true }
      : undefined,
    { skipFetch: !user?.id }
  );
  const [form, setForm] = useState<FormState>(defaultState);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const store = useMemo(() => (stores && stores.length > 0 ? stores[0] : null), [stores]);

  useEffect(() => {
    if (!user || loading) return;
    if (store) {
      setForm({
        name: store.name || '',
        slug: store.slug || '',
        bio: store.bio || '',
        avatarUrl: store.avatarUrl || '',
        coverUrl: store.coverUrl || '',
        websiteUrl: store.websiteUrl || '',
      });
    } else {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.displayName || '',
        slug: prev.slug || (user.displayName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      }));
    }
  }, [loading, store, user]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    let nextAvatarUrl = form.avatarUrl.trim();
    let nextCoverUrl = form.coverUrl.trim();

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      bio: form.bio.trim(),
      avatarUrl: form.avatarUrl.trim(),
      coverUrl: form.coverUrl.trim(),
      websiteUrl: form.websiteUrl.trim(),
    };

    try {
      if ((avatarFile || coverFile) && !supabase) {
        throw new Error('Storage is not configured');
      }

      if (avatarFile && supabase) {
        const ext = avatarFile.name.split('.').pop();
        const path = `stores/${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(path, avatarFile, { cacheControl: '3600', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
        nextAvatarUrl = publicUrl?.publicUrl || nextAvatarUrl;
      }

      if (coverFile && supabase) {
        const ext = coverFile.name.split('.').pop();
        const path = `stores/${user.id}/cover-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(path, coverFile, { cacheControl: '3600', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
        nextCoverUrl = publicUrl?.publicUrl || nextCoverUrl;
      }

      payload.avatarUrl = nextAvatarUrl;
      payload.coverUrl = nextCoverUrl;

      const result = store
        ? await updateStore(store.slug, payload)
        : await createStore(payload);

      if (!result) {
        toast({ title: 'Could not save store', variant: 'destructive' });
      } else {
        toast({ title: 'Store profile saved' });
        setAvatarFile(null);
        setCoverFile(null);
        setForm((prev) => ({ ...prev, avatarUrl: payload.avatarUrl, coverUrl: payload.coverUrl }));
      }
    } catch (error) {
      console.error('Failed to save store', error);
      const message = (error as any)?.message || 'Could not save store';
      toast({ title: 'Could not save store', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Please log in</CardTitle>
            <CardDescription>You need to be logged in as a store owner to edit your store profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user.role !== 'store-owner') {
    return (
      <div className="max-w-xl mx-auto mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>This page is only available for store owners.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Profile</h1>
        <p className="text-muted-foreground">
          Control how your store appears on the marketplace. Add a profile photo, cover, bio, and website link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public details</CardTitle>
          <CardDescription>These details appear on your store page and in the store directory.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store name</Label>
                <Input id="name" value={form.name} onChange={handleChange('name')} placeholder="My Studio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={handleChange('slug')}
                  placeholder="my-studio"
                />
                <p className="text-xs text-muted-foreground">Used in the URL: /stores/{form.slug || 'your-slug'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={handleChange('bio')}
                placeholder="Tell customers what you make, your style, and what makes your store unique."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Profile photo URL</Label>
                <Input
                  id="avatarUrl"
                  value={form.avatarUrl}
                  onChange={handleChange('avatarUrl')}
                  placeholder="https://"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverUrl">Cover image URL</Label>
                <Input
                  id="coverUrl"
                  value={form.coverUrl}
                  onChange={handleChange('coverUrl')}
                  placeholder="https://"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website</Label>
              <Input
                id="websiteUrl"
                value={form.websiteUrl}
                onChange={handleChange('websiteUrl')}
                placeholder="https://your-portfolio.com"
              />
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={form.avatarUrl || undefined} alt={form.name || 'Store avatar'} />
                <AvatarFallback>{initials(form.name)}</AvatarFallback>
              </Avatar>
              <Badge variant={store?.isPublished ? 'default' : 'secondary'}>
                {store?.isPublished ? 'Published' : 'Draft'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {store?.isPublished
                  ? 'Your store is live in the directory.'
                  : 'Publish will be reviewed by the team.'}
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
