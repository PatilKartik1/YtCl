"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { getVideoUrl } from "@/lib/planLimits";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDownloads = async () => {
    try {
      const { data } = await axiosInstance.get("/payment/downloads");
      setDownloads(data.downloads);
      setPlan(data.plan || "free");
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedownload = (filepath: string, title: string) => {
    const a = document.createElement("a");
    a.href = getVideoUrl(filepath);
    a.download = title || "video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to see downloads</h2>
        <p className="text-gray-600">
          Videos you download will appear here in your profile.
        </p>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-gray-600 mb-4">
          Download videos from the watch page or home feed.
        </p>
        <p className="text-sm text-gray-500">
          Free plan: 1 download per day ·{" "}
          <Link href="/upgrade" className="text-red-500 hover:underline">
            Upgrade for unlimited
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{downloads.length} downloads</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="capitalize font-medium">{plan}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">
            {plan === "free" ? "1 download/day" : "Unlimited downloads"}
          </span>
          {plan === "free" && (
            <Link href="/upgrade">
              <Button size="sm" variant="outline" className="ml-2 h-7 text-xs">
                <Crown className="w-3 h-3 mr-1" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {downloads.map((item: any, i: number) => {
          const video = item.videoId;
          if (!video) return null;

          return (
            <div key={i} className="flex gap-4 group">
              <Link
                href={`/watch/${video._id}`}
                className="flex-shrink-0"
              >
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={getVideoUrl(video.filepath)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoTitle || video.videotitle}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600">{video.videochanel}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Downloaded{" "}
                  {formatDistanceToNow(new Date(item.downloadedAt))} ago
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 self-center"
                onClick={() =>
                  handleRedownload(video.filepath, item.videoTitle)
                }
              >
                <Download className="w-4 h-4 mr-1" />
                Re-download
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
