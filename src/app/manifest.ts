import type { MetadataRoute } from 'next';

/** Web app manifest (L-26): name, brand colours and home-screen icons. Arabic first. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3D Titans',
    short_name: '3D Titans',
    description: 'منتجات مطبوعة بتقنية ثلاثية الأبعاد صُنعت في سوريا، وطباعة مخصّصة، وتوصيل إلى مختلف المحافظات.',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0F0F11',
    theme_color: '#FFC107',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
