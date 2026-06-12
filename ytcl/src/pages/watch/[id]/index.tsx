import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videoplayer from "@/components/videoplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

const watchLimits: any = {
  free: 5 * 60, // 5 minutes in seconds
  bronze: 7 * 60, // 7 minutes
  silver: 10 * 60, // 10 minutes
  gold: Infinity, // unlimited
};

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const limitReached = useRef(false); // prevent multiple alerts

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

  // Watch time limiter
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !user) return;

    limitReached.current = false; // reset on new video

    const plan = user.plan || "free";
    const limit = watchLimits[plan];

    const handleTimeUpdate = () => {
      if (!limitReached.current && videoEl.currentTime >= limit) {
        limitReached.current = true;
        videoEl.pause();
        const upgrade = confirm(
          `⏱ Your ${plan.toUpperCase()} plan allows only ${limit / 60} minutes of watching.\n\nClick OK to upgrade your plan!`,
        );
        if (upgrade) router.push("/upgrade");
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videoplayer video={videos} videoRef={videoRef} />
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
