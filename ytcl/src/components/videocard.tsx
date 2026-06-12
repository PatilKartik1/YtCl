"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function VideoCard({ video }: any) {
  const { user } = useUser();
  const router = useRouter();

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigating to watch page
    if (!user) return router.push("/login");

    try {
      const res = await axiosInstance.post("/payment/download", {
        userId: user._id,
        videoId: video._id,
        videoTitle: video.videotitle,
      });

      if (res.data.success) {
        // Trigger actual file download
        const link = document.createElement("a");
        link.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/${video.filepath}`;
        link.download = video.videotitle;
        link.click();
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        const upgrade = confirm(
          "⚠️ Free users can only download 1 video per day.\n\nClick OK to upgrade to premium!",
        );
        if (upgrade) router.push("/upgrade");
      } else {
        alert("Download failed. Try again.");
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
