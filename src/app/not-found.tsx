
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <h1 className="text-9xl font-headline font-bold text-primary">404</h1>
            <h2 className="text-3xl font-bold mt-4 mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <div className="flex gap-4">
                <Button asChild>
                    <Link href="/">Back to Home</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/contact">Contact Support</Link>
                </Button>
            </div>
        </div>
    );
}
