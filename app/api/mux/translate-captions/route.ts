import { NextRequest, NextResponse } from "next/server";
import mux from "@/lib/mux";

// Languages to translate to
const TARGET_LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "hi", name: "Hindi" },
];

export async function POST(req: NextRequest) {
  try {
    const { assetId } = await req.json();

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    console.log("🌍 Starting caption translation for asset:", assetId);

    // Step 1: Get the asset to find the English caption track
    const asset = await mux.video.assets.retrieve(assetId);

    // Find the English auto-generated caption track
    const englishTrack = asset.tracks?.find(
      (track) =>
        track.type === "text" &&
        track.text_source === "generated_vod" &&
        track.language_code === "en"
    );

    if (!englishTrack) {
      return NextResponse.json(
        { error: "No English captions found. Generate captions first." },
        { status: 400 }
      );
    }

    console.log("✅ Found English caption track:", englishTrack.id);

    // Step 2: Get the English VTT content
    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) {
      return NextResponse.json(
        { error: "No playback ID found" },
        { status: 400 }
      );
    }

    const vttUrl = `https://stream.mux.com/${playbackId}/text/${englishTrack.id}.vtt`;
    console.log("📥 Fetching VTT from:", vttUrl);

    const vttResponse = await fetch(vttUrl);
    if (!vttResponse.ok) {
      throw new Error("Failed to fetch VTT file");
    }

    const vttContent = await vttResponse.text();
    console.log("✅ VTT content fetched");

    // Step 3: Translate to each target language
    const translationResults = [];

    for (const lang of TARGET_LANGUAGES) {
      try {
        console.log(`🔄 Translating to ${lang.name}...`);

        // Use OpenAI for translation (you can also use Google Translate API)
        const translatedVtt = await translateVTT(
          vttContent,
          lang.code,
          lang.name
        );

        // Upload the translated VTT as a new text track
        // For now, we'll use a temporary approach - in production, upload to a CDN
        // then add as a track via Mux API

        translationResults.push({
          language: lang.code,
          name: lang.name,
          status: "completed",
          content: translatedVtt,
        });

        console.log(`✅ ${lang.name} translation complete`);
      } catch (error: any) {
        console.error(`❌ Translation failed for ${lang.name}:`, error.message);
        translationResults.push({
          language: lang.code,
          name: lang.name,
          status: "failed",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      assetId,
      englishTrackId: englishTrack.id,
      translations: translationResults,
      message: `Translated captions to ${
        translationResults.filter((r) => r.status === "completed").length
      } languages`,
    });
  } catch (error: any) {
    console.error("❌ Caption translation failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to translate captions" },
      { status: 500 }
    );
  }
}

/**
 * Translate VTT content using OpenAI
 */
async function translateVTT(
  vttContent: string,
  targetLang: string,
  langName: string
): Promise<string> {
  // Parse VTT to extract text lines
  const lines = vttContent.split("\n");
  const textLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip WEBVTT header, timestamps, and empty lines
    if (
      line &&
      !line.startsWith("WEBVTT") &&
      !line.includes("-->") &&
      !line.match(/^\d+$/) // Skip cue identifiers
    ) {
      textLines.push(line);
    }
  }

  const textToTranslate = textLines.join("\n");

  // Use OpenAI for translation
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following subtitle text to ${langName}. Keep the same line breaks. Only return the translated text, nothing else.`,
        },
        {
          role: "user",
          content: textToTranslate,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  const translatedText = data.choices[0].message.content;

  // Reconstruct VTT with translated text
  const translatedLines = translatedText.split("\n");
  let translatedIdx = 0;
  const newVttLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (i === 0 && line.startsWith("WEBVTT")) {
      newVttLines.push(line);
    } else if (line.includes("-->")) {
      newVttLines.push(lines[i]); // Keep timestamp as-is
    } else if (line.match(/^\d+$/)) {
      newVttLines.push(lines[i]); // Keep cue identifier
    } else if (line === "") {
      newVttLines.push("");
    } else {
      // Replace with translated text
      if (translatedIdx < translatedLines.length) {
        newVttLines.push(translatedLines[translatedIdx]);
        translatedIdx++;
      }
    }
  }

  return newVttLines.join("\n");
}
