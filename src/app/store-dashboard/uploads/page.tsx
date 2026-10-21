'use client';

import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useTranslation } from '@/components/language-provider';
import { UploadRequestDetails, useFormatUploadDate } from '@/components/admin/upload-request-details';

export default function StoreUploadsPage() {
  const { user } = useSessionUser();
  const { t } = useTranslation();
  const formatDate = useFormatUploadDate();
  const { data: uploads, loading: uploadsLoading } = useUploads();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('uploads.owner.loginRequired', 'Please log in to view assigned uploads.')}</p>
      </div>
    );
  }

  if (user.role !== 'store-owner') {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">{t('uploads.common.accessDenied', 'Access denied')}</h1>
        <p className="text-muted-foreground mt-4">{t('uploads.store.ownersOnly', 'This page is only available for store owners.')}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('uploads.owner.title', 'Assigned print requests')}</CardTitle>
        <CardDescription>{t('uploads.owner.desc', 'Files an admin assigned to you.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('uploads.admin.colCustomer', 'Customer')}</TableHead>
              <TableHead>{t('uploads.admin.colRequest', 'Request')}</TableHead>
              <TableHead>{t('uploads.admin.colDate', 'Date')}</TableHead>
              <TableHead className="text-end">{t('uploads.owner.colDownload', 'Download')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-end"><Skeleton className="h-8 w-16 ms-auto" /></TableCell>
                </TableRow>
              ))
            ) : uploads && uploads.length > 0 ? (
              uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="align-top">
                    <div className="font-medium">{upload.userDisplayName || t('uploads.common.na', 'N/A')}</div>
                    <div className="text-xs text-muted-foreground break-all">{upload.userEmail}</div>
                    {upload.phoneNumber ? (
                      <div className="text-xs text-muted-foreground" dir="ltr">{upload.phoneNumber}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top min-w-[14rem]">
                    <UploadRequestDetails upload={upload} />
                  </TableCell>
                  <TableCell className="align-top">{formatDate(upload.createdAt)}</TableCell>
                  <TableCell className="text-end align-top">
                    <Button asChild variant="ghost" size="icon">
                      {/* Private file: the route checks the assignment and redirects to a 5-minute signed link. */}
                      <a href={`/api/uploads/${encodeURIComponent(upload.id)}/download`} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">
                          {t('uploads.admin.downloadAria', 'Download {file}', { file: upload.fileName })}
                        </span>
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  {t('uploads.owner.empty', 'No uploads assigned to you.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
