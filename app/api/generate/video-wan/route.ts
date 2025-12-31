import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";

interface GenerateWanRequest {
  transitionId: string;
  frameAUrl: string;
  soraPrompt: string;
  duration: 5 | 10 | 12;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateWanRequest = await req.json();

    console.log("🎥 Starting Wan 2.5 generation:", body.transitionId);

    await updateProgress(body.transitionId, {
      status: "generating",
      progress: 10,
    });

    generateWanVideoAsync(
      body.transitionId,
      body.frameAUrl,
      body.soraPrompt,
      body.duration
    );

    return NextResponse.json({
      success: true,
      generationId: body.transitionId,
    });
  } catch (error: any) {
    console.error("❌ Generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateWanVideoAsync(
  transitionId: string,
  frameAUrl: string,
  prompt: string,
  duration: 5 | 10 | 12
) {
  try {
    const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

    if (!WAVESPEED_API_KEY) {
      throw new Error("WAVESPEED_API_KEY not set");
    }

    await updateProgress(transitionId, { status: "generating", progress: 15 });

    // Skip downloading - use Mux URL directly
    // Wan can access Mux URLs but not localhost
    console.log("🖼️  Using Mux frame URL directly:", frameAUrl);

    await updateProgress(transitionId, { status: "generating", progress: 20 });

    // Map duration: Wan supports 5 or 10 seconds
    const wanDuration = duration <= 6 ? 5 : 10;

    console.log("🎬 Sending to Wan 2.5");
    console.log("📝 Prompt:", prompt.substring(0, 200) + "...");
    console.log("📝 Prompt length:", prompt.length, "characters");
    console.log(
      "⏱️  Duration:",
      wanDuration,
      "seconds (mapped from",
      duration,
      ")"
    );
    console.log("🖼️  Image URL:", frameAUrl);

    // Submit to Wan 2.5 using Mux URL directly
    const submitResponse = await fetch(
      "https://api.wavespeed.ai/api/v3/alibaba/wan-2.5/image-to-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        body: JSON.stringify({
          duration: wanDuration,
          enable_prompt_expansion: false,
          image: frameAUrl, // ⬅️ MUX URL DIRECTLY
          prompt: prompt,
          resolution: "720p",
          seed: -1,
        }),
      }
    );

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Wan API error: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    const requestId = submitResult.data.id;

    console.log("✅ Wan job created:", requestId);

    await updateProgress(transitionId, { status: "generating", progress: 25 });

    // Poll for completion
    const maxAttempts = 180; // 15 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds

      const statusResponse = await fetch(
        `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
        {
          headers: {
            Authorization: `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("❌ Status check failed:", errorText);
        attempts++;
        continue;
      }

      const statusResult = await statusResponse.json();
      const data = statusResult.data;
      const status = data.status;

      attempts++;
      console.log(`📊 Poll ${attempts}/${maxAttempts} - Status: ${status}`);

      // Estimate progress based on status
      let progress = 30;
      if (status === "processing") {
        progress = 30 + attempts * 0.5; // Gradually increase
      } else if (status === "completed") {
        progress = 90;
      }

      await updateProgress(transitionId, {
        status: "generating",
        progress: Math.min(Math.round(progress), 85),
      });

      if (status === "completed") {
        const videoUrl = data.outputs[0];
        console.log("✅ Wan generation completed:", videoUrl);

        await updateProgress(transitionId, {
          status: "generating",
          progress: 90,
        });

        // Download the video
        console.log("📥 Downloading generated video...");
        const videoResponse = await fetch(videoUrl);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        const filename = `${transitionId}_${Date.now()}.mp4`;
        const outputPath = path.join(process.cwd(), "tmp", "ads", filename);

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, videoBuffer);

        console.log("✅ Video saved:", outputPath);

        await updateProgress(transitionId, {
          status: "completed",
          progress: 100,
          videoUrl: `/api/video/${filename}`,
        });

        break;
      } else if (status === "failed") {
        console.error("❌ Wan generation failed:", data.error);
        throw new Error(
          `Wan generation failed: ${data.error || "Unknown error"}`
        );
      } else {
        console.log("⏳ Task still processing...");
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error("Video generation timeout after 15 minutes");
    }
  } catch (error: any) {
    console.error("❌ Generation failed:", error);
    console.error("❌ Error details:", error.message || error.toString());

    const errorMessage = error.message || error.toString();

    await updateProgress(transitionId, {
      status: "failed",
      progress: 0,
      error: errorMessage,
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
    console.error("Progress update failed:", error);
  }
}
