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
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUsers } from '@/hooks/use-session';


function DeleteUserAlert({ userId, userName }: { userId: string, userName: string }) {
    const { toast } = useToast();
    const { deleteUser } = useUsers();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const ok = await deleteUser(userId);
            if (!ok) throw new Error('Delete failed');
            toast({ title: 'User Deleted', description: `${userName} has been permanently removed.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Unable to delete user.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action is irreversible. This will permanently delete the user account for "{userName}", including their authentication record and all associated data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Delete User Permanently'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function VerificationSwitch({ user }: { user: UserProfile & { id: string }}) {
  const { toast } = useToast();
  const { updateUserVerification } = useUsers();
  // Optimistic UI state
  const [isVerified, setIsVerified] = useState(user.emailVerified || false);

  const handleVerificationChange = async (verified: boolean) => {
    setIsVerified(verified); // Optimistically update the UI
    const ok = await updateUserVerification(user.id, verified);
    if (ok) {
      toast({
        title: 'User Updated',
        description: `${user.displayName} has been ${verified ? 'verified' : 'unverified'}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update verification.',
      });
      setIsVerified(!verified);
    }
  };

  return (
      <Switch
        checked={isVerified}
        onCheckedChange={handleVerificationChange}
      />
  );
}


function RoleSelector({ user }: { user: UserProfile & { id: string } }) {
  const { toast } = useToast();
  const { updateUserRole } = useUsers();

  const handleRoleChange = async (newRole: 'user' | 'store-owner' | 'admin') => {
    const ok = await updateUserRole(user.id, newRole);
    if (ok) {
      toast({
        title: 'Role Updated',
        description: `${user.displayName}'s role has been changed to ${newRole}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update role.',
      });
    }
  };

  return (
    <Select
      defaultValue={user.role || 'user'}
      onValueChange={(value: 'user' | 'store-owner' | 'admin') => handleRoleChange(value)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">User</SelectItem>
        <SelectItem value="store-owner">Store Owner</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function UsersAdminPage() {
  const { data: users, loading: usersLoading } = useUsers();

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage user roles and verification status across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                       <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className='space-y-1'><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
                       <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                       <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                       <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                   </TableRow>
               ))
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.photoURL} />
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
                      {user.role || 'user'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <VerificationSwitch user={user} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className='flex items-center justify-end'>
                      <RoleSelector user={user} />
                      <DeleteUserAlert userId={user.id} userName={user.displayName} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
