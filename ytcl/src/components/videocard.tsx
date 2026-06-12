"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getVideoUrl } from "@/lib/planLimits";
import { useRouter } from "next/router";
import { toast } from "sonner";

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function VideoCard({ video }: any) {
  const { user, updateUser } = useUser();
  const router = useRouter();

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to download videos.");
      return;
    }

    try {
      const { data } = await axiosInstance.post("/payment/download", {
        videoId: video._id,
        videoTitle: video.videotitle,
      });

      if (data.user) updateUser(data.user);

      const link = document.createElement("a");
      link.href = getVideoUrl(video.filepath);
      link.download = video.videotitle;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started!");
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.limitReached) {
        toast.error(
          "Daily download limit reached. Upgrade for unlimited downloads!",
          {
            action: {
              label: "Upgrade",
              onClick: () => router.push("/upgrade"),
            },
            duration: 6000,
          },
        );
      } else {
        toast.error("Download failed. Please try again.");
      }
    }
  };

  return (
    <div className="group">
      <Link href={`/watch/${video?._id}`}>
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <video
              src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {formatDuration(video?.duration)}
            </div>
          </div>
          <div className="flex gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback>{video?.videochanel[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
                {video?.videotitle}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{video?.videochanel}</p>
              <p className="text-sm text-gray-600">
                {video?.views.toLocaleString()} views •{" "}
                {formatDistanceToNow(new Date(video?.createdAt))} ago
              </p>
            </div>
          </div>
        </div>
      </Link>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="mt-2 w-full text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
      >
        ⬇️ Download
      </button>
    </div>
  );
}
