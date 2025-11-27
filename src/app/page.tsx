import { Hero } from '@/components/home/hero';
import { FeaturedProducts } from '@/components/home/featured-products';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { PrintOnDemand } from '@/components/home/print-on-demand';

export default function Home() {
  return (
    <>
      <Hero />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <FeaturedProducts />
        <PrintOnDemand />
        <WhyChooseUs />
      </div>
    </>
  );
}
