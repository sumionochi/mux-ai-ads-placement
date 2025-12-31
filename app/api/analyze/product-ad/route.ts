import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/ai-clients";

const HARDCODED_PROMPT_TEMPLATE = `
The video continues smoothly. A {{PRODUCT_DESCRIPTION}} appears naturally in the scene. Ideally someone interacts with or holds the product, but at minimum it blends seamlessly into the environment. Keep the original visual style.
`;

export async function POST(req: NextRequest) {
  try {
    const {
      transitionId,
      frameAUrl,
      frameBUrl,
      productImageBase64,
      mode, // "template" or "ai"
    } = await req.json();

    console.log("🔍 Starting GPT-4V analysis for:", transitionId);
    console.log("📋 Mode:", mode);

    if (mode === "template") {
      // TEMPLATE MODE: Extract product description only
      return await handleTemplateMode(
        transitionId,
        frameAUrl,
        frameBUrl,
        productImageBase64
      );
    } else {
      // AI MODE: Full custom analysis
      return await handleAIMode(
        transitionId,
        frameAUrl,
        frameBUrl,
        productImageBase64
      );
    }
  } catch (error: any) {
    console.error("❌ GPT-4V analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Analysis failed" },
      { status: 500 }
    );
  }
}

// TEMPLATE MODE: Extract product description only and insert into hardcoded template
async function handleTemplateMode(
  transitionId: string,
  frameAUrl: string,
  frameBUrl: string,
  productImageBase64: string
) {
  console.log("📋 Using TEMPLATE mode - extracting product description only");

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are a product description expert. Analyze the product image and provide an EXTREMELY DETAILED description.

CRITICAL: Be very specific about:
- Brand name and exact model (if visible)
- Precise colors (e.g., "midnight blue with rose gold accents" not just "blue")
- Materials and textures (e.g., "brushed aluminum with soft-touch rubber grips")
- ALL distinctive features and design elements
- Logo placement, text, or branding visible (exact location and appearance)
- Size and proportions relative to typical products
- Finish details (glossy, matte, brushed, textured, etc.)
- Any unique characteristics that make this product identifiable

Write 5-8 detailed sentences. Be so specific that someone could identify the exact product without seeing it.

Respond with JSON only:
{
  "productName": "Full brand and model if identifiable, otherwise generic name",
  "detailedProductDescription": "Your extremely detailed 5-8 sentence description here."
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product in EXTREME detail for video generation:",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${productImageBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const result = JSON.parse(response.choices[0].message.content!);

  // Insert description into hardcoded template
  const finalPrompt = HARDCODED_PROMPT_TEMPLATE.replace(
    "{{PRODUCT_DESCRIPTION}}",
    result.detailedProductDescription
  );

  console.log("✅ Template mode complete:", {
    product: result.productName,
    descriptionLength: result.detailedProductDescription.length,
    promptLength: finalPrompt.length,
  });

  return NextResponse.json({
    success: true,
    analysis: {
      productName: result.productName,
      detailedProductDescription: result.detailedProductDescription,
      integrationStrategy: "Template-Based (Hardcoded)",
      reasoning:
        "Using proven prompt template with extracted product description for consistent, narrative-first integration.",
      duration: 5, // Default to 5s for Wan
      soraPrompt: finalPrompt,
      mode: "template",
    },
  });
}

// AI MODE: Full custom analysis with scene-specific prompt
async function handleAIMode(
  transitionId: string,
  frameAUrl: string,
  frameBUrl: string,
  productImageBase64: string
) {
  console.log("🤖 Using AI mode - full custom analysis");

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `You are an expert at creating natural product ad transitions for video generation.

Analyze the exit frame, entry frame, and product image to create a CUSTOM prompt tailored to this specific transition.

CRITICAL: Provide an EXACT, DETAILED description of the product including:
- Brand name and exact model (if visible)
- Precise colors with specific shades
- Materials and textures
- ALL distinctive features
- Logo placement and appearance
- Size and proportions
- Finish details

The visual reference will be the EXIT FRAME only.
Your prompt must describe how to:
1. Start from the exit frame scene
2. Naturally reveal the product with your detailed description
3. Transition toward the entry frame's context/mood

Respond with JSON only:
{
  "productName": "Exact product name/model if identifiable",
  "detailedProductDescription": "VERY detailed description: brand, exact colors, materials, features, dimensions, textures, logos, text. 3-5 sentences minimum.",
  "integrationStrategy": "how to integrate (reflection/background/foreground/interaction/wearable/handheld/environment)",
  "reasoning": "2-3 sentences explaining why this approach works for these specific frames",
  "duration": 5,
  "soraPrompt": "Complete video generation prompt (400-600 words). Describe a transition from the exit frame that naturally introduces the product with your EXACT detailed description, then flows toward the entry frame. Include camera movement, lighting, timing, and motion details."
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "EXIT FRAME (scene before ad - this will be the visual reference):",
          },
          {
            type: "image_url",
            image_url: { url: frameAUrl },
          },
          {
            type: "text",
            text: "\nENTRY FRAME (scene after ad - for context/target mood):",
          },
          {
            type: "image_url",
            image_url: { url: frameBUrl },
          },
          {
            type: "text",
            text: "\nPRODUCT TO ADVERTISE (analyze in extreme detail):",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${productImageBase64}`,
            },
          },
          {
            type: "text",
            text: `Create a custom video generation prompt tailored to these specific frames and this product.`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const result = JSON.parse(response.choices[0].message.content!);

  console.log("✅ AI mode complete:", {
    product: result.productName,
    descriptionLength: result.detailedProductDescription.length,
    strategy: result.integrationStrategy,
    promptLength: result.soraPrompt.length,
  });

  return NextResponse.json({
    success: true,
    analysis: {
      ...result,
      mode: "ai",
    },
  });
}
