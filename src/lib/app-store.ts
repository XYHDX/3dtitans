'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ContactSubmission,
  NewsletterSubscription,
  Order,
  Product,
  SiteSettings,
  Upload,
  UserProfile,
} from './types';

type UserRecord = UserProfile & { password?: string };

type AppState = {
  users: UserRecord[];
  currentUserId: string | null;
  products: Product[];
  uploads: Upload[];
  orders: Order[];
  siteSettings: SiteSettings;
  contactSubmissions: ContactSubmission[];
  newsletterSubscriptions: NewsletterSubscription[];

  login: (email: string, password: string) => { ok: boolean; message?: string };
  signup: (user: UserRecord) => { ok: boolean; message?: string };
  logout: () => void;
  updateUserRole: (userId: string, role: UserProfile['role']) => void;
  updateUserVerification: (userId: string, verified: boolean) => void;
  deleteUser: (userId: string) => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addUpload: (upload: Upload) => void;
  deleteUpload: (id: string) => void;
  assignUpload: (id: string, ownerId: string | null) => void;

  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  releaseOrderToPool: (id: string) => void;
  claimOrder: (id: string, ownerId: string) => void;

  upsertSettings: (settings: SiteSettings) => void;
  addContactSubmission: (submission: ContactSubmission) => void;
  addNewsletterSubscription: (email: string) => void;
};

const timestamp = () => ({
  toDate: () => new Date(),
});

const seedUsers: UserRecord[] = [
  {
    id: 'admin-1',
    uid: 'admin-1',
    displayName: 'Admin Titan',
    email: 'admin@3dtitans.com',
    photoURL: null,
    role: 'admin',
    emailVerified: true,
    registrationDate: timestamp(),
    password: 'admin123',
  },
  {
    id: 'admin-ya',
    uid: 'admin-ya',
    displayName: 'Yahya Demeriah',
    email: 'yahyademeriah@gmail.com',
    photoURL: null,
    role: 'admin',
    emailVerified: true,
    registrationDate: timestamp(),
    password: 'admin123',
  },
  {
    id: 'owner-2',
    uid: 'owner-2',
    displayName: 'Aboude Murad',
    email: 'aboude.murad@gmail.com',
    photoURL: null,
    role: 'store-owner',
    emailVerified: true,
    registrationDate: timestamp(),
    password: 'owner123',
  },
  {
    id: 'owner-1',
    uid: 'owner-1',
    displayName: 'Store Owner',
    email: 'owner@3dtitans.com',
    photoURL: null,
    role: 'store-owner',
    emailVerified: true,
    registrationDate: timestamp(),
    password: 'owner123',
  },
  {
    id: 'user-1',
    uid: 'user-1',
    displayName: 'Regular User',
    email: 'user@3dtitans.com',
    photoURL: null,
    role: 'user',
    emailVerified: true,
    registrationDate: timestamp(),
    password: 'user123',
  },
];

const seedUsersByEmail = seedUsers.reduce<Record<string, UserRecord>>((acc, u) => {
  if (u.email) acc[u.email.toLowerCase()] = u;
  return acc;
}, {});
const seedUserEmails = new Set(Object.keys(seedUsersByEmail));

const seedProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Cyberpunk Ronin Helmet',
    category: 'Sci-Fi Assets',
    price: 49.99,
    rating: 4.8,
    reviewCount: 125,
    has3dPreview: true,
    imageUrl: 'https://placehold.co/600x400?text=Ronin+Helmet',
    uploaderId: 'owner-1',
    uploaderName: 'Store Owner',
    createdAt: timestamp(),
  },
  {
    id: 'prod-2',
    name: 'Modern Villa Exterior',
    category: 'Architecture',
    price: 89.99,
    rating: 4.9,
    reviewCount: 210,
    has3dPreview: false,
    imageUrl: 'https://placehold.co/600x400?text=Modern+Villa',
    uploaderId: 'owner-1',
    uploaderName: 'Store Owner',
    createdAt: timestamp(),
  },
];

const seedOrders: Order[] = [
  {
    id: 'order-1',
    userId: 'user-1',
    orderDate: timestamp(),
    totalAmount: 139.98,
    status: 'Pending',
    items: [
      { productId: 'prod-1', name: 'Cyberpunk Ronin Helmet', quantity: 1, price: 49.99, imageUrl: seedProducts[0].imageUrl },
      { productId: 'prod-2', name: 'Modern Villa Exterior', quantity: 1, price: 89.99, imageUrl: seedProducts[1].imageUrl },
    ],
    productIds: ['prod-1', 'prod-2'],
    shippingAddress: {
      fullName: 'Regular User',
      addressLine1: '123 Maker Lane',
      city: 'Printville',
      postalCode: '12345',
      country: 'USA',
    },
    phoneNumber: '+1 555-1234',
    customerEmail: 'user@3dtitans.com',
    assignedAdminIds: ['owner-1'],
    isPrioritized: false,
  },
];

