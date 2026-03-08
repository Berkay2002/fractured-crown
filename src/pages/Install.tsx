import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Monitor, CheckCircle2, Share, PlusSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  usePageTitle("Install — Fractured Crown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        {/* Crown icon */}
        <div className="flex justify-center">
          <img
            src="/pwa-512x512.png"
            alt="Fractured Crown"
            className="w-24 h-24 drop-shadow-lg"
          />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl text-primary tracking-wide">
            Install Fractured Crown
          </h1>
          <p className="font-body text-foreground/80 text-lg">
            Add the game to your home screen for a full-screen, app-like experience.
          </p>
        </div>

        {isInstalled ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="rounded-lg border border-primary/30 bg-card p-6 space-y-3"
          >
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <p className="font-display text-primary text-xl">Already Installed</p>
            <p className="font-body text-muted-foreground">
              Fractured Crown is on your device. Open it from your home screen.
            </p>
          </motion.div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="w-full font-display text-lg gap-3 h-14"
          >
            <Download className="w-5 h-5" />
            Install Now
          </Button>
        ) : (
          <div className="space-y-6">
            {platform === "ios" && (
              <div className="rounded-lg border border-border bg-card p-6 text-left space-y-4">
                <p className="font-display text-primary text-lg text-center">
                  Install on iPhone / iPad
                </p>
                <ol className="space-y-4 font-body text-foreground/90">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">1</span>
                    <span className="pt-0.5">
                      Tap the <Share className="inline w-4 h-4 text-primary -mt-0.5" /> <strong className="text-primary">Share</strong> button in Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">2</span>
                    <span className="pt-0.5">
                      Scroll down and tap <PlusSquare className="inline w-4 h-4 text-primary -mt-0.5" /> <strong className="text-primary">Add to Home Screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">3</span>
                    <span className="pt-0.5">
                      Tap <strong className="text-primary">Add</strong> to confirm
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "android" && (
              <div className="rounded-lg border border-border bg-card p-6 text-left space-y-4">
                <p className="font-display text-primary text-lg text-center">
                  Install on Android
                </p>
                <ol className="space-y-4 font-body text-foreground/90">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">1</span>
                    <span className="pt-0.5">
                      Tap the <MoreVertical className="inline w-4 h-4 text-primary -mt-0.5" /> <strong className="text-primary">menu</strong> in your browser
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">2</span>
                    <span className="pt-0.5">
                      Tap <Smartphone className="inline w-4 h-4 text-primary -mt-0.5" /> <strong className="text-primary">Install app</strong> or <strong className="text-primary">Add to Home screen</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">3</span>
                    <span className="pt-0.5">
                      Tap <strong className="text-primary">Install</strong> to confirm
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "desktop" && (
              <div className="rounded-lg border border-border bg-card p-6 text-left space-y-4">
                <p className="font-display text-primary text-lg text-center">
                  Install on Desktop
                </p>
                <ol className="space-y-4 font-body text-foreground/90">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">1</span>
                    <span className="pt-0.5">
                      Look for the <Monitor className="inline w-4 h-4 text-primary -mt-0.5" /> <strong className="text-primary">install icon</strong> in your browser's address bar
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display text-sm">2</span>
                    <span className="pt-0.5">
                      Click <strong className="text-primary">Install</strong> to add the app
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-muted-foreground font-body">
          The app works in your browser too — installation is optional.
        </p>
      </motion.div>
    </div>
  );
};

export default Install;
