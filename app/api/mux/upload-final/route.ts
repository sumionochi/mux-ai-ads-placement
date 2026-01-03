import { NextRequest, NextResponse } from "next/server";
import mux from "@/lib/mux";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import fetch from "node-fetch";

export async function POST(req: NextRequest) {
  try {
    const { videoPath, projectId } = await req.json();

    console.log("📤 Starting Mux direct upload for final video...");
    console.log("   Video path (input):", videoPath);
    console.log("   Project ID:", projectId);

    // Validate input
    if (!videoPath || !projectId) {
      return NextResponse.json(
        { error: "Missing videoPath or projectId" },
        { status: 400 }
      );
    }

    // Convert to absolute file system path
    let absolutePath: string;

    if (videoPath.startsWith("/api/video/")) {
      const filename = path.basename(videoPath);
      absolutePath = path.join(process.cwd(), "tmp", "final", filename);
      console.log("🔄 Converted URL to file path:", absolutePath);
    } else if (videoPath.startsWith("/tmp/")) {
      absolutePath = videoPath;
    } else if (videoPath.startsWith("/")) {
      absolutePath = videoPath;
    } else {
      absolutePath = path.join(process.cwd(), videoPath);
    }

    console.log("📁 Final absolute path:", absolutePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      console.error("❌ File not found:", absolutePath);
      return NextResponse.json(
        { error: `Video file not found at: ${absolutePath}` },
        { status: 404 }
      );
    }

    const stats = fs.statSync(absolutePath);
    console.log("📊 File size:", (stats.size / 1024 / 1024).toFixed(2), "MB");

    // Step 1: Create a direct upload in Mux
    console.log("🔗 Creating Mux direct upload URL...");

    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        inputs: [
          {
            generated_subtitles: [
              {
                language_code: "en",
                name: "English (Auto)",
              },
            ],
          },
        ],
      },
      cors_origin: "*",
      timeout: 3600,
    });

    console.log("✅ Direct upload created:", upload.id);
    console.log("📤 Upload URL:", upload.url);

    // Step 2: Upload the file directly to Mux
    console.log("⬆️  Uploading file to Mux...");

    const fileStream = fs.createReadStream(absolutePath);

    const uploadResponse = await fetch(upload.url, {
      method: "PUT",
      body: fileStream,
      headers: {
        "Content-Type": "video/mp4",
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ Upload failed:", uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    console.log("✅ File uploaded successfully");

    // Step 3: Poll for asset creation
    console.log("⏳ Waiting for Mux to process asset...");

    let assetId: string | null = null;
    let playbackId: string | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait

    while (!assetId && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const uploadStatus = await mux.video.uploads.retrieve(upload.id);

      if (uploadStatus.asset_id) {
        assetId = uploadStatus.asset_id;

        // Get asset details to get playback ID
        const asset = await mux.video.assets.retrieve(assetId);
        playbackId = asset.playback_ids?.[0]?.id || null;

        console.log("✅ Asset created:", assetId);
        console.log("✅ Playback ID:", playbackId);
        break;
      }

      if (uploadStatus.status === "errored") {
        throw new Error(
          "Mux asset creation failed: " + uploadStatus.error?.message
        );
      }

      attempts++;
      console.log(`   Polling... attempt ${attempts}/${maxAttempts}`);
    }

    if (!assetId || !playbackId) {
      throw new Error("Asset creation timeout - took longer than 60 seconds");
    }

    return NextResponse.json({
      success: true,
      assetId,
      playbackId,
      uploadId: upload.id,
    });
  } catch (error: any) {
    console.error("❌ Mux upload failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload to Mux" },
      { status: 500 }
    );
  }
}
