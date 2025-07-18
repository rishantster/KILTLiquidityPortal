import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/wallet-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AdminPage from "@/pages/admin";
import { useEffect, useRef, useState } from "react";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Preload video in background without blocking UI
    const preloadVideo = async () => {
      try {
        // Start loading immediately but don't block
        video.load();
        
        // Wait for enough data to start playing smoothly
        await new Promise((resolve, reject) => {
          const handleCanPlay = () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            resolve(true);
          };
          
          const handleError = () => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
        });
        
        // Start playing once loaded
        await video.play();
        setIsPlaying(true);
        setIsLoaded(true);
      } catch (error) {
        setLoadingError(true);
      }
    };

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloadVideo(), { timeout: 2000 });
    } else {
      // Fallback with minimal delay
      setTimeout(preloadVideo, 100);
    }

    return () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, []);

  return (
    <>
      {/* Loading background - solid color shown while video loads */}
      {!isLoaded && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            background: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)',
          }}
        />
      )}
      
      {/* Video element - hidden until loaded */}
      {!loadingError && (
        <video
          ref={videoRef}
          className="video-background"
          loop
          muted
          playsInline
          preload="metadata"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            objectFit: 'cover',
            opacity: isLoaded ? 0.7 : 0,
            filter: 'brightness(1.2) contrast(1.0) saturate(1.1) hue-rotate(320deg) sepia(0.2)',
            transition: 'opacity 0.3s ease-in-out',
            willChange: 'opacity'
          }}
          onError={() => {
            setLoadingError(true);
          }}
          onCanPlay={() => {
            if (!isLoaded) {
              setIsLoaded(true);
            }
          }}
        >
          <source
            src="/attached_assets/Untitled design (22)_1752822331413.mp4"
            type="video/mp4"
          />
          <source
            src="/attached_assets/678a7b5f9cfe257413b8e490_6798d33994ec593b001fae82_32 Compressed-transcode_1752818424149.mp4"
            type="video/mp4"
          />
        </video>
      )}
      
      {/* Fallback gradient if video fails to load */}
      {loadingError && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            background: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)',
          }}
        />
      )}
    </>
  );
}

function App() {
  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError' || event.reason?.message?.includes('aborted')) {
        event.preventDefault(); // Prevent console warnings for AbortError
        return;
      }
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

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
