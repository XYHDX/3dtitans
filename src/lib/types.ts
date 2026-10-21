
export type Timestamp = {
  toDate: () => Date;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  storeId?: string | null;
  storeName?: string;
  storeSlug?: string;
  storeAvatarUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  imageUrl: string;
  imageGallery?: string[];
  imageHint?: string;
  has3dPreview?: boolean;
  uploaderEmail?: string;
  createdAt?: Timestamp;
  description?: string;
  tags?: string[];
  uploaderId: string;
  uploaderName: string;
  isPrioritizedStore?: boolean;
  /** Archived products are hidden from the shop (Product.archivedAt is set). */
  archived?: boolean;
  archivedAt?: string | null;
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  websiteUrl?: string | null;
  ownerId: string;
  isPublished: boolean;
  productsCount?: number;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
};

export type Upload = {
  id: string;
  modelName: string;
  fileName: string;
  fileUrl?: string;
  filePath: string;
  downloadURL: string;
  notes: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  phoneNumber: string;
  status?: string;
  assignedOwnerId?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp | Date | string;
}

/**
 * Public, admin-editable settings served by GET /api/settings. Text fields have
 * an `…Ar` twin for the Arabic site; validation rules live in
 * src/lib/site-settings-shared.ts.
 */
export type SiteSettings = {
  aboutHeroTitle?: string;
  aboutHeroTitleAr?: string;
  aboutHeroSubtitle?: string;
  aboutHeroSubtitleAr?: string;
  aboutMissionTitle?: string;
  aboutMissionTitleAr?: string;
  aboutMission?: string;
  aboutMissionAr?: string;
  aboutContactTitle?: string;
  aboutContactTitleAr?: string;
  aboutContact?: string;
  aboutContactAr?: string;
  aboutContactCardTitle?: string;
  aboutContactCardTitleAr?: string;
  footerBlurb?: string;
  footerBlurbAr?: string;
  /** https URL on facebook.com (or a subdomain). */
  facebookUrl?: string;
  /** https URL on instagram.com (or a subdomain). */
  instagramUrl?: string;
  /** WhatsApp number normalised to "+<country code><number>", e.g. "+963912345678". Build links with whatsappHref(). */
  whatsappNumber?: string;
  /** Display phone number (8–15 digits). Build links with telHref(). */
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  contactAddressAr?: string;
  /** Free text, e.g. "Sat–Thu, 10:00–20:00". */
  contactHours?: string;
  contactHoursAr?: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Timestamp;
};

export type Order = {
  id: string;
  userId: string;
  orderDate: Timestamp;
  totalAmount: number;
  status: 'AwaitingAcceptance' | 'Pending' | 'Printing' | 'Finished' | 'Pooled' | 'CancellationRequested' | 'Cancelled';
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  productIds: string[];
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    postalCode?: string | null;
    country: string;
  },
  phoneNumber: string;
  notes?: string;
  customerEmail?: string;
  predictedFinishDate?: Timestamp | Date | string;
  isPrioritized?: boolean;
  assignedAdminIds: string[];
  updatedAt?: Timestamp | Date | string;
  /** Customer-facing reference, e.g. "3DT-AB12CD34". */
  reference?: string;
  paymentMethod?: 'cod' | 'bank_transfer' | 'sham_cash' | 'sham_cash_epay' | 'syriatel_cash' | 'stripe' | null;
  paymentStatus?: 'pending' | 'verifying' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string | null;
  hasPaymentProof?: boolean;
  paidAt?: Timestamp | Date | string | null;
  /** Currency the order was priced in (e.g. "USD"); null on legacy orders. */
  currency?: string | null;
}

export type UserProfile = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: 'user' | 'store-owner' | 'admin';
  registrationDate: Timestamp;
  emailVerified?: boolean;
  isPrioritizedStore?: boolean;
};

export type NewsletterSubscription = {
  id: string;
  email: string;
  subscribedAt: Timestamp | Date | string;
};
