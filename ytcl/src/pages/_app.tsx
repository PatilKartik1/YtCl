import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const ThemeManager = ({ children }: { children: React.ReactNode }) => {
  const { setTheme } = useTheme();
  const { isSouthIndia } = useUser();

  useEffect(() => {
    const now = new Date();
    
    const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false } as const;
    const istHourStr = now.toLocaleTimeString('en-US', options);
    const hour = parseInt(istHourStr, 10);
    
    
    const isTimeMatch = hour >= 10 && hour < 12;

    if (isSouthIndia && isTimeMatch) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }, [isSouthIndia, setTheme]);

  return <>{children}</>;
};

export default function App({ Component, pageProps }: AppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMediaPage = router.pathname.startsWith("/watch") || router.pathname === "/video-call";
      if (window.innerWidth >= 1024) {
        setSidebarOpen(!isMediaPage);
      } else {
        setSidebarOpen(false);
      }
    }
  }, [router.pathname]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <UserProvider>
        <ThemeManager>
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            <title>YtCl</title>
            <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
            <Toaster />
            <div className="flex flex-1 relative overflow-x-hidden">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <main className="flex-1 min-w-0 overflow-x-hidden">
                <Component {...pageProps} />
              </main>
            </div>
          </div>
        </ThemeManager>
      </UserProvider>
    </ThemeProvider>
  );
}
