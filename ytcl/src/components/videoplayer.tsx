"use client";

import { useRef, useState, useCallback, RefObject } from "react";
import { getVideoUrl } from "@/lib/planLimits";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

type Zone = "left" | "center" | "right";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  videoRef?: RefObject<HTMLVideoElement | null>;
  onNextVideo?: () => void;
  onOpenComments?: () => void;
  onClose?: () => void;
}

const TAP_WINDOW_MS = 350;

export default function VideoPlayer({
  video,
  videoRef,
  onNextVideo,
  onOpenComments,
  onClose,
}: VideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "seek-forward" | "seek-back" | "play" | "pause";
    key: number;
  } | null>(null);

  const tapState = useRef<{
    zone: Zone | null;
    count: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ zone: null, count: 0, timer: null });

  const showFeedback = (
    type: "seek-forward" | "seek-back" | "play" | "pause",
  ) => {
    setFeedback({ type, key: Date.now() });
    setTimeout(() => setFeedback(null), 600);
  };

  const seekBy = (seconds: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(
      0,
      Math.min(el.duration || Infinity, el.currentTime + seconds),
    );
    showFeedback(seconds > 0 ? "seek-forward" : "seek-back");
  };

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
      showFeedback("play");
    } else {
      el.pause();
      setIsPlaying(false);
      showFeedback("pause");
    }
  };

  const executeGesture = useCallback(
    (zone: Zone, count: number) => {
      if (zone === "left") {
        if (count === 2) seekBy(-10);
        else if (count === 3) onOpenComments?.();
      } else if (zone === "center") {
        if (count === 1) togglePlay();
        else if (count === 3) onNextVideo?.();
      } else if (zone === "right") {
        if (count === 2) seekBy(10);
        else if (count === 3) onClose?.();
      }
    },
    [onNextVideo, onOpenComments, onClose],
  );

  const getZone = (clientX: number): Zone | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) return "left";
    if (x < third * 2) return "center";
    return "right";
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const zone = getZone(e.clientX);
    if (!zone) return;

    if (tapState.current.zone === zone) {
      tapState.current.count += 1;
    } else {
      tapState.current.zone = zone;
      tapState.current.count = 1;
    }

    if (tapState.current.timer) {
      clearTimeout(tapState.current.timer);
    }

    tapState.current.timer = setTimeout(() => {
      executeGesture(tapState.current.zone!, tapState.current.count);
      tapState.current.zone = null;
      tapState.current.count = 0;
      tapState.current.timer = null;
    }, TAP_WINDOW_MS);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden select-none touch-none"
      onPointerUp={handlePointerUp}
    >
      <video
        ref={ref}
        className="w-full h-full object-contain"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={(e) => e.preventDefault()}
      >
        <source src={getVideoUrl(video?.filepath)} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="flex-1" />
        <div className="flex-1" />
        <div className="flex-1" />
      </div>

      {}
      {feedback && (
        <div
          key={feedback.key}
          className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-200"
        >
          <div className="bg-black/60 rounded-full p-4 text-white">
            {feedback.type === "seek-forward" && (
              <div className="flex items-center gap-2 text-lg font-medium">
                <RotateCw className="w-8 h-8" />
                +10s
              </div>
            )}
            {feedback.type === "seek-back" && (
              <div className="flex items-center gap-2 text-lg font-medium">
                <RotateCcw className="w-8 h-8" />
                -10s
              </div>
            )}
            {feedback.type === "play" && <Play className="w-10 h-10 fill-white" />}
            {feedback.type === "pause" && (
              <Pause className="w-10 h-10 fill-white" />
            )}
          </div>
        </div>
      )}

      {}
      {!isPlaying && !feedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-3">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 pointer-events-none">
        <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight">
          Double-tap sides to seek · Tap center to play/pause · Triple-tap center
          for next · Triple-tap left for comments · Triple-tap right to exit
        </p>
      </div>
    </div>
  );
}
