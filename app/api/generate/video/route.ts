import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai-clients";
import { toFile } from "openai";
import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, transitionId, frameAUrl, frameBUrl } =
      await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log("🎥 Starting Sora 2.0 video generation for:", transitionId);

    await updateProgress(transitionId, {
      status: "generating",
      progress: 10,
    });

    generateVideoAsync(transitionId, prompt, duration, frameAUrl, frameBUrl);

    return NextResponse.json({
      success: true,
      generationId: transitionId,
      message: "Video generation started",
    });
  } catch (error: any) {
    console.error("❌ Video generation error:", error);
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}

async function generateVideoAsync(
  transitionId: string,
  prompt: string,
  duration: number,
  frameAUrl?: string,
  frameBUrl?: string
) {
  let videoId: string | null = null;

  try {
    await updateProgress(transitionId, {
      status: "generating",
      progress: 15,
    });

    // Download and resize Frame A to match video resolution (1280x720)
    let frameAFile: any = undefined;

    if (frameAUrl) {
      console.log("📥 Downloading Frame A from Mux...");
      const frameResponse = await fetch(frameAUrl);
      const originalBuffer = Buffer.from(await frameResponse.arrayBuffer());

      console.log("🖼️  Resizing Frame A to 1280x720...");
      // Resize image to exactly match video dimensions
      const resizedBuffer = await sharp(originalBuffer)
        .resize(1280, 720, {
          fit: "cover", // Crop to fill exact dimensions
          position: "center",
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Use toFile helper with proper MIME type
      frameAFile = await toFile(resizedBuffer, "frame_a.jpg", {
        type: "image/jpeg",
      });

      console.log("✅ Frame A resized and prepared (1280x720)");
    }

    await updateProgress(transitionId, {
      status: "generating",
      progress: 20,
    });

    // Enhance prompt to describe transition from Frame A
    const enhancedPrompt = frameAUrl
      ? `Starting from this exact frame, ${prompt}. Maintain visual continuity and create a smooth transition.`
      : prompt;

    const validDurations: ("4" | "8" | "12")[] = ["4", "8", "12"];
    const durationStr = validDurations.includes(duration.toString() as any)
      ? (duration.toString() as "4" | "8" | "12")
      : "4";

    // Create video with Frame A as reference
    const createParams: any = {
      model: "sora-2",
      prompt: enhancedPrompt,
      seconds: durationStr,
      size: "1280x720",
    };

    // Add Frame A as input reference
    if (frameAFile) {
      createParams.input_reference = frameAFile;
    }

    console.log("🎬 Creating Sora video with params:", {
      model: createParams.model,
      seconds: createParams.seconds,
      size: createParams.size,
      hasInputReference: !!createParams.input_reference,
      promptLength: createParams.prompt.length,
    });

    const video = await openai.videos.create(createParams);

    videoId = video.id;
    console.log("✅ Sora job created with Frame A reference:", videoId);

    // Poll for completion
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const videoStatus = await openai.videos.retrieve(videoId);

      console.log(
        `🔄 Poll ${attempts + 1}: Status=${videoStatus.status}, Progress=${
          videoStatus.progress || 0
        }%`
      );

      const progress = Math.min(25 + (videoStatus.progress || 0) * 0.55, 80);
      await updateProgress(transitionId, {
        status: "generating",
        progress: Math.round(progress),
      });

      if (videoStatus.status === "completed") {
        await updateProgress(transitionId, {
          status: "generating",
          progress: 85,
        });

        // Download video
        const downloadUrl = `https://api.openai.com/v1/videos/${videoId}/content`;

        const videoResponse = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        });

        if (!videoResponse.ok) {
          throw new Error(`Download failed: ${videoResponse.statusText}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        const filename = `${transitionId}_${Date.now()}.mp4`;
        const outputPath = path.join(process.cwd(), "tmp", "ads", filename);

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, videoBuffer);

        console.log("✅ Video saved:", outputPath);
        console.log(
          "📊 File size:",
          (videoBuffer.length / 1024 / 1024).toFixed(2),
          "MB"
        );

        await updateProgress(transitionId, {
          status: "completed",
          progress: 100,
          videoUrl: `/api/video/${filename}`,
        });

        break;
      } else if (videoStatus.status === "failed") {
        // Log detailed error information
        console.error("❌ Sora generation failed with details:", {
          videoId: videoStatus.id,
          status: videoStatus.status,
          error: videoStatus.error,
          completed_at: videoStatus.completed_at,
          progress: videoStatus.progress,
        });

        // Extract error message
        const errorMessage = videoStatus.error
          ? typeof videoStatus.error === "string"
            ? videoStatus.error
            : (videoStatus.error as any).message ||
              JSON.stringify(videoStatus.error)
          : "Unknown error";

        throw new Error(`Sora generation failed: ${errorMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Generation timeout");
    }
  } catch (error: any) {
    console.error("❌ Async generation failed:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      videoId: videoId,
    });

    await updateProgress(transitionId, {
      status: "failed",
      progress: 0,
      error: error.message,
    });
  }
}

async function updateProgress(id: string, data: any) {
  try {
    await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/generate/status/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  } catch (error) {
    console.error("Failed to update progress:", error);
  }
}
