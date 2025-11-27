import { Gem, ShieldCheck, Users, DownloadCloud } from 'lucide-react';

const features = [
  {
    icon: <Gem className="h-8 w-8 text-primary" />,
    title: 'Curated Quality',
    description: 'Every model is hand-picked and tested by our team to ensure it meets our high standards for quality and performance.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Worry-Free Licensing',
    description: 'Our straightforward licensing grants you broad rights for commercial use, so you can create with confidence.',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Thriving Community',
    description: 'Join a vibrant community of creators. Get feedback, find collaborators, and share your work with fellow 3D artists.',
  },
  {
    icon: <DownloadCloud className="h-8 w-8 text-primary" />,
    title: 'Instant Access',
    description: 'Get your assets immediately after purchase. No waiting, no hassle. Download and start creating right away.',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-16 md:py-24 bg-background w-full">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="font-headline text-4xl md:text-5xl tracking-wide">
          The Creator's Choice
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          We're building the ultimate marketplace for 3D creators, with features designed to help you succeed.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mt-16">
        {features.map((feature, index) => (
          <div key={index} className="text-center">
            <div className="flex justify-center mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
