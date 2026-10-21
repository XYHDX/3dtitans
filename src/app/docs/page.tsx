import { permanentRedirect } from 'next/navigation';

// Filler page removed before launch (M-25); old links land on About.
export default function RemovedPage() {
  permanentRedirect('/about');
}
