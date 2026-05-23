'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useSessionUser } from '@/hooks/use-session';
import { useNewsletterSubscriptions } from '@/hooks/use-data';

type NewsletterSubscription = {
    id: string;
    email: string;
    subscribedAt: {
        toDate: () => Date;
    }
}

export default function NewsletterAdminPage() {
    const { user } = useSessionUser();
    const { data: subscriptions, loading: subscriptionsLoading } = useNewsletterSubscriptions();

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Please log in to view newsletter subscribers.</p>
            </div>
        );
    }

    if (user.role !== 'admin') {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
                <p className="text-muted-foreground mt-4">You do not have permission to view this page.</p>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Newsletter Subscribers</CardTitle>
                <CardDescription>A list of all users who have subscribed to your newsletter.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email Address</TableHead>
                            <TableHead className="text-right">Subscription Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptionsLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-5 w-32 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : subscriptions && subscriptions.length > 0 ? (
                            subscriptions.map((subscription) => (
                                <TableRow key={subscription.id}>
                                    <TableCell className="font-medium">{subscription.email}</TableCell>
                                    <TableCell className="text-right">
                                        {subscription.subscribedAt
                                            ? (() => {
                                                const raw = typeof subscription.subscribedAt === 'object' && 'toDate' in subscription.subscribedAt
                                                    ? (subscription.subscribedAt as any).toDate()
                                                    : new Date(subscription.subscribedAt as any);
                                                const d = raw instanceof Date ? raw : new Date(raw);
                                                return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPp');
                                            })()
                                            : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No newsletter subscribers yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
