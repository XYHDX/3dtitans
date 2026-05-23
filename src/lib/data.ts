import { PlaceHolderImages } from './placeholder-images';
import type { Product } from './types';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (!image) {
    return {
      imageUrl: 'https://picsum.photos/seed/error/600/400',
      imageHint: 'placeholder image',
    };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

export const featuredProducts: Product[] = [
  {
    id: '1',
    name: 'Cyberpunk Ronin Helmet',
    category: 'Sci-Fi Assets',
    price: 49.99,
    rating: 4.8,
    reviewCount: 125,
    has3dPreview: true,
    ...getImage('product-1'),
    uploaderId: 'admin-ya',
    uploaderName: '3D Titans Team',
  },
  {
    id: '2',
    name: 'Low-Poly Adventurer',
    category: 'Game Characters',
    price: 19.99,
    rating: 4.5,
    reviewCount: 89,
    has3dPreview: true,
    ...getImage('product-2'),
    uploaderId: 'admin-ya',
    uploaderName: '3D Titans Team',
  },
  {
    id: '3',
    name: 'Modern Villa Exterior',
    category: 'Architecture',
    price: 89.99,
    rating: 4.9,
    reviewCount: 210,
    has3dPreview: false,
    ...getImage('product-3'),
    uploaderId: 'admin-ya',
    uploaderName: '3D Titans Team',
  },
  {
    id: '4',
    name: 'Classic Roadster',
    category: 'Vehicles',
    price: 65.0,
    rating: 4.7,
    reviewCount: 154,
    has3dPreview: true,
    ...getImage('product-4'),
    uploaderId: 'admin-ya',
    uploaderName: '3D Titans Team',
  },
];
