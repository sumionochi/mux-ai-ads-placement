import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Check in multiple locations
    const possiblePaths = [
      path.join(process.cwd(), "tmp", "ads", filename),
      path.join(process.cwd(), "tmp", "final", filename),
    ];

    let videoPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        videoPath = p;
        break;
      }
    }

    if (!videoPath) {
      console.error("❌ Video not found:", filename);
      console.error("   Searched paths:", possiblePaths);
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    console.log("✅ Serving video:", videoPath);
    const videoBuffer = fs.readFileSync(videoPath);

    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error: any) {
    console.error("Video serving error:", error);
    return NextResponse.json(
      { error: "Failed to serve video" },
      { status: 500 }
    );
  }
}
