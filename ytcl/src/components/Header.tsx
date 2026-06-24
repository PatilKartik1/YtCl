import { Bell, Crown, Menu, Mic, Search, User, VideoIcon, ArrowLeft } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import OTPLoginModal from "./OTPLoginModal";

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
  const { user, logout } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const router = useRouter();
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  };
  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  if (isMobileSearchOpen) {
    return (
      <header className="flex items-center justify-between px-3 py-2 bg-background border-b h-14">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full flex-shrink-0"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 flex-1 mx-2"
        >
          <div className="flex flex-1">
            <Input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onKeyPress={handleKeypress}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full border-r-0 focus-visible:ring-0 w-full text-sm"
              autoFocus
            />
            <Button
              type="submit"
              className="rounded-r-full px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-l-0"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </form>
        <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
          <Mic className="w-5 h-5" />
        </Button>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b h-14">
      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuToggle}>
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-lg md:text-xl font-medium">YtCl</span>
          <span className="text-[10px] text-muted-foreground ml-0.5">IN</span>
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-5 h-5" />
        </Button>
      </form>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="flex md:hidden rounded-full"
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>
        {user ? (
          <>
            <Link href="/upgrade">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Crown className="w-4 h-4" />
                {user.plan && user.plan !== "free"
                  ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
                  : "Upgrade"}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="hidden xs:inline-flex">
              <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden xs:inline-flex">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upgrade">Upgrade plan</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
              onClick={() => setIsLoginModalOpen(true)}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}{" "}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
      <OTPLoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </header>
  );
};

export default Header;
