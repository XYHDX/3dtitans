'use client';
import { SiteSettings } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/use-data";
import { useContactSubmissions } from "@/hooks/use-data";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  subject: z.string().min(5, "Subject must be at least 5 characters."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function AboutPage() {
  const { data: settings } = useSiteSettings();
  const { submitContact } = useContactSubmissions({ skipFetch: true });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      const saved = await submitContact({
        ...data,
      } as any);
      if (!saved) {
        throw new Error('Could not submit contact form');
      }
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
      });
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="font-headline text-5xl">About 3D Titans</h1>
        <p className="text-muted-foreground mt-2 text-lg">The titans behind the 3D world.</p>
      </div>
      
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="font-headline text-4xl text-center mb-8">Our Mission</h2>
        <p className="text-lg text-muted-foreground text-center">
          {settings?.aboutMission || "We are dedicated to providing the highest quality 3D models and printing services to creators, developers, and enthusiasts around the globe. Our mission is to empower imagination by making top-tier 3D assets accessible to everyone."}
        </p>
      </div>

      <div className="bg-card p-8 md:p-12 rounded-lg">
        <h2 className="font-headline text-4xl text-center mb-8">Get in Touch</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          {settings?.aboutContact || "Have a question, a project proposal, or just want to say hello? We'd love to hear from you."}
        </p>
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...register('subject')} />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" {...register('message')} rows={5} />
                {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
