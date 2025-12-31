import { NextRequest, NextResponse } from "next/server";

// In-memory storage for stitch progress
// In production, you'd use Redis or a database
const stitchProgress = new Map<
  string,
  {
    status:
      | "downloading"
      | "planning"
      | "clipping"
      | "concatenating"
      | "finalizing"
      | "completed"
      | "failed";
    progress: number;
    videoPath?: string;
    error?: string;
    segmentsProcessed?: number;
    totalSegments?: number;
  }
>();

/**
 * POST - Update progress
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await req.json();
    const { id: projectId } = await params;

    stitchProgress.set(projectId, data);

    console.log(
      `📊 Progress updated for ${projectId}:`,
      data.status,
      `${data.progress}%`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Failed to update progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get current progress
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const progress = stitchProgress.get(projectId);

    if (!progress) {
      return NextResponse.json({
        success: true,
        status: "pending",
        progress: 0,
      });
    }

    return NextResponse.json({
      success: true,
      ...progress,
    });
  } catch (error: any) {
    console.error("❌ Failed to get progress:", error);
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 }
    );
  }
}
