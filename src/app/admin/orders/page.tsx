'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Send } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSessionUser } from '@/hooks/use-session';
import { useOrders } from '@/hooks/use-data';
import type { Order } from '@/lib/types';

const OrderStatusSelector = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();

    const handleStatusChange = async (newStatus: Order['status']) => {
        await onUpdate(order.id, { status: newStatus });
        toast({
            title: 'Order Status Updated',
            description: `Order ${order.id.substring(0, 8)} is now ${newStatus}.`,
        });
    };

    return (
        <Select defaultValue={order.status} onValueChange={handleStatusChange as any}>
            <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Printing">Printing</SelectItem>
                <SelectItem value="Finished">Finished</SelectItem>
                <SelectItem value="Pooled">Pooled</SelectItem>
            </SelectContent>
        </Select>
    );
};

const ReleaseToPoolButton = ({ order, onRelease }: { order: Order; onRelease: (id: string) => Promise<any> }) => {
    const { toast } = useToast();

    const handleRelease = async () => {
        await onRelease(order.id);
        toast({
            title: 'Order Released to Pool',
            description: `Order has been made available for other store owners.`,
        });
    };

    return (
        <Button variant="outline" size="sm" onClick={handleRelease}>
            <Send className="mr-2 h-4 w-4" />
            Release to Pool
        </Button>
    )
}

const PredictedDateSelector = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(() => {
        if (!order.predictedFinishDate) return undefined;
        const raw = typeof order.predictedFinishDate === 'object' && 'toDate' in order.predictedFinishDate
            ? (order.predictedFinishDate as any).toDate()
            : new Date(order.predictedFinishDate as any);
        return isNaN(raw.getTime()) ? undefined : raw;
    });

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) return;
        setDate(selectedDate);
        onUpdate(order.id, { predictedFinishDate: selectedDate as any });
        toast({
            title: 'Predicted Date Set',
            description: `Finish date for order ${order.id.substring(0, 8)} updated.`,
        });
        setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Set finish date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

const PrioritizeSwitch = ({ order, onUpdate }: { order: Order; onUpdate: (id: string, patch: Partial<Order>) => Promise<any> }) => {
    const { toast } = useToast();

    const handlePrioritizeChange = async (isPrioritized: boolean) => {
        const newTotalAmount = isPrioritized ? order.totalAmount * 1.2 : order.totalAmount / 1.2;
        await onUpdate(order.id, { 
            isPrioritized,
            totalAmount: newTotalAmount
        });

        toast({
            title: `Order ${isPrioritized ? 'Prioritized' : 'Deprioritized'}`,
            description: `Price updated to $${newTotalAmount.toFixed(2)}.`,
        });
    }

    return (
        <div className="flex items-center space-x-2">
            <Switch 
                id={`prioritize-${order.id}`} 
                checked={order.isPrioritized || false}
                onCheckedChange={handlePrioritizeChange}
            />
            <Label htmlFor={`prioritize-${order.id}`}>Prioritize (+20%)</Label>
        </div>
    )
}

function OrdersList() {
    const { user } = useSessionUser();
    const baseFilter =
      user?.role === 'store-owner' && user?.id
        ? { ownerId: user.id, statusIn: ['Pending', 'Printing', 'Finished'] }
        : { statusIn: ['Pending', 'Printing', 'Finished'] };
    const { data: orders, loading: ordersLoading, updateOrder, releaseOrderToPool } = useOrders(baseFilter);

    if (ordersLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return orders && orders.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {orders.map((order) => (
                <AccordionItem value={order.id} key={order.id} className="bg-muted/50 rounded-lg">
                     <div className="flex items-center w-full flex-wrap gap-4 px-4 py-2">
                         <AccordionTrigger className="flex-1 hover:no-underline py-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-left">
                                <div>
                                    <span className="font-bold block sm:inline">Order: </span>
                                    <span className="font-mono text-xs text-muted-foreground">{order.id.substring(0, 8)}...</span>
                                </div>
                                <div>
                                    <span className="font-bold block sm:inline">Customer: </span>
                                    <span>{order.shippingAddress.fullName} ({order.customerEmail})</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-4 py-2" onClick={(e) => e.stopPropagation()}>
                            <OrderStatusSelector order={order} onUpdate={updateOrder} />
                            <span className="font-bold text-lg">${order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <AccordionContent className="px-4">
                        <div className="pt-4 border-t grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold mb-2">Items:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item) => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="flex items-center gap-2">
                                                    <Image src={item.imageUrl || 'https://placehold.co/40x40'} alt={item.name} width={40} height={40} className="rounded object-cover" />
                                                    <span>{item.name}</span>
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                             <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Shipping Details:</h4>
                                    <div className="text-sm bg-background p-4 rounded-md">
                                        <p><strong>Name:</strong> {order.shippingAddress.fullName}</p>
                                        <p><strong>Phone:</strong> {order.phoneNumber}</p>
                                        <p><strong>Address:</strong> {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Order Management:</h4>
                                    <div className="text-sm bg-background p-4 rounded-md space-y-4">
                                      <PredictedDateSelector order={order} onUpdate={updateOrder} />
                                      <PrioritizeSwitch order={order} onUpdate={updateOrder} />
                                      <ReleaseToPoolButton order={order} onRelease={releaseOrderToPool} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    ) : (
        <div className="text-center py-16">
            <p className="text-muted-foreground">No orders found.</p>
        </div>
    );
}

export default function OrdersAdminPage() {
    const { user } = useSessionUser();

    if (!user) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Please log in to view orders.</p>
            </div>
        )
    }

    if (user.role !== 'admin' && user.role !== 'store-owner') {
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
                <CardTitle>My Orders</CardTitle>
                <CardDescription>A list of all orders assigned to you or all orders if you're an admin.</CardDescription>
            </CardHeader>
            <CardContent>
                <OrdersList />
            </CardContent>
        </Card>
    );
}
