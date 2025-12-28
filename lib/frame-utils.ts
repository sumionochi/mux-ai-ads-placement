import { Chapter } from "./types";

// Generate Mux thumbnail URL at specific timestamp
export function getMuxThumbnailUrl(
  playbackId: string,
  timestamp: number,
  width: number = 1920
): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timestamp}&width=${width}`;
}

// Convert image URL to base64 (Server-side compatible)
export async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  return base64;
}

// Generate transition opportunities from chapters
export function generateTransitionOpportunities(
  chapters: Chapter[],
  playbackId: string,
  videoId: string
): Array<{
  id: string;
  video_id: string;
  frame_a_time: number;
  frame_b_time: number;
  frame_a_url: string;
  frame_b_url: string;
  status: "pending";
}> {
  const opportunities = [];

  // Create opportunities between consecutive chapters
  for (let i = 0; i < chapters.length - 1; i++) {
    const frameATime = chapters[i].end_time - 1; // 1 second before chapter end
    const frameBTime = chapters[i + 1].start_time + 1; // 1 second after next chapter start

    opportunities.push({
      id: `transition_${videoId}_${i}`,
      video_id: videoId,
      frame_a_time: frameATime,
      frame_b_time: frameBTime,
      frame_a_url: getMuxThumbnailUrl(playbackId, frameATime),
      frame_b_url: getMuxThumbnailUrl(playbackId, frameBTime),
      status: "pending" as const,
    });
  }

  return opportunities;
}
