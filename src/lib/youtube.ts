const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export type ParsedYouTubeUrl = {
  videoId: string;
  normalizedUrl: string;
  thumbnailUrl: string;
  embedUrl: string;
};

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

function cleanVideoId(value: string | null | undefined): string | null {
  const candidate = value?.trim().split(/[?&#/]/)[0] ?? "";
  return YOUTUBE_VIDEO_ID_RE.test(candidate) ? candidate : null;
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = cleanVideoId(parts[0]);
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      videoId = cleanVideoId(url.searchParams.get("v"));
    } else if (parts[0] === "embed" || parts[0] === "shorts") {
      videoId = cleanVideoId(parts[1]);
    }
  }

  if (!videoId) return null;

  return {
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: youtubeThumbnailUrl(videoId),
    embedUrl: youtubeEmbedUrl(videoId),
  };
}
