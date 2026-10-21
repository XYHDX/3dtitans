'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from "@/components/ui/alert-dialog"
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSessionUser, useUsers } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';



type PropUser = {
  id: string;
  email: string;
  displayName: string;
  emailVerified?: boolean;
  isPrioritizedStore?: boolean;
  role?: string;
  photoURL?: string | null;
};

type Role = 'user' | 'store-owner' | 'admin';

/**
 * PATCH /api/users/[id]. Returns the server's error message on failure (e.g.
 * "last admin", "can't change your own role"). Rows call this directly instead
 * of each mounting useUsers(), which re-fetched the whole user list per row.
 */
async function patchUser(id: string, body: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, message: data?.error };
  } catch {
    return { ok: false };
  }
}

function DeleteUserAlert({
  userId,
  userName,
  isSelf,
  onDelete,
}: {
  userId: string;
  userName: string;
  isSelf: boolean;
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await onDelete(userId);
      if (!result.ok) throw new Error(result.message || t('backend.users.deleteFailedBody', 'Unable to delete user.'));
      toast({
        title: t('backend.users.deleted', 'User deleted'),
        description: t('backend.users.deletedBody', '{name} has been permanently removed. Their orders were kept without their email.', { name: userName }),
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('backend.users.deleteFailed', 'Delete failed'), description: error?.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          disabled={isDeleting || isSelf}
          aria-label={t('backend.users.deleteUser', 'Delete user')}
          title={isSelf ? t('backend.users.cannotDeleteSelf', "You can't delete your own account.") : undefined}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('backend.users.confirmTitle', 'Are you absolutely sure?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('backend.users.confirmBody', 'This action is irreversible. It permanently deletes the account of "{name}", their products, stores and uploads, and signs them out everywhere. Their orders are kept for accounting, without their email.', { name: userName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('backend.common.cancel', 'Cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
            {isDeleting ? t('backend.users.deleting', 'Deleting…') : t('backend.users.deleteConfirm', 'Delete user permanently')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function VerificationSwitch({ user }: { user: PropUser }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  // Optimistic UI state
  const [isVerified, setIsVerified] = useState(user.emailVerified || false);

  const handleVerificationChange = async (verified: boolean) => {
    setIsVerified(verified); // Optimistically update the UI
    const result = await patchUser(user.id, { emailVerified: verified });
    if (result.ok) {
      toast({
        title: t('backend.users.updated', 'User updated'),
        description: verified
          ? t('backend.users.verifiedBody', '{name} is now verified.', { name: user.displayName })
          : t('backend.users.unverifiedBody', '{name} is no longer verified.', { name: user.displayName }),
      });
    } else {
      toast({
        variant: 'destructive',
        title: t('backend.users.updateFailed', 'Update failed'),
        description: result.message || t('backend.users.verifyFailed', 'Could not update verification.'),
      });
      setIsVerified(!verified);
    }
  };

  return (
    <Switch
      checked={isVerified}
      onCheckedChange={handleVerificationChange}
      aria-label={t('backend.users.verifiedLabel', 'Email verified for {name}', { name: user.displayName })}
    />
  );
}

function PrioritySwitch({ user }: { user: PropUser }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isPrioritized, setIsPrioritized] = useState(!!user.isPrioritizedStore);

  const handleChange = async (value: boolean) => {
    setIsPrioritized(value);
    const result = await patchUser(user.id, { isPrioritizedStore: value });
    if (result.ok) {
      toast({
        title: t('backend.users.priorityUpdated', 'Priority updated'),
        description: value
          ? t('backend.users.prioritizedBody', '{name} is now prioritized on the home page.', { name: user.displayName })
          : t('backend.users.unprioritizedBody', '{name} is no longer prioritized on the home page.', { name: user.displayName }),
      });
    } else {
      setIsPrioritized(!value);
      toast({
        variant: 'destructive',
        title: t('backend.users.updateFailed', 'Update failed'),
        description: result.message || t('backend.users.priorityFailed', 'Could not update store priority.'),
      });
    }
  };

  return (
    <Switch
      checked={isPrioritized}
      onCheckedChange={handleChange}
      disabled={user.role !== 'store-owner'}
      aria-label={t('backend.users.priorityLabel', 'Prioritized store: {name}', { name: user.displayName })}
    />
  );
}


function RoleSelector({ user, isSelf }: { user: PropUser; isSelf: boolean }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>((user.role as Role) || 'user');
  const [busy, setBusy] = useState(false);
  useEffect(() => setRole((user.role as Role) || 'user'), [user.role]);

  const roleLabel = (r: Role) =>
    r === 'admin' ? t('backend.users.roleAdmin', 'Admin') : r === 'store-owner' ? t('backend.users.roleOwner', 'Store owner') : t('backend.users.roleUser', 'User');

  const handleRoleChange = async (newRole: Role) => {
    const previous = role;
    setRole(newRole);
    setBusy(true);
    const result = await patchUser(user.id, { role: newRole });
    setBusy(false);
    if (result.ok) {
      toast({
        title: t('backend.users.roleUpdated', 'Role updated'),
        description: t('backend.users.roleUpdatedBody', "{name}'s role is now {role}. Their current sessions were signed out.", {
          name: user.displayName,
          role: roleLabel(newRole),
        }),
      });
    } else {
      setRole(previous);
      toast({
        variant: 'destructive',
        title: t('backend.users.updateFailed', 'Update failed'),
        description: result.message || t('backend.users.roleFailed', 'Could not update role.'),
      });
    }
  };

  return (
    <Select value={role} disabled={busy || isSelf} onValueChange={(value: Role) => handleRoleChange(value)}>
      <SelectTrigger className="w-[140px]" aria-label={t('backend.users.roleFor', 'Role for {name}', { name: user.displayName })}>
        <SelectValue placeholder={t('backend.users.selectRole', 'Select role')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">{roleLabel('user')}</SelectItem>
        <SelectItem value="store-owner">{roleLabel('store-owner')}</SelectItem>
        <SelectItem value="admin">{roleLabel('admin')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function UsersAdminPage() {
  const { data: users, loading: usersLoading, deleteUser } = useUsers();
  const { user: me } = useSessionUser();
  const { t } = useTranslation();

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('backend.users.title', 'User management')}</CardTitle>
        <CardDescription>
          {t('backend.users.description', 'View and manage user roles and verification status. You cannot change your own role or delete your own account, and the last admin cannot be removed.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('backend.users.colUser', 'User')}</TableHead>
              <TableHead>{t('backend.users.colRole', 'Role')}</TableHead>
              <TableHead>{t('backend.users.colVerified', 'Verified')}</TableHead>
              <TableHead>{t('backend.users.colPrioritized', 'Prioritized store')}</TableHead>
              <TableHead className="text-end">{t('backend.users.colManage', 'Manage')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className='space-y-1'><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-end"><Skeleton className="h-8 w-20 ms-auto" /></TableCell>
                </TableRow>
              ))
            ) : users && users.length > 0 ? (
              users.map((user) => {
                const isSelf = !!me?.id && me.id === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>
                            {getInitials(user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'store-owner' ? 'default' : 'secondary'}>
                        {user.role === 'admin'
                          ? t('backend.users.roleAdmin', 'Admin')
                          : user.role === 'store-owner'
                            ? t('backend.users.roleOwner', 'Store owner')
                            : t('backend.users.roleUser', 'User')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <VerificationSwitch user={user} />
                    </TableCell>
                    <TableCell>
                      <PrioritySwitch user={user} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className='flex items-center justify-end'>
                        <RoleSelector user={user} isSelf={isSelf} />
                        <DeleteUserAlert userId={user.id} userName={user.displayName} isSelf={isSelf} onDelete={deleteUser} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  {t('backend.users.none', 'No users found.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {users && users.length >= 1000 && (
          <p className="text-xs text-muted-foreground pt-4">{t('backend.users.truncated', 'Showing the newest 1000 users.')}</p>
        )}
      </CardContent>
    </Card>
  );
}
