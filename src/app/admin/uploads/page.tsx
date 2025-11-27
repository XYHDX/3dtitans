'use client';

import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';
import { useAppStore } from '@/lib/app-store';
import type { Upload } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

function DeleteUploadAlert({ upload }: { upload: Upload }) {
  const { toast } = useToast();
  const deleteUpload = useAppStore((s) => s.deleteUpload);

  const handleDelete = async () => {
    deleteUpload(upload.id);
    toast({ title: 'Upload Deleted', description: `${upload.fileName} has been removed.` });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the upload record for "{upload.fileName}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UploadsAdminPage() {
  const { user } = useSessionUser();
  const { data: uploads, loading: uploadsLoading } = useUploads();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Please log in to view uploads.</p>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'store-owner') {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Uploads</CardTitle>
        <CardDescription>A list of all files uploaded by users for printing quotes.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Date Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className='space-y-1'><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><div className='flex justify-end gap-2'><Skeleton className="h-8 w-8 ml-auto" /><Skeleton className="h-8 w-8" /></div></TableCell>
                </TableRow>
              ))
            ) : uploads && uploads.length > 0 ? (
              uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>
                    <div className="font-medium">{upload.userDisplayName || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{upload.userEmail}</div>
                    <div className="text-xs text-muted-foreground">{upload.phoneNumber}</div>
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
                    <div className="flex justify-end items-center">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={upload.downloadURL} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Link>
                      </Button>
                      <DeleteUploadAlert upload={upload} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No uploads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
