/**
 * Shapes for the bilingual policy/help content in src/content/*.ts.
 *
 * Text may contain internal links written as `[label](/path)`; they are
 * rendered with next/link (only paths starting with "/" are linked).
 */

export type ContentSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Optional paragraphs shown after the bullets. */
  after?: string[];
};

export type ContentDoc = {
  /** Page <h1> and <title>. */
  title: string;
  /** Meta description (≤ 160 characters). */
  description: string;
  intro?: string;
  sections: ContentSection[];
};

export type FaqItem = { q: string; a: string };

export type FaqDoc = {
  title: string;
  description: string;
  intro?: string;
  groups: Array<{ heading: string; items: FaqItem[] }>;
};
