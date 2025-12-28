export interface GenerationProgress {
  transitionId: string;
  status: "pending" | "generating" | "completed" | "failed";
  progress: number;
  videoPath?: string;
  error?: string;
}

export async function generateTransitionVideo(
  transitionId: string,
  prompt: string,
  duration: number = 4
): Promise<string> {
  const response = await fetch("/api/generate/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transitionId,
      prompt,
      duration,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Video generation failed");
  }

  return data.videoPath;
}

export function getVideoPreviewUrl(filename: string): string {
  // For local testing, videos will be in tmp/ads/
  // In production, these would be served from a CDN or Mux
  return `/tmp/ads/${filename}`;
}
