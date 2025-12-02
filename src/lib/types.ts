
export type Timestamp = {
  toDate: () => Date;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  uploaderName?: string;
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
  createdAt: Timestamp;
  updatedAt?: Timestamp | Date | string;
}

export type SiteSettings = {
  aboutHeroTitle?: string;
  aboutHeroSubtitle?: string;
  aboutMissionTitle?: string;
  aboutMission?: string;
  aboutContactTitle?: string;
  aboutContact?: string;
  aboutContactCardTitle?: string;
  footerBlurb?: string;
  facebookUrl?: string;
  instagramUrl?: string;
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
    status: 'AwaitingAcceptance' | 'Pending' | 'Printing' | 'Finished' | 'Pooled';
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
        postalCode: string;
        country: string;
    },
    phoneNumber: string;
    customerEmail?: string;
    predictedFinishDate?: Timestamp | Date | string;
    isPrioritized?: boolean;
    assignedAdminIds: string[];
    updatedAt?: Timestamp | Date | string;
}

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: 'user' | 'store-owner' | 'admin';
  registrationDate: Timestamp;
  emailVerified?: boolean;
};
