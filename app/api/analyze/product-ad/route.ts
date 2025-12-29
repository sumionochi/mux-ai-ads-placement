import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai-clients";

export async function POST(req: NextRequest) {
  try {
    const { transitionId, frameAUrl, frameBUrl, productImageBase64 } =
      await req.json();

    console.log("🔍 Starting GPT-4V analysis for:", transitionId);

    // Single GPT-4V call analyzing everything
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating natural product ad transitions for Sora 2.0.

Analyze the exit frame, entry frame, and product to create the PERFECT Sora prompt.

The visual reference will be a composite: [Exit Frame | Product]
Your prompt should describe how to naturally transition from the exit frame, integrate the product, and flow to the entry frame context.

Respond with JSON only:
{
  "productName": "what the product is (be specific)",
  "integrationStrategy": "how to integrate it (reflection/background/foreground/interaction)",
  "reasoning": "2-3 sentences explaining why this approach works",
  "soraPrompt": "Complete Sora 2.0 prompt (300-500 words). Describe the full transition: starting from exit frame context, naturally revealing/integrating the product, and transitioning to match entry frame context. Include camera movement, lighting, timing, and motion details."
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "EXIT FRAME (scene before ad):",
            },
            {
              type: "image_url",
              image_url: { url: frameAUrl },
            },
            {
              type: "text",
              text: "\nENTRY FRAME (scene after ad):",
            },
            {
              type: "image_url",
              image_url: { url: frameBUrl },
            },
            {
              type: "text",
              text: "\nPRODUCT TO ADVERTISE:",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${productImageBase64}`,
              },
            },
            {
              type: "text",
              text: "\nCreate a Sora prompt for a natural 4-second ad transition. The visual reference will show [Exit Frame | Product] side-by-side. Your prompt should describe how to animate from the exit frame context, smoothly reveal/integrate the product, and transition to match the entry frame's context and style.",
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content!);

    console.log("✅ GPT-4V analysis complete:", {
      product: result.productName,
      strategy: result.integrationStrategy,
      promptLength: result.soraPrompt.length,
    });

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    console.error("❌ GPT-4V analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
