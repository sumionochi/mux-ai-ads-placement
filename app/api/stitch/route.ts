import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { projectId, segments, transitions } = await req.json();

    if (!projectId || !segments || !transitions) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("🎬 Starting video stitching for project:", projectId);
    console.log("📊 Segments:", segments.length);
    console.log("📊 Transitions:", transitions.length);

    // Create concat list for FFmpeg
    const concatList: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      // Add segment
      concatList.push(`file '${segments[i].path}'`);

      // Add transition if exists
      if (i < transitions.length && transitions[i].generated_video_path) {
        concatList.push(`file '${transitions[i].generated_video_path}'`);
      }
    }

    // Write concat list to temp file
    const concatListPath = path.join(
      process.cwd(),
      "tmp",
      `concat_${projectId}.txt`
    );
    fs.writeFileSync(concatListPath, concatList.join("\n"));

    // Call FFmpeg worker to stitch
    const response = await fetch(`${process.env.FFMPEG_SERVER_URL}/stitch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concatListPath,
        outputPath: path.join(
          process.cwd(),
          "tmp",
          "output",
          `final_${projectId}.mp4`
        ),
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error("FFmpeg stitching failed");
    }

    console.log("✅ Video stitched successfully:", data.outputPath);

    // Clean up concat list
    fs.unlinkSync(concatListPath);

    return NextResponse.json({
      success: true,
      outputPath: data.outputPath,
      message: "Video stitched successfully",
    });
  } catch (error: any) {
    console.error("❌ Stitching error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
