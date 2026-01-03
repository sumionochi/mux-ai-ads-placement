import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  ensureDirectories,
  downloadFromHLS,
  getVideoDuration,
  clipVideo,
  buildSegmentPlan,
  concatenateVideos,
  cleanupFiles,
  validateVideoFile,
} from "@/lib/ffmpeg-utils";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { projectId, muxAssetId, playbackId, selectedTransitions } =
      await req.json();

    console.log("🎬 Starting video stitching:", projectId);
    console.log(`   Mux Asset ID: ${muxAssetId}`);
    console.log(`   Playback ID: ${playbackId}`);
    console.log(`   Selected transitions: ${selectedTransitions?.length || 0}`);

    // Validate input
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!muxAssetId) {
      return NextResponse.json(
        { error: "Mux Asset ID is required" },
        { status: 400 }
      );
    }

    if (!selectedTransitions || selectedTransitions.length === 0) {
      return NextResponse.json(
        { error: "No transitions selected for stitching" },
        { status: 400 }
      );
    }

    // Start async stitching (don't await - let it run in background)
    stitchVideoAsync(projectId, muxAssetId, playbackId, selectedTransitions);

    return NextResponse.json({
      success: true,
      message: "Stitching started",
      projectId: projectId,
    });
  } catch (error: any) {
    console.error("❌ Stitch API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start stitching" },
      { status: 500 }
    );
  }
}

/**
 * Async stitching function - runs in background
 */
