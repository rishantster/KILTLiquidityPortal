import { LandingPage } from '@/components/landing-page';
import { usePrefetch } from '@/hooks/use-prefetch';

export default function Home() {
  // Prefetch critical data for faster navigation
  usePrefetch();
  
  return <LandingPage />;
}
