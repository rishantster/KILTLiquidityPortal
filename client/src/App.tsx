import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AdminPage from "@/pages/admin";
import { useEffect, useRef } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function CyberpunkVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Force video to play
      video.play().catch(error => {
        console.log('Video autoplay failed:', error);
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      className="video-background"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        objectFit: 'cover',
        opacity: 1,
        filter: 'brightness(0.7) contrast(1.5) saturate(0.4) hue-rotate(300deg)'
      }}
      onError={(e) => {
        console.log('Video failed to load:', e);
        // Hide video on error
        (e.target as HTMLVideoElement).style.display = 'none';
      }}
      onCanPlay={() => {
        console.log('Video can play');
      }}
    >
      <source
        src="/attached_assets/678a7b5f9cfe257413b8e490_6798d33994ec593b001fae82_32 Compressed-transcode_1752818424149.mp4"
        type="video/mp4"
      />
      <source
        src="/attached_assets/678a7b5f9cfe257413b8e490_6798d33994ec593b001fae82_32 Compressed-transcode_1752818096839.mp4"
        type="video/mp4"
      />
    </video>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          {/* CYBERPUNK VIDEO BACKGROUND */}
          <CyberpunkVideoBackground />
          <Toaster />
          <Router />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
