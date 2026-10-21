'use client';

import { useCurrency } from '@/hooks/use-currency';
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
  const { format: formatPrice } = useCurrency();
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { t, locale } = useTranslation();
  const { user } = useSessionUser();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Opens from the inline-end edge (right in English, left in Arabic). */}
      <SheetContent side={locale === 'ar' ? 'left' : 'right'} className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('cart.title')}</SheetTitle>
        </SheetHeader>
        {cart.length > 0 ? (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-6 pe-6">
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
                      <p className="text-lg font-bold mt-1">{formatPrice(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={t('cartSheet.decrease', 'Decrease quantity of {name}', { name: item.name })}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center" aria-live="polite">
                          <span className="sr-only">{t('cartSheet.quantity', 'Quantity')}: </span>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={t('cartSheet.increase', 'Increase quantity of {name}', { name: item.name })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} aria-label={t('cartSheet.remove', 'Remove {name} from cart', { name: item.name })}>
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
                        <span>{formatPrice(total)}</span>
                    </div>
                    {user ? (
                      <Button size="lg" className="w-full" asChild onClick={() => onOpenChange(false)}>
                          <Link href="/checkout">{t('cart.checkout')}</Link>
                      </Button>
                    ) : (
                      <>
                        {/* Guests keep their cart; it is merged into the account on login. */}
                        <Button size="lg" className="w-full" asChild onClick={() => onOpenChange(false)}>
                            <Link href={`/login?next=${encodeURIComponent('/checkout')}`}>{t('cart.checkoutGuest')}</Link>
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          {t('cartSheet.newCustomer', 'New here?')}{' '}
                          <Link
                            href={`/signup?next=${encodeURIComponent('/checkout')}`}
                            onClick={() => onOpenChange(false)}
                            className="font-semibold text-foreground underline decoration-primary decoration-[3px] underline-offset-4 hover:bg-accent hover:text-accent-foreground dark:text-primary dark:hover:text-accent-foreground"
                          >
                            {t('cartSheet.createAccount', 'Create an account')}
                          </Link>{' '}
                          {t('cartSheet.keepCart', '— your cart is kept.')}
                        </p>
                      </>
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
