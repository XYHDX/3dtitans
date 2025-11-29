'use client';

import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function StoreUploadsPage() {
  const { user } = useSessionUser();
  const { data: uploads, loading: uploadsLoading } = useUploads();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Please log in to view assigned uploads.</p>
      </div>
    );
  }

  if (user.role !== 'store-owner') {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-4">This page is only for store owners.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Uploads</CardTitle>
        <CardDescription>Files assigned to you by an admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Date Uploaded</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : uploads && uploads.length > 0 ? (
              uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>
                    <div className="font-medium">{upload.userDisplayName || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{upload.userEmail}</div>
                  </TableCell>
                  <TableCell>{upload.fileName}</TableCell>
                  <TableCell>
                    {upload.createdAt
                      ? (() => {
                          const raw = typeof upload.createdAt === 'object' && 'toDate' in upload.createdAt
                            ? (upload.createdAt as any).toDate()
                            : new Date(upload.createdAt as any);
                          const d = raw instanceof Date ? raw : new Date(raw);
                          return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPP');
                        })()
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={upload.downloadURL} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No uploads assigned to you.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
