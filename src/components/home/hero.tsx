import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-background');

  return (
    <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center text-center text-white overflow-hidden">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-wider text-shadow-lg max-w-4xl mx-auto">
          BUILD WORLDS, <br/>CREATE LEGENDS
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-foreground/80">
          Discover a universe of premium, game-ready 3D models. From epic characters to breathtaking environments, find the assets to bring your vision to life.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/products">
              Get started
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/about">Learn more</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
