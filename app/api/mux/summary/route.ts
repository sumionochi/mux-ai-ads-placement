import { NextRequest, NextResponse } from "next/server";
import { getSummaryAndTags } from "@mux/ai/workflows";

export async function POST(req: NextRequest) {
  try {
    const { assetId, provider = "openai", tone = "normal" } = await req.json();

    console.log("📝 Generating video summary...");
    console.log("   Asset ID:", assetId);
    console.log("   Provider:", provider);
    console.log("   Tone:", tone);

    // Validate input
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    // Check if API key exists
    const apiKey =
      provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `Missing ${provider.toUpperCase()} API key in environment variables`,
        },
        { status: 500 }
      );
    }

    // Generate summary and tags using @mux/ai
    // Remove type assertions - let TypeScript infer
    const result = await getSummaryAndTags(assetId, {
      provider,
      tone,
    });

    console.log("✅ Summary generated successfully");
    console.log(`   Title: ${result.title}`);
    console.log(
      `   Description length: ${result.description.length} characters`
    );
    console.log(`   Tags found: ${result.tags.length}`);

    return NextResponse.json({
      success: true,
      title: result.title,
      description: result.description,
      tags: result.tags,
      tagCount: result.tags.length,
    });
  } catch (error: any) {
    console.error("❌ Failed to generate summary:", error);

    // Handle specific errors
    if (error.message?.includes("No text tracks found")) {
      return NextResponse.json(
        {
          error:
            "Captions not ready yet. Please wait 2-3 minutes after upload and try again.",
          code: "CAPTIONS_NOT_READY",
        },
        { status: 400 }
      );
    }

    if (error.message?.includes("API key")) {
      return NextResponse.json(
        {
          error: "AI provider API key not configured",
          code: "API_KEY_MISSING",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to generate summary",
        code: "GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}
