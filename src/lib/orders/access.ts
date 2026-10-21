import 'server-only';
import { prisma } from '@/lib/db';

type CustomerLink = { userId: string | null; customerEmail: string | null };

/**
 * The user's email, but only if it has been verified. Legacy orders that are
 * not linked to an account are matched by email ONLY for verified addresses —
 * otherwise anyone could sign up with a stranger's email and read their
 * orders (addresses, phone numbers).
 */
export async function verifiedEmailOf(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  return user?.emailVerified && user.email ? user.email.toLowerCase() : null;
}

/** Is this user the customer of the order? (DB lookup only for unlinked legacy orders.) */
export async function isOrderCustomer(order: CustomerLink, userId: string): Promise<boolean> {
  if (order.userId) return order.userId === userId;
  if (!order.customerEmail) return false;
  const email = await verifiedEmailOf(userId);
  return !!email && order.customerEmail.toLowerCase() === email;
}
