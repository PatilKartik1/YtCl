import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";

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
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <UserProvider>
        <ThemeManager>
          <div className="min-h-screen bg-background text-foreground">
            <title>YtCl</title>
            <Header />
            <Toaster />
            <div className="flex">
              <Sidebar />
              <Component {...pageProps} />
            </div>
          </div>
        </ThemeManager>
      </UserProvider>
    </ThemeProvider>
  );
}