async function stitchVideoAsync(
  projectId: string,
  muxAssetId: string,
  playbackId: string | undefined,
  selectedTransitions: any[]
) {
  let tempFiles: string[] = [];

  try {
    // Ensure directories exist
    ensureDirectories();

    // Update progress: Downloading
    await updateStitchProgress(projectId, {
      status: "downloading",
      progress: 10,
      totalSegments: selectedTransitions.length,
    });

    // Get Mux asset and HLS URL
    console.log("📥 Fetching Mux asset:", muxAssetId);
    const asset = await mux.video.assets.retrieve(muxAssetId);

    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      throw new Error("No playback IDs available for this asset");
    }

    // Use HLS stream URL (.m3u8) - this is the most reliable method
    const actualPlaybackId = playbackId || asset.playback_ids[0].id;
    const hlsUrl = `https://stream.mux.com/${actualPlaybackId}.m3u8`;

    console.log("📥 Downloading from HLS stream...");
    console.log("   Playback ID:", actualPlaybackId);
    console.log("   HLS URL:", hlsUrl);

    const originalVideoPath = path.join(
      process.cwd(),
      "tmp",
      `original_${projectId}.mp4`
    );

    // Download using FFmpeg from HLS stream
    await downloadFromHLS(hlsUrl, originalVideoPath);
    tempFiles.push(originalVideoPath);

    if (!validateVideoFile(originalVideoPath)) {
      throw new Error("Downloaded video file is invalid");
    }

    console.log("✅ Original video downloaded and validated");

    // Update progress: Planning
    await updateStitchProgress(projectId, {
      status: "planning",
      progress: 20,
    });

    // Get video duration
    const videoDuration = await getVideoDuration(originalVideoPath);
    console.log(`📊 Video duration: ${videoDuration.toFixed(2)}s`);

    // Build segment plan (smart algorithm - only selected transitions)
    const segmentPlan = buildSegmentPlan(selectedTransitions, videoDuration);

    const totalSegments = segmentPlan.length;
    console.log(`📋 Segment plan: ${totalSegments} segments total`);

    // Update progress: Clipping
    await updateStitchProgress(projectId, {
      status: "clipping",
      progress: 30,
      totalSegments: totalSegments,
    });

    // Process segments
    const segmentPaths: string[] = [];
    const progressPerSegment = 40 / segmentPlan.length; // 40% progress for clipping
    let currentProgress = 30;

    for (let i = 0; i < segmentPlan.length; i++) {
      const segment = segmentPlan[i];

      if (segment.type === "original") {
        // Clip original video segment
        const segmentPath = path.join(
          process.cwd(),
          "tmp",
          "segments",
          `segment_${projectId}_${i}_${Date.now()}.mp4`
        );

        await clipVideo(
          originalVideoPath,
          segmentPath,
          segment.start!,
          segment.duration!
        );

        if (!validateVideoFile(segmentPath)) {
          throw new Error(`Clipped segment ${i} is invalid`);
        }

        segmentPaths.push(segmentPath);
        tempFiles.push(segmentPath);
      } else {
        // Use generated ad video
        // segment.adPath is like "/api/video/filename.mp4"
        // We need to extract the filename and build the real filesystem path

        // Extract filename from URL path
        const filename = segment.adPath!.split("/").pop(); // Gets "filename.mp4"

        if (!filename) {
          throw new Error(`Invalid ad path: ${segment.adPath}`);
        }

        // Build actual filesystem path
        const adPath = path.join(process.cwd(), "tmp", "ads", filename);

        console.log(`📁 Looking for ad video: ${filename}`);
        console.log(`   Full path: ${adPath}`);

        if (!validateVideoFile(adPath)) {
          throw new Error(
            `Ad video not found or invalid: ${filename} (expected at ${adPath})`
          );
        }

        segmentPaths.push(adPath);
      }

      currentProgress += progressPerSegment;
      await updateStitchProgress(projectId, {
        status: "clipping",
        progress: Math.round(currentProgress),
        segmentsProcessed: i + 1,
        totalSegments: totalSegments,
      });
    }

    console.log(`✅ All ${segmentPaths.length} segments ready`);

    // Update progress: Concatenating
    await updateStitchProgress(projectId, {
      status: "concatenating",
      progress: 70,
    });

    // Concatenate all segments
    const timestamp = Date.now();
    const finalVideoPath = path.join(
      process.cwd(),
      "tmp",
      "final",
      `final_${projectId}_${timestamp}.mp4`
    );

    let totalDurationSec = 0;
    for (const p of segmentPaths) {
      totalDurationSec += await getVideoDuration(p);
    }

    await concatenateVideos(segmentPaths, finalVideoPath, (percent) => {
      const progress = 70 + Math.round(percent * 0.2); // 70-90%
      updateStitchProgress(projectId, {
        status: "concatenating",
        progress: Math.min(progress, 90),
      });
    });

    if (!validateVideoFile(finalVideoPath)) {
      throw new Error("Final video file is invalid");
    }

    console.log("✅ Final video created:", finalVideoPath);

    // Update progress: Finalizing
    await updateStitchProgress(projectId, {
      status: "finalizing",
      progress: 95,
    });

    // Cleanup temporary files (keep final video and ads)
    cleanupFiles(tempFiles);

    // ✅ UPDATED: Return both URL and file path
    const finalVideoFilename = path.basename(finalVideoPath);
    await updateStitchProgress(projectId, {
      status: "completed",
      progress: 100,
      videoUrl: `/api/video/${finalVideoFilename}`, // ⬅️ For display
      videoPath: finalVideoPath, // ⬅️ For Mux upload (actual file path)
    });

    console.log("🎉 Stitching complete!");
    console.log(`   Video URL: /api/video/${finalVideoFilename}`);
    console.log(`   File path: ${finalVideoPath}`);
    console.log(`   Segments used: ${segmentPlan.length}`);
    console.log(`   Ads included: ${selectedTransitions.length}`);
  } catch (error: any) {
    console.error("❌ Stitching failed:", error);
    console.error("❌ Error stack:", error.stack);

    // Cleanup on error
    cleanupFiles(tempFiles);

    await updateStitchProgress(projectId, {
      status: "failed",
      progress: 0,
      error: error.message || "Unknown error occurred",
    });
  }
}

/**
 * Helper to update progress
 */
async function updateStitchProgress(projectId: string, data: any) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/stitch/status/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("❌ Progress update failed:", error);
    // Don't throw - progress updates are not critical
  }
}
