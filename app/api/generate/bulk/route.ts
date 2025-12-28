import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { transitions, projectId } = await req.json();

    if (!transitions || !Array.isArray(transitions)) {
      return NextResponse.json(
        { error: "Transitions array is required" },
        { status: 400 }
      );
    }

    console.log(
      `🎬 Starting bulk generation for ${transitions.length} transitions`
    );

    // Start generation for each transition
    const generationPromises = transitions.map(async (transition: any) => {
      if (!transition.analysis) {
        return { id: transition.id, status: "skipped", reason: "No analysis" };
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/generate/video`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transitionId: transition.id,
              prompt: transition.analysis.veo_prompt,
              duration: transition.analysis.duration,
            }),
          }
        );

        const data = await response.json();

        return {
          id: transition.id,
          status: data.success ? "started" : "failed",
          generationId: data.generationId,
          error: data.error,
        };
      } catch (error: any) {
        return {
          id: transition.id,
          status: "failed",
          error: error.message,
        };
      }
    });

    const results = await Promise.all(generationPromises);

    console.log("✅ Bulk generation initiated:", results);

    return NextResponse.json({
      success: true,
      results,
      message: `Started generation for ${
        results.filter((r) => r.status === "started").length
      } transitions`,
    });
  } catch (error: any) {
    console.error("❌ Bulk generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
