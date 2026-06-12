import React from "react";
import { Button } from "./ui/button";

const baseTabs = [
  { id: "videos", label: "Videos" },
];

const ownerOnlyTabs = [
  { id: "downloads", label: "Downloads" },
];

interface ChanneltabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOwner?: boolean;
}

const Channeltabs = ({ activeTab, setActiveTab, isOwner }: ChanneltabsProps) => {
  const tabs = isOwner ? [...baseTabs, ...ownerOnlyTabs] : baseTabs;

  return (
    <div className="border-b px-4">
      <div className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`px-0 py-4 border-b-2 rounded-none ${
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;
