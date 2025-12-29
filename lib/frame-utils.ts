import { Chapter } from "./types";

// Generate Mux thumbnail URL at specific timestamp
export function getMuxThumbnailUrl(
  playbackId: string,
  timestamp: number,
  width: number = 1920
): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timestamp}&width=${width}`;
}

// Convert image URL to base64 (Server-side compatible with retry logic)
export async function imageUrlToBase64(url: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  console.log("📥 Fetching image from:", url);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`⏳ Attempt ${attempt}/${maxRetries} to fetch image...`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000), // 30 second timeout
        headers: {
          "User-Agent": "MuxAI-Studio/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      console.log(
        `✅ Image fetched successfully (${(buffer.length / 1024).toFixed(
          2
        )} KB)`
      );
      return base64;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Progressive delay: 2s, 4s, 6s
        console.log(`⏱️  Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error("❌ All fetch attempts failed for:", url);
  throw new Error(
    `Failed to fetch image after ${maxRetries} attempts: ${lastError?.message}`
  );
}

// Generate transition opportunities from chapters
export function generateTransitionOpportunities(
  chapters: Chapter[],
  playbackId: string,
  projectId: string // Changed from videoId to projectId for clarity
): Array<{
  id: string;
  project_id: string; // Changed from video_id to project_id
  frame_a_time: number;
  frame_b_time: number;
  frame_a_url: string;
  frame_b_url: string;
  status: "pending";
}> {
  const opportunities = [];

  console.log(
    `🎯 Generating transitions for project: ${projectId}, playback: ${playbackId}`
  );

  // Create opportunities between consecutive chapters
  for (let i = 0; i < chapters.length - 1; i++) {
    const frameATime = chapters[i].end_time - 1; // 1 second before chapter end
    const frameBTime = chapters[i + 1].start_time + 1; // 1 second after next chapter start

    const frameAUrl = getMuxThumbnailUrl(playbackId, frameATime);
    const frameBUrl = getMuxThumbnailUrl(playbackId, frameBTime);

    console.log(`📸 Transition ${i + 1}:`, {
      frameATime,
      frameBTime,
      frameAUrl,
      frameBUrl,
    });

    opportunities.push({
      id: `transition_${projectId}_${i}`,
      project_id: projectId,
      frame_a_time: frameATime,
      frame_b_time: frameBTime,
      frame_a_url: frameAUrl,
      frame_b_url: frameBUrl,
      status: "pending" as const,
    });
  }

  console.log(`✅ Generated ${opportunities.length} transition opportunities`);

  return opportunities;
}
