import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getVideoUrl } from "@/lib/planLimits";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  const isOwner = user?._id === id;

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get(`/video/channel/${id}`);
        setChannelVideos(res.data);
      } catch (error) {
        console.error("Failed to fetch channel videos:", error);
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchVideos();
  }, [id]);

  useEffect(() => {
    if (activeTab === "downloads" && isOwner) {
      loadDownloads();
    }
  }, [activeTab, isOwner]);

  const loadDownloads = async () => {
    setLoadingDownloads(true);
    try {
      const { data } = await axiosInstance.get("/payment/downloads");
      setDownloads(data.downloads);
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    } finally {
      setLoadingDownloads(false);
    }
  };

  const channel = user;

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOwner={isOwner}
        />

        <div className="px-4 pb-8 mt-4">
          {activeTab === "videos" && (
            <div className="space-y-6">
              {isOwner && (
                <VideoUploader
                  channelId={id}
                  channelName={channel?.channelname}
                />
              )}
              {loadingVideos ? (
                <p className="text-gray-500">Loading videos...</p>
              ) : channelVideos.length === 0 ? (
                <p className="text-gray-400 italic">No videos uploaded yet.</p>
              ) : (
                <ChannelVideos videos={channelVideos} />
              )}
            </div>
          )}

          {activeTab === "downloads" && isOwner && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Downloads</h2>
                <Link href="/downloads">
                  <Button variant="outline" size="sm">
                    View all downloads
                  </Button>
                </Link>
              </div>

              {loadingDownloads ? (
                <p className="text-gray-500">Loading downloads...</p>
              ) : downloads.length === 0 ? (
                <p className="text-gray-400 italic">
                  No downloads yet. Download a video to see it here.
                </p>
              ) : (
                <div className="space-y-4">
                  {downloads.map((dl: any, i: number) => {
                    const video = dl.videoId;
                    if (!video) return null;

                    return (
                      <div key={i} className="flex gap-4 items-center">
                        <Link
                          href={`/watch/${video._id}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-32 aspect-video bg-gray-100 rounded overflow-hidden">
                            <video
                              src={getVideoUrl(video.filepath)}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/watch/${video._id}`}>
                            <p className="font-medium text-sm hover:text-blue-600">
                              {dl.videoTitle || video.videotitle}
                            </p>
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Downloaded{" "}
                            {formatDistanceToNow(new Date(dl.downloadedAt))}{" "}
                            ago
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = getVideoUrl(video.filepath);
                            a.download = dl.videoTitle || "video.mp4";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Plan:{" "}
                <span className="font-semibold capitalize">
                  {user?.plan || "free"}
                </span>{" "}
                ·{" "}
                {user?.plan === "free"
                  ? "1 download/day"
                  : "Unlimited downloads"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default index;
