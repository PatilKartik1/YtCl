import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getVideoUrl } from "@/lib/planLimits";
import { useRouter } from "next/router";
import { toast } from "sonner";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { user, updateUser } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`);
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`);
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`);
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = () => {
    if (!user) return;
    if (isDisliked) {
      setDislikes((prev: any) => prev - 1);
      setIsDisliked(false);
    } else {
      setDislikes((prev: any) => prev + 1);
      setIsDisliked(true);
      if (isLiked) {
        setlikes((prev: any) => prev - 1);
        setIsLiked(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos.");
      return;
    }
    setIsDownloading(true);
    try {
      const { data } = await axiosInstance.post("/payment/download", {
        videoId: video._id,
        videoTitle: video.videotitle,
      });

      if (data.user) updateUser(data.user);

      const a = document.createElement("a");
      a.href = getVideoUrl(video.filepath);
      a.download = video.videotitle || video.filename || "video.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
          }
        );
      } else {
        toast.error("Download failed. Please try again.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-sm sm:text-base">{video.videochanel}</h3>
              <p className="text-xs sm:text-sm text-gray-600">1.2M subscribers</p>
            </div>
          </div>
          <Button className="rounded-full text-xs sm:text-sm px-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 w-[calc(100%+32px)] sm:w-auto scrollbar-none flex-nowrap">
          <div className="flex items-center bg-secondary rounded-full flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full flex-shrink-0 h-9"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-4 h-4 mr-1.5 ${
                  isLiked ? "fill-current" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full flex-shrink-0 h-9"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-4 h-4 mr-1.5 ${
                  isDisliked ? "fill-current" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-secondary rounded-full flex-shrink-0 h-9 ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary rounded-full flex-shrink-0 h-9"
          >
            <Share className="w-4 h-4 mr-1.5" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary rounded-full flex-shrink-0 h-9"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-secondary rounded-full flex-shrink-0 h-9 w-9"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-secondary rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
