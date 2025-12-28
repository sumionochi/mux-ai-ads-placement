import { NextRequest, NextResponse } from "next/server";
import mux from "@/lib/mux";

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create Mux direct upload
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        // Removed mp4_support - not needed and deprecated
      },
      cors_origin: "*",
      timeout: 3600, // 1 hour timeout
    });

    console.log("✅ Mux upload created:", upload.id);

    return NextResponse.json({
      success: true,
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error: any) {
    console.error("❌ Mux upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create upload" },
      { status: 500 }
    );
  }
}
