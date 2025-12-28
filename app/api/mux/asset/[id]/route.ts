import { NextRequest, NextResponse } from "next/server";
import mux from "@/lib/mux";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;

    // Fetch asset details from Mux
    const asset = await mux.video.assets.retrieve(assetId);

    // Generate simple chapters based on duration
    // We'll use Mux thumbnails at these timestamps later
    let chapters = [];
    const duration = asset.duration || 0;

    if (duration > 0) {
      // Create chapters every 30 seconds
      const chapterDuration = 30;
      const numChapters = Math.ceil(duration / chapterDuration);

      for (let i = 0; i < numChapters; i++) {
        chapters.push({
          start_time: i * chapterDuration,
          end_time: Math.min((i + 1) * chapterDuration, duration),
          title: `Scene ${i + 1}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        playback_id: asset.playback_ids?.[0]?.id || "",
        status: asset.status,
        duration: asset.duration,
        aspect_ratio: asset.aspect_ratio,
        created_at: asset.created_at,
      },
      chapters,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch asset:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch asset" },
      { status: 500 }
    );
  }
}
