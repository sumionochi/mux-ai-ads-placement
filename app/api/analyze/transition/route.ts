import { NextRequest, NextResponse } from "next/server";
import { geminiVision } from "@/lib/google-ai";
import { imageUrlToBase64 } from "@/lib/frame-utils";

export async function POST(req: NextRequest) {
  try {
    const { frameAUrl, frameBUrl, frameATime, frameBTime } = await req.json();

    if (!frameAUrl || !frameBUrl) {
      return NextResponse.json(
        { error: "Frame URLs are required" },
        { status: 400 }
      );
    }

    console.log("🔍 Analyzing transition:", { frameATime, frameBTime });

    // Convert images to base64
    const frameABase64 = await imageUrlToBase64(frameAUrl);
    const frameBBase64 = await imageUrlToBase64(frameBUrl);

    // Build Veo-optimized prompt for Gemini
    const prompt = `You are an expert video ad transition designer working with Google's Veo 3.1 video generation AI.

Analyze these two consecutive video frames and design a seamless 3-5 second ad transition between them.

Frame A (before ad): This is what's happening BEFORE the ad
Frame B (after ad): This is what's happening AFTER the ad

Your task:
1. Analyze both frames for visual elements, lighting, motion, and context
2. Suggest a product/brand that would naturally fit
3. Create a detailed Veo 3.1 prompt that generates a smooth transition ad

CRITICAL VEO 3.1 PROMPT REQUIREMENTS:
- Start with camera movement (pan, zoom, tracking shot, etc.)
- Describe the motion flow from Frame A context to Frame B context
- Specify exact timing ("over 4 seconds", "3-second shot")
- Match lighting conditions from both frames
- Include depth cues and perspective
- Describe continuous motion (no cuts)
- Be concrete and specific (avoid abstract language)

Output ONLY valid JSON (no markdown, no backticks):
{
  "frame_a_analysis": "Description of Frame A: scene type, objects, lighting, motion",
  "frame_b_analysis": "Description of Frame B: scene type, objects, lighting, motion",
  "visual_continuity": "Shared visual elements between frames (colors, lighting, setting)",
  "product_opportunity": "What product/brand would fit naturally here",
  "brand_category": "Category like 'food', 'tech', 'beverage', 'fashion'",
  "veo_prompt": "Complete Veo 3.1 video generation prompt (100-300 words)",
  "motion_description": "Specific camera and object motion",
  "lighting": "Lighting conditions to match",
  "camera": "Camera movement type",
  "transition_reason": "Why this transition would feel natural to viewers",
  "duration": 4
}

Example GOOD veo_prompt:
"A smooth 4-second tracking shot starting with a close-up of hands typing on a laptop keyboard, camera slowly pulls back revealing a sleek wireless mouse on a wooden desk, warm afternoon sunlight streams from the left creating soft shadows, the mouse rotates 180 degrees showcasing its ergonomic design, camera continues pulling back to reveal a professional home office setup with plants in soft focus, transitions smoothly to hands reaching for a coffee cup, maintaining the same warm lighting and shallow depth of field, professional commercial photography aesthetic"

Example BAD veo_prompt:
"Show a mouse in an office"

Remember: Veo 3.1 needs detailed, concrete descriptions with camera movement, timing, and lighting.`;

    // Call Gemini Vision API
    const result = await geminiVision.generateContent([
      {
        inlineData: {
          data: frameABase64,
          mimeType: "image/jpeg",
        },
      },
      {
        inlineData: {
          data: frameBBase64,
          mimeType: "image/jpeg",
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("📝 Gemini raw response:", text);

    // Parse JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanedText = text
        .replace(/```json\n/g, "")
        .replace(/```\n/g, "")
        .replace(/```/g, "")
        .trim();

      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Invalid JSON response from Gemini");
    }

    // Validate required fields
    if (!analysis.veo_prompt || !analysis.product_opportunity) {
      throw new Error("Incomplete analysis from Gemini");
    }

    console.log("✅ Analysis complete:", {
      product: analysis.product_opportunity,
      promptLength: analysis.veo_prompt.length,
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("❌ Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
