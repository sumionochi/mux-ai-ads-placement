import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error("Missing Google AI API key in .env.local");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Gemini for vision analysis
export const geminiVision = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

// Note: Veo integration will be added in Phase 4
export const veo = {
  // Placeholder for Veo 3.1 integration
  generate: async (prompt: string) => {
    throw new Error("Veo integration coming in Phase 4");
  },
};
