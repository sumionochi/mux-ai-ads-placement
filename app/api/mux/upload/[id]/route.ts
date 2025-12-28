import { NextRequest, NextResponse } from "next/server";
import mux from "@/lib/mux";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;

    // Check upload status
    const upload = await mux.video.uploads.retrieve(uploadId);

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        status: upload.status,
        asset_id: upload.asset_id,
        error: upload.error,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch upload:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch upload" },
      { status: 500 }
    );
  }
}