const seedUploads: Upload[] = [
  {
    id: 'upload-1',
    modelName: 'Sample STL',
    fileName: 'sample.stl',
    filePath: 'uploads/sample.stl',
    downloadURL: 'https://placehold.co/200x200?text=STL',
    notes: 'PLA, black, 0.2 layer height',
    userId: 'user-1',
    userEmail: 'user@3dtitans.com',
    userDisplayName: 'Regular User',
    phoneNumber: '+1 555-1234',
    createdAt: timestamp(),
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      currentUserId: null,
      products: seedProducts,
      uploads: seedUploads,
      orders: seedOrders,
      siteSettings: {
        aboutHeroTitle: 'About 3D Titans',
        aboutHeroSubtitle: 'The titans behind the 3D world.',
        aboutMissionTitle: 'Our Mission',
        aboutMission: 'We print the future. High-quality 3D printing for makers and brands.',
        aboutContactTitle: 'Get in Touch',
        aboutContact: 'Questions? Reach us anytime and we will respond within one business day.',
        aboutContactCardTitle: 'Contact Us',
        footerBlurb: '3D Titans — precision printing for visionary creators.',
        facebookUrl: 'https://www.facebook.com/3DTitans',
        instagramUrl: 'https://www.instagram.com/3DTitans',
      },
      contactSubmissions: [],
      newsletterSubscriptions: [],

      login: (email, password) => {
        const emailLc = email.toLowerCase();
        const user = get().users.find(
          (u) => (u.email || '').toLowerCase() === emailLc && u.password === password
        );
        if (user) {
          set({ currentUserId: user.id });
          return { ok: true };
        }

        // Fallback: if a known seed user matches, re-seed and log in
        const seedMatch = seedUsersByEmail[emailLc];
        if (seedMatch && seedMatch.password === password) {
          const newUser = { ...seedMatch, registrationDate: timestamp() };
          const filtered = get().users.filter((u) => (u.email || '').toLowerCase() !== emailLc);
          set({ users: [...filtered, newUser], currentUserId: newUser.id });
          return { ok: true };
        }

        return { ok: false, message: 'Invalid credentials' };
      },
      signup: (user) => {
        const emailLc = (user.email || '').toLowerCase();
        if (!emailLc) return { ok: false, message: 'Email is required' };

        const existing = get().users.find((u) => (u.email || '').toLowerCase() === emailLc);
        if (existing) {
          // Allow overriding seeded demo users so new accounts can be registered with the same email.
          if (!seedUserEmails.has(emailLc)) return { ok: false, message: 'Email already registered' };
          const newUser = {
            ...user,
            email: user.email,
            id: user.id || crypto.randomUUID(),
            uid: user.uid || crypto.randomUUID(),
            registrationDate: timestamp(),
          };
          set((state) => ({
            users: state.users.filter((u) => (u.email || '').toLowerCase() !== emailLc).concat(newUser),
            currentUserId: newUser.id,
          }));
          return { ok: true };
        }

        const newUser = {
          ...user,
          id: user.id || crypto.randomUUID(),
          uid: user.uid || crypto.randomUUID(),
          registrationDate: timestamp(),
        };
        set((state) => ({ users: [...state.users, newUser], currentUserId: newUser.id }));
        return { ok: true };
      },
      logout: () => set({ currentUserId: null }),
      updateUserRole: (userId, role) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
        })),
      updateUserVerification: (userId, verified) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === userId ? { ...u, emailVerified: verified } : u)),
        })),
      deleteUser: (userId) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
          currentUserId: state.currentUserId === userId ? null : state.currentUserId,
        })),

      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, patch) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      addUpload: (upload) => set((state) => ({ uploads: [...state.uploads, upload] })),
      deleteUpload: (id) => set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) })),
      assignUpload: (id, ownerId) =>
        set((state) => ({
          uploads: state.uploads.map((u) =>
            u.id === id ? { ...u, assignedOwnerId: ownerId || undefined, status: ownerId ? 'assigned' as any : 'pooled' as any } : u
          ),
        })),

      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      updateOrder: (id, patch) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      releaseOrderToPool: (id) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id ? { ...o, status: 'Pooled', assignedAdminIds: [] } : o
          ),
        })),
      claimOrder: (id, ownerId) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: 'Pending',
                  assignedAdminIds: Array.from(new Set([...(o.assignedAdminIds || []), ownerId])),
                }
              : o
          ),
        })),

      upsertSettings: (settings) => set(() => ({ siteSettings: { ...settings } })),
      addContactSubmission: (submission) =>
        set((state) => ({
          contactSubmissions: [...state.contactSubmissions, submission],
        })),
      addNewsletterSubscription: (email) =>
        set((state) => {
          if (state.newsletterSubscriptions.some((s) => s.email === email)) return state;
          const sub: NewsletterSubscription = { id: crypto.randomUUID(), email, subscribedAt: timestamp() };
          return { newsletterSubscriptions: [...state.newsletterSubscriptions, sub] };
        }),
    }),
    {
      name: '3dtitans-local-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
