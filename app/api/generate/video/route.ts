import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai-clients";
import { toFile } from "openai";
import sharp from "sharp";
import path from "path";
import fs from "fs";

interface GenerateVideoRequest {
  transitionId: string;
  frameAUrl: string;
  productImageBase64: string;
  soraPrompt: string;
  duration: 4 | 8 | 12;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateVideoRequest = await req.json();

    console.log("🎥 Starting Sora generation:", body.transitionId);

    await updateProgress(body.transitionId, {
      status: "generating",
      progress: 10,
    });

    generateVideoAsync(
      body.transitionId,
      body.frameAUrl,
      body.productImageBase64,
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

async function generateVideoAsync(
  transitionId: string,
  frameAUrl: string,
  productImageBase64: string,
  soraPrompt: string,
  duration: 4 | 8 | 12
) {
  try {
    await updateProgress(transitionId, { status: "generating", progress: 15 });

    // Download Frame A
    console.log("📥 Downloading Frame A...");
    const frameAResponse = await fetch(frameAUrl);
    const frameABuffer = Buffer.from(await frameAResponse.arrayBuffer());

    // Decode product
    const productBuffer = Buffer.from(productImageBase64, "base64");

    await updateProgress(transitionId, { status: "generating", progress: 20 });

    // Create composite: [Frame A | Product]
    console.log("🖼️  Creating visual composite...");
    const composite = await createComposite(frameABuffer, productBuffer);

    const compositeFile = await toFile(composite, "reference.jpg", {
      type: "image/jpeg",
    });

    console.log("✅ Composite created");

    await updateProgress(transitionId, { status: "generating", progress: 25 });

    // Generate with Sora
    console.log("🎬 Sending to Sora 2.0");
    console.log("📝 Prompt:", soraPrompt);

    const video = await openai.videos.create({
      model: "sora-2",
      prompt: soraPrompt,
      seconds: duration.toString() as "4" | "8" | "12",
      size: "1280x720",
      input_reference: compositeFile,
    });

    console.log("✅ Sora job created:", video.id);

    // Poll for completion
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const videoStatus = await openai.videos.retrieve(video.id);

      const progress = Math.min(30 + (videoStatus.progress || 0) * 0.55, 85);
      await updateProgress(transitionId, {
        status: "generating",
        progress: Math.round(progress),
      });

      if (videoStatus.status === "completed") {
        await updateProgress(transitionId, {
          status: "generating",
          progress: 90,
        });

        // Download video
        const downloadUrl = `https://api.openai.com/v1/videos/${video.id}/content`;

        const videoResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        });

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
      } else if (videoStatus.status === "failed") {
        throw new Error(`Sora failed: ${videoStatus.error}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100000));
      attempts++;
    }
  } catch (error: any) {
    console.error("❌ Generation failed:", error);
    await updateProgress(transitionId, {
      status: "failed",
      progress: 0,
      error: error.message,
    });
  }
}

async function createComposite(
  frameABuffer: Buffer,
  productBuffer: Buffer
): Promise<Buffer> {
  const width = 1280;
  const height = 720;
  const halfWidth = width / 2;

  const [frameA, product] = await Promise.all([
    sharp(frameABuffer).resize(halfWidth, height, { fit: "cover" }).toBuffer(),

    sharp(productBuffer)
      .resize(halfWidth, height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0 },
      })
      .toBuffer(),
  ]);

  const composite = await sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: frameA, left: 0, top: 0 },
      { input: product, left: halfWidth, top: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return composite;
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
