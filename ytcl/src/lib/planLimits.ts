export const WATCH_LIMITS_SECONDS: Record<string, number> = {
  free: 5 * 60,
  bronze: 7 * 60,
  silver: 10 * 60,
  gold: Infinity,
};

export const getWatchLimitSeconds = (plan?: string) =>
  WATCH_LIMITS_SECONDS[plan || "free"] ?? WATCH_LIMITS_SECONDS.free;

export const formatWatchLimit = (plan?: string) => {
  const limit = getWatchLimitSeconds(plan);
  if (!isFinite(limit)) return "Unlimited";
  return `${limit / 60} minutes`;
};

export const getVideoUrl = (filepath: string) =>
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/${filepath}`;
