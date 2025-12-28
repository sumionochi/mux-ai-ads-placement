import { NextRequest, NextResponse } from "next/server";

// In-memory storage for generation progress
// In production, use Redis or a database
const progressStore = new Map<
  string,
  {
    status: "pending" | "generating" | "completed" | "failed";
    progress: number;
    videoUrl?: string;
    error?: string;
  }
>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const progress = progressStore.get(id);

    if (!progress) {
      return NextResponse.json(
        {
          success: false,
          error: "Generation not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...progress,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    progressStore.set(id, body);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Export store for use in other routes
export { progressStore };
