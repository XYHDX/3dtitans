
'use client';

import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSessionUser } from '@/hooks/use-session';
import { useProducts, useOrders } from '@/hooks/use-data';
import { useTranslation } from '@/components/language-provider';

type AddressFormData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
};


export default function CheckoutPage() {
  const { cart, clearCart, total } = useCart();
  const { user } = useSessionUser();
  const { data: products } = useProducts();
  const { createOrder } = useOrders(undefined, { skipFetch: true });
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const addressSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(3, t('checkout.errors.fullName')),
        email: z.string().email(t('checkout.errors.email')),
        phoneNumber: z.string().min(10, t('checkout.errors.phone')),
        addressLine1: z.string().min(5, t('checkout.errors.address')),
        city: z.string().min(2, t('checkout.errors.city')),
        postalCode: z.string().min(4, t('checkout.errors.postalCode')),
        country: z.string().min(2, t('checkout.errors.country')),
      }),
    [t]
  );

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  useEffect(() => {
    if (user) {
        setValue('fullName', user.displayName || '');
        setValue('email', user.email || '');
    }
  }, [user, setValue]);

  const handlePlaceOrder = async (addressData: AddressFormData) => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: t('checkout.toastEmptyTitle'), description: t('checkout.toastEmptyDesc') });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: t('checkout.loginRequiredTitle'), description: t('checkout.loginRequiredDesc') });
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      const userId = user.id || user.uid;
      const productUploaders =
        cart
          .map((item) => products?.find((p) => p.id === item.id)?.uploaderId)
          .filter(Boolean) as string[];
      const assignedAdminIds = Array.from(new Set(productUploaders));

      if (assignedAdminIds.length === 0) {
         throw new Error(`No owner information found for the products in the cart.`);
      }

      const orderData = {
        userId: userId,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl,
        })),
        totalAmount: total,
        shippingAddress: {
          fullName: addressData.fullName,
          addressLine1: addressData.addressLine1,
          city: addressData.city,
          postalCode: addressData.postalCode,
          country: addressData.country,
        },
        phoneNumber: addressData.phoneNumber,
        customerEmail: addressData.email,
        assignedAdminIds: assignedAdminIds,
        isPrioritized: false,
      };

      const result = await createOrder(orderData as any);
      if (!result.ok) throw new Error('Failed to place order');

      toast({
        title: t('checkout.toastSuccessTitle'),
        description: t('checkout.toastSuccessDesc'),
      });
      clearCart();
      router.push('/');

    } catch (error) {
      console.error("Failed to place order:", error);
      toast({
        variant: 'destructive',
        title: t('checkout.toastErrorTitle'),
        description: (error as Error).message || t('checkout.toastErrorDesc'),
      });
    } finally {
        setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h1 className="font-headline text-4xl">{t('checkout.loginRequiredTitle')}</h1>
          <p className="text-muted-foreground">{t('checkout.loginRequiredDesc')}</p>
          <Button asChild size="lg">
            <Link href="/login">{t('checkout.loginCta')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline">{t('checkout.formTitle')}</CardTitle>
              <CardDescription>{t('checkout.formSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="shipping-form" onSubmit={handleSubmit(handlePlaceOrder)} className="grid gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="fullName">{t('checkout.labels.fullName')}</Label>
                    <Input id="fullName" {...register('fullName')} />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="email">{t('checkout.labels.email')}</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">{t('checkout.labels.phone')}</Label>
                    <Input id="phoneNumber" type="tel" {...register('phoneNumber')} />
                    {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressLine1">{t('checkout.labels.address')}</Label>
                    <Input id="addressLine1" {...register('addressLine1')} />
                    {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="city">{t('checkout.labels.city')}</Label>
                        <Input id="city" {...register('city')} />
                        {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="postalCode">{t('checkout.labels.postalCode')}</Label>
                        <Input id="postalCode" {...register('postalCode')} />
                        {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode.message}</p>}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">{t('checkout.labels.country')}</Label>
                    <Input id="country" {...register('country')} />
                    {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
                  </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-2xl font-headline">{t('checkout.summaryTitle')}</CardTitle>
                <CardDescription>{t('checkout.summarySubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">{t('checkout.emptyTitle')}</p>
                    <Button asChild>
                      <Link href="/products">{t('checkout.emptyCta')}</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-4">
                        <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="rounded-md object-cover h-16 w-16" />
                        <div className="flex-grow">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <p>{t('cart.total')}</p>
                      <p>${total.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              {cart.length > 0 && (
                <CardFooter>
                  <Button size="lg" className="w-full" type="submit" form="shipping-form" disabled={loading}>
                    {loading ? t('checkout.placing') : t('checkout.placeOrder')}
                  </Button>
                </CardFooter>
              )}
            </Card>
        </div>
      </div>
    </div>
  );
}
