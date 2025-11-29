'use client';

import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useUploads } from '@/hooks/use-data';
import type { Upload } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

function DeleteUploadAlert({ upload, onDelete }: { upload: Upload; onDelete: (id: string) => Promise<boolean> }) {
  const { toast } = useToast();

  const handleDelete = async () => {
    const ok = await onDelete(upload.id);
    if (ok) {
      toast({ title: 'Upload Deleted', description: `${upload.fileName} has been removed.` });
    } else {
      toast({ variant: 'destructive', title: 'Delete failed', description: 'Could not delete upload.' });
    }
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
        <p className="text-muted-foreground">Please log in to view uploads.</p>
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
                  <TableHead>Assigned To</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(val) =>
                          setSelection((prev) => ({ ...prev, [upload.id]: val }))
                        }
                        value={selection[upload.id] ?? upload.assignedOwnerId ?? 'unassigned'}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {storeOwners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.name || owner.email}
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
                            toast({ title: 'Assignment saved' });
                          } else {
                            toast({ variant: 'destructive', title: 'Failed to assign upload' });
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={upload.downloadURL} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Link>
                      </Button>
                      <DeleteUploadAlert upload={upload} onDelete={deleteUpload} />
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
