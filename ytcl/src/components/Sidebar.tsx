import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Crown,
  Video,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItemProps {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  textColor?: string;
}

const SidebarItem = ({ href, onClick, icon, label, isOpen, textColor }: SidebarItemProps) => {
  const content = isOpen ? (
    <Button
      variant="ghost"
      className={`w-full justify-start text-sm ${textColor || ""}`}
      onClick={onClick}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="ml-3 truncate">{label}</span>
    </Button>
  ) : (
    <Button
      variant="ghost"
      className={`w-full flex flex-col h-auto py-2.5 px-1 items-center justify-center text-[10px] ${textColor || ""}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span className="mt-1 truncate w-full text-center">{label}</span>
    </Button>
  );

  if (href) {
    return (
      <Link href={href} className="w-full block">
        {content}
      </Link>
    );
  }

  return <div className="w-full">{content}</div>;
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <>
      {/* Mobile/Tablet Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 lg:inset-auto bg-background border-r min-h-screen transition-all duration-300 flex flex-col ${
          isOpen ? "translate-x-0 w-64 p-2" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:p-0 lg:border-none overflow-hidden"
        }`}
      >
        <nav className="space-y-1 flex-1">
          <SidebarItem href="/" icon={<Home className="w-5 h-5" />} label="Home" isOpen={isOpen} />
          <SidebarItem href="/explore" icon={<Compass className="w-5 h-5" />} label="Explore" isOpen={isOpen} />
          <SidebarItem href="/subscriptions" icon={<PlaySquare className="w-5 h-5" />} label="Subscriptions" isOpen={isOpen} />

          {user && (
            <div className={`${isOpen ? "border-t pt-2 mt-2" : "pt-1 mt-1"} space-y-1`}>
              <SidebarItem href="/history" icon={<History className="w-5 h-5" />} label="History" isOpen={isOpen} />
              <SidebarItem href="/liked" icon={<ThumbsUp className="w-5 h-5" />} label="Liked videos" isOpen={isOpen} />
              <SidebarItem href="/watch-later" icon={<Clock className="w-5 h-5" />} label="Watch later" isOpen={isOpen} />
              <SidebarItem href="/downloads" icon={<Download className="w-5 h-5" />} label="Downloads" isOpen={isOpen} />
              <SidebarItem
                href="/video-call"
                icon={<Video className="w-5 h-5" />}
                label="Video Call (VoIP)"
                isOpen={isOpen}
                textColor="text-red-500 hover:text-red-600"
              />
              <SidebarItem href="/upgrade" icon={<Crown className="w-5 h-5" />} label="Upgrade plan" isOpen={isOpen} />

              {user?.channelname ? (
                <SidebarItem
                  href={`/channel/${user._id || user.id}`}
                  icon={<User className="w-5 h-5" />}
                  label="Your channel"
                  isOpen={isOpen}
                />
              ) : isOpen ? (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              ) : (
                <SidebarItem
                  onClick={() => setisdialogeopen(true)}
                  icon={<User className="w-5 h-5" />}
                  label="Create"
                  isOpen={isOpen}
                />
              )}
            </div>
          )}
        </nav>
        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
          mode="create"
        />
      </aside>
    </>
  );
};

export default Sidebar;
