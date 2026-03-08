import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { DiscordProvider } from "@/contexts/DiscordContext";
import Index from "./pages/Index";
import Room from "./pages/Room";
import JoinRoom from "./pages/JoinRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SoundProvider>
        <TooltipProvider>
          {/* Candlelight flicker — subtle ambient warmth */}
          <div
            className="candlelight-flicker pointer-events-none fixed inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, hsl(35 60% 50% / 0.12) 0%, transparent 60%)',
            }}
          />
          {/* Vignette overlay — candlelight edge darkening */}
          <div
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 55%, hsl(20 18% 4% / 0.25) 78%, hsl(20 18% 4% / 0.55) 100%)',
            }}
          />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/room/:roomCode" element={<Room />} />
              <Route path="/join/:roomCode" element={<JoinRoom />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SoundProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
