import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videoplayer from "@/components/videoplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import {
  formatWatchLimit,
  getWatchLimitSeconds,
} from "@/lib/planLimits";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);
  const [limitHit, setLimitHit] = useState(false);
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const limitReached = useRef(false);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const video = res.data?.filter((vid: any) => vid._id === id);
        setvideo(video[0]);
        setvide(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    limitReached.current = false;
    setLimitHit(false);

    const plan = user?.plan || "free";
    const limit = getWatchLimitSeconds(plan);

    if (!isFinite(limit)) return;

    const handleTimeUpdate = () => {
      if (!limitReached.current && videoEl.currentTime >= limit) {
        limitReached.current = true;
        videoEl.pause();
        setLimitHit(true);
      }
    };

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    return () => videoEl.removeEventListener("timeupdate", handleTimeUpdate);
  }, [user, videos]);

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!videos) {
    return <div>Video not found</div>;
  }

  const currentPlan = user?.plan || "free";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Videoplayer video={videos} videoRef={videoRef} />
              {limitHit && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg text-white p-6 text-center">
                  <Crown className="w-10 h-10 mb-3 text-yellow-400" />
                  <h3 className="text-lg font-semibold mb-2">
                    Watch limit reached
                  </h3>
                  <p className="text-sm text-gray-300 mb-4 max-w-sm">
                    Your {currentPlan} plan allows {formatWatchLimit(currentPlan)}{" "}
                    of watching per video. Upgrade to watch more.
                  </p>
                  <Link href="/upgrade">
                    <Button className="bg-red-600 hover:bg-red-700">
                      Upgrade your plan
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            <VideoInfo video={videos} />
            <Comments videoId={id} />
          </div>
          <div className="space-y-4">
            <RelatedVideos videos={video} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
