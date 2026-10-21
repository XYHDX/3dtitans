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
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/components/language-provider';
import { DirectUploadError, uploadErrorMessage, uploadFileDirect } from '@/lib/supabase/direct-upload';
import { acceptAttribute, allowedExtension, maxMegabytes, UPLOAD_KINDS } from '@/lib/supabase/upload-kinds';

type FormState = {
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  websiteUrl: string;
  isPublished: boolean;
};

const defaultState: FormState = {
  name: '',
  slug: '',
  bio: '',
  avatarUrl: '',
  coverUrl: '',
  websiteUrl: '',
  isPublished: false,
};

const IMAGE_ACCEPT = acceptAttribute('image');

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
  const { t } = useTranslation();
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
  const [fileError, setFileError] = useState<{ avatar?: string; cover?: string }>({});

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
        isPublished: !!store.isPublished,
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

  /** Validate a picked image (same rules as the server) before accepting it. */
  const pickImage = (which: 'avatar' | 'cover', file: File | null, input: HTMLInputElement) => {
    const setFile = which === 'avatar' ? setAvatarFile : setCoverFile;
    if (!file) {
      setFile(null);
      setFileError((prev) => ({ ...prev, [which]: undefined }));
      return;
    }
    let error: string | undefined;
    if (!allowedExtension('image', file.name)) {
      error = t('uploads.err.badType', 'This file type is not accepted. Allowed: {types}.', {
        types: UPLOAD_KINDS.image.extensions.join(' '),
      });
    } else if (file.size > UPLOAD_KINDS.image.maxBytes) {
      error = t('uploads.err.tooLarge', 'This file is too large. The maximum is {size} MB.', { size: maxMegabytes('image') });
    }
    if (error) {
      input.value = '';
      setFile(null);
    } else {
      setFile(file);
    }
    setFileError((prev) => ({ ...prev, [which]: error }));
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
      isPublished: form.isPublished,
    };

    try {
      // Images go straight to the product-images bucket through signed upload
      // URLs issued by /api/storage/upload-url (store owners/admins only).
      if (avatarFile) {
        nextAvatarUrl = (await uploadFileDirect(avatarFile, 'image')).url;
      }
      if (coverFile) {
        nextCoverUrl = (await uploadFileDirect(coverFile, 'image')).url;
      }

      payload.avatarUrl = nextAvatarUrl;
      payload.coverUrl = nextCoverUrl;

      const result = store
        ? await updateStore(store.slug, payload)
        : await createStore(payload);

      if (!result) {
        toast({ title: t('uploads.store.saveFailed', 'Could not save the store'), variant: 'destructive' });
      } else {
        toast({ title: t('uploads.store.saved', 'Store profile saved') });
        setAvatarFile(null);
        setCoverFile(null);
        setForm((prev) => ({ ...prev, avatarUrl: payload.avatarUrl, coverUrl: payload.coverUrl }));
      }
    } catch (error) {
      console.error('Failed to save store', error);
      const message =
        error instanceof DirectUploadError
          ? uploadErrorMessage(error, t, 'image')
          : t('uploads.products.genericError', 'Something went wrong. Please try again.');
      toast({ title: t('uploads.store.saveFailed', 'Could not save the store'), description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-16">
        <Card>
          <CardHeader>
            <CardTitle>{t('uploads.store.loginTitle', 'Please log in')}</CardTitle>
            <CardDescription>
              {t('uploads.store.loginDesc', 'You need to be logged in as a store owner to edit your store profile.')}
            </CardDescription>
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
            <CardTitle>{t('uploads.common.accessDenied', 'Access denied')}</CardTitle>
            <CardDescription>{t('uploads.store.ownersOnly', 'This page is only available for store owners.')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const imageHint = t('uploads.store.imageHint', 'JPG, PNG or WEBP, up to {size} MB.', { size: maxMegabytes('image') });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('uploads.store.title', 'Store profile')}</h1>
        <p className="text-muted-foreground">
          {t('uploads.store.subtitle', 'Control how your store appears on the marketplace. Add a profile photo, cover, bio, and website link.')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('uploads.store.publicTitle', 'Public details')}</CardTitle>
          <CardDescription>
            {t('uploads.store.publicDesc', 'These details appear on your store page and in the store directory.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('uploads.store.name', 'Store name')}</Label>
                <Input id="name" value={form.name} onChange={handleChange('name')} placeholder={t('uploads.store.namePlaceholder', 'My Studio')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t('uploads.store.slug', 'Slug')}</Label>
                <Input
                  id="slug"
                  dir="ltr"
                  value={form.slug}
                  onChange={handleChange('slug')}
                  placeholder="my-studio"
                />
                <p className="text-xs text-muted-foreground">
                  {t('uploads.store.slugHint', 'Used in the URL: {url}', { url: `/stores/${form.slug || 'your-slug'}` })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('uploads.store.bio', 'Short bio')}</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={handleChange('bio')}
                placeholder={t('uploads.store.bioPlaceholder', 'Tell customers what you make, your style, and what makes your store unique.')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">{t('uploads.store.avatarUrl', 'Profile photo URL')}</Label>
                <Input
                  id="avatarUrl"
                  dir="ltr"
                  value={form.avatarUrl}
                  onChange={handleChange('avatarUrl')}
                  placeholder="https://"
                />
                <Label htmlFor="avatarFile" className="text-xs">
                  {t('uploads.store.avatarFile', 'Or upload a profile photo')}
                </Label>
                <Input
                  id="avatarFile"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  aria-describedby="avatarFile-hint"
                  aria-invalid={!!fileError.avatar}
                  onChange={(e) => pickImage('avatar', e.target.files?.[0] || null, e.target)}
                />
                <p
                  id="avatarFile-hint"
                  className={`text-xs ${fileError.avatar ? 'text-destructive' : 'text-muted-foreground'}`}
                  role={fileError.avatar ? 'alert' : undefined}
                >
                  {fileError.avatar || imageHint}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverUrl">{t('uploads.store.coverUrl', 'Cover image URL')}</Label>
                <Input
                  id="coverUrl"
                  dir="ltr"
                  value={form.coverUrl}
                  onChange={handleChange('coverUrl')}
                  placeholder="https://"
                />
                <Label htmlFor="coverFile" className="text-xs">
                  {t('uploads.store.coverFile', 'Or upload a cover image')}
                </Label>
                <Input
                  id="coverFile"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  aria-describedby="coverFile-hint"
                  aria-invalid={!!fileError.cover}
                  onChange={(e) => pickImage('cover', e.target.files?.[0] || null, e.target)}
                />
                <p
                  id="coverFile-hint"
                  className={`text-xs ${fileError.cover ? 'text-destructive' : 'text-muted-foreground'}`}
                  role={fileError.cover ? 'alert' : undefined}
                >
                  {fileError.cover || imageHint}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">{t('uploads.store.website', 'Website')}</Label>
              <Input
                id="websiteUrl"
                dir="ltr"
                value={form.websiteUrl}
                onChange={handleChange('websiteUrl')}
                placeholder="https://your-portfolio.com"
              />
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={form.avatarUrl || undefined} alt={form.name || t('uploads.store.avatarAlt', 'Store avatar')} />
                <AvatarFallback>{initials(form.name)}</AvatarFallback>
              </Avatar>
              <Badge variant={store?.isPublished ? 'default' : 'secondary'}>
                {store?.isPublished ? t('uploads.store.published', 'Published') : t('uploads.store.draft', 'Draft')}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {store?.isPublished
                  ? t('uploads.store.liveNote', 'Your store is live in the directory.')
                  : t('uploads.store.reviewNote', 'Publishing will be reviewed by the team.')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isPublished"
                checked={form.isPublished}
                onCheckedChange={(val) => setForm((prev) => ({ ...prev, isPublished: val }))}
              />
              <Label htmlFor="isPublished" className="text-sm">
                {form.isPublished ? t('uploads.store.published', 'Published') : t('uploads.store.draft', 'Draft')}{' '}
                {t('uploads.store.toggleHint', '(toggle to publish/unpublish)')}
              </Label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving
                  ? avatarFile || coverFile
                    ? t('uploads.store.uploading', 'Uploading images...')
                    : t('uploads.common.saving', 'Saving...')
                  : t('uploads.store.save', 'Save profile')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
