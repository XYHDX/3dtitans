'use client';

import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from './language-provider';
import { useSessionUser } from '@/hooks/use-session';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { t } = useTranslation();
  const { user } = useSessionUser();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('cart.title')}</SheetTitle>
        </SheetHeader>
        {cart.length > 0 ? (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-6 pr-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="rounded-md object-cover h-20 w-20"
                    />
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-lg font-bold mt-1">${item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6 border-t">
                <div className='w-full space-y-4'>
                    <div className="flex justify-between items-center font-bold text-xl">
                        <span>{t('cart.total')}</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    {user ? (
                      <Button size="lg" className="w-full" asChild onClick={() => onOpenChange(false)}>
                          <Link href="/checkout">{t('cart.checkout')}</Link>
                      </Button>
                    ) : (
                      <Button size="lg" className="w-full" asChild onClick={() => onOpenChange(false)}>
                          <Link href="/login">{t('cart.checkoutGuest')}</Link>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={clearCart}>
                        {t('cart.clear')}
                    </Button>
                </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">{t('cart.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('cart.emptySubtitle')}</p>
            <Button className="mt-6" asChild onClick={() => onOpenChange(false)}>
                <Link href="/products">{t('cart.explore')}</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
