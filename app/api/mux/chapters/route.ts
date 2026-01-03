import { NextRequest, NextResponse } from "next/server";
import { generateChapters } from "@mux/ai/workflows";

export async function POST(req: NextRequest) {
  try {
    const { assetId, language = "en", provider = "openai" } = await req.json();

    console.log("🎬 Generating AI chapters...");
    console.log("   Asset ID:", assetId);
    console.log("   Language:", language);
    console.log("   Provider:", provider);

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

    // Generate chapters using @mux/ai
    const result = await generateChapters(assetId, language, {
      provider: provider as "openai" | "anthropic",
    });

    console.log("✅ AI chapters generated successfully");
    console.log(`   Found ${result.chapters.length} chapters`);

    return NextResponse.json({
      success: true,
      chapters: result.chapters,
      count: result.chapters.length,
    });
  } catch (error: any) {
    console.error("❌ Failed to generate chapters:", error);

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
        error: error.message || "Failed to generate chapters",
        code: "GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}
