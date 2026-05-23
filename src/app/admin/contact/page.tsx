'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { ContactSubmission } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSessionUser } from '@/hooks/use-session';
import { useContactSubmissions } from '@/hooks/use-data';

export default function ContactAdminPage() {
    const { user } = useSessionUser();
    const { data: submissions, loading: submissionsLoading } = useContactSubmissions();

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Please log in to view contact submissions.</p>
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
                <CardTitle>Contact Form Submissions</CardTitle>
                <CardDescription>A list of all messages received through your website's contact form.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Message</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissionsLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : submissions && submissions.length > 0 ? (
                            submissions.map((submission) => (
                                <TableRow key={submission.id}>
                                    <TableCell>
                                        {submission.createdAt
                                            ? (() => {
                                                const raw = typeof submission.createdAt === 'object' && 'toDate' in submission.createdAt
                                                    ? (submission.createdAt as any).toDate()
                                                    : new Date(submission.createdAt as any);
                                                const d = raw instanceof Date ? raw : new Date(raw);
                                                return isNaN(d.getTime()) ? 'N/A' : format(d, 'PPp');
                                            })()
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{submission.name}</div>
                                        <div className="text-xs text-muted-foreground">{submission.email}</div>
                                    </TableCell>
                                    <TableCell>{submission.subject}</TableCell>
                                    <TableCell className="text-right">
                                        <Accordion type="single" collapsible className="w-full">
                                          <AccordionItem value="item-1" className="border-none">
                                            <AccordionTrigger className="p-2 hover:no-underline justify-end">View</AccordionTrigger>
                                            <AccordionContent className="p-4 bg-muted rounded-md mt-2 text-left">
                                              <p className="whitespace-pre-wrap">{submission.message}</p>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    No contact submissions yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
