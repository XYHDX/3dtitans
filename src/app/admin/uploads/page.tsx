'use client';

import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';
import type { Upload } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/use-session';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from '@/components/language-provider';
import { UploadRequestDetails, uploadReference, useFormatUploadDate } from '@/components/admin/upload-request-details';

function DeleteUploadAlert({ upload, onDelete }: { upload: Upload; onDelete: (id: string) => Promise<boolean> }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDelete = async () => {
    const ok = await onDelete(upload.id);
    if (ok) {
      toast({
        title: t('uploads.admin.deletedTitle', 'Upload deleted'),
        description: t('uploads.admin.deletedDesc', '{file} has been removed.', { file: upload.fileName }),
      });
    } else {
      toast({
        variant: 'destructive',
        title: t('uploads.common.deleteFailed', 'Delete failed'),
        description: t('uploads.admin.deleteFailedDesc', 'Could not delete the upload.'),
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={t('uploads.admin.deleteAria', 'Delete upload {ref}', { ref: uploadReference(upload.id) })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('uploads.common.confirmTitle', 'Are you absolutely sure?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('uploads.admin.deleteConfirm', 'This cannot be undone. The upload record for "{file}" will be permanently deleted.', {
              file: upload.fileName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('uploads.common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            {t('uploads.common.delete', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UploadsAdminPage() {
  const { user } = useSessionUser();
  const { t } = useTranslation();
  const formatDate = useFormatUploadDate();
  const { data: uploads, loading: uploadsLoading, deleteUpload, assignUpload } = useUploads();
  const { data: users } = useUsers();
  const storeOwners = useMemo(
    () => (users || []).filter((u) => u.role === 'store-owner'),
    [users]
  );
  const [selection, setSelection] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    const defaults: Record<string, string> = {};
    (uploads || []).forEach((u) => {
      defaults[u.id] = u.assignedOwnerId || 'unassigned';
    });
    setSelection(defaults);
  }, [uploads]);

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('uploads.admin.loginRequired', 'Please log in to view uploads.')}</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">{t('uploads.common.accessDenied', 'Access denied')}</h1>
        <p className="text-muted-foreground mt-4">{t('uploads.common.noPermission', 'You do not have permission to view this page.')}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('uploads.admin.title', 'Print requests')}</CardTitle>
        <CardDescription>{t('uploads.admin.desc', 'Files customers sent for a printing quote.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('uploads.admin.colCustomer', 'Customer')}</TableHead>
              <TableHead>{t('uploads.admin.colRequest', 'Request')}</TableHead>
              <TableHead>{t('uploads.admin.colDate', 'Date')}</TableHead>
              <TableHead>{t('uploads.admin.colAssigned', 'Assigned to')}</TableHead>
              <TableHead className="text-end">{t('uploads.admin.colActions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className='space-y-1'><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell className="text-end"><div className='flex justify-end gap-2'><Skeleton className="h-8 w-8 ms-auto" /><Skeleton className="h-8 w-8" /></div></TableCell>
                </TableRow>
              ))
            ) : uploads && uploads.length > 0 ? (
              uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{upload.userDisplayName || t('uploads.common.na', 'N/A')}</div>
                    <div className="text-xs text-muted-foreground break-all">{upload.userEmail}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{upload.phoneNumber}</div>
                  </TableCell>
                  <TableCell className="align-top min-w-[14rem]">
                    <UploadRequestDetails upload={upload} />
                  </TableCell>
                  <TableCell className="align-top">{formatDate(upload.createdAt)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(val) =>
                          setSelection((prev) => ({ ...prev, [upload.id]: val }))
                        }
                        value={selection[upload.id] ?? upload.assignedOwnerId ?? 'unassigned'}
                      >
                        <SelectTrigger
                          className="w-[220px]"
                          aria-label={t('uploads.admin.assignAria', 'Assign {ref} to a store owner', { ref: uploadReference(upload.id) })}
                        >
                          <SelectValue placeholder={t('uploads.admin.unassigned', 'Unassigned')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t('uploads.admin.unassigned', 'Unassigned')}</SelectItem>
                          {storeOwners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.displayName || owner.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={selection[upload.id] === (upload.assignedOwnerId || 'unassigned')}
                        onClick={async () => {
                          const val = selection[upload.id] ?? 'unassigned';
                          const ok = await assignUpload(upload.id, val === 'unassigned' ? null : val);
                          if (ok) {
                            toast({ title: t('uploads.admin.assignSaved', 'Assignment saved') });
                          } else {
                            toast({ variant: 'destructive', title: t('uploads.admin.assignFailed', 'Could not assign the upload') });
                          }
                        }}
                      >
                        {t('uploads.common.save', 'Save')}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-end align-top">
                    <div className="flex justify-end items-center">
                      {/* Private file: the route checks access and redirects to a 5-minute signed link. */}
                      <a
                        href={`/api/uploads/${encodeURIComponent(upload.id)}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">
                          {t('uploads.admin.downloadAria', 'Download {file}', { file: upload.fileName })}
                        </span>
                      </a>
                      <DeleteUploadAlert upload={upload} onDelete={deleteUpload} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  {t('uploads.admin.empty', 'No uploads found.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
