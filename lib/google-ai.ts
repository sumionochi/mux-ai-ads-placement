// import { GoogleGenerativeAI } from "@google/generative-ai";

// if (!process.env.GOOGLE_AI_API_KEY) {
//   throw new Error("Missing Google AI API key in .env.local");
// }

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// // Gemini for vision analysis
// export const geminiVision = genAI.getGenerativeModel({
//   model: "gemini-2.0-flash-exp",
// });

// // Note: Veo integration will be added in Phase 4
// export const veo = {
//   // Placeholder for Veo 3.1 integration
//   generate: async (prompt: string) => {
//     throw new Error("Veo integration coming in Phase 4");
//   },
// };

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key in .env.local");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Using OpenAI for vision analysis instead of Gemini
export const geminiVision = {
  generateContent: async (parts: any[]) => {
    // Convert Gemini format to OpenAI format
    const messages: any[] = [
      {
        role: "user",
        content: parts.map((part) => {
          if (part.inlineData) {
            return {
              type: "image_url",
              image_url: {
                url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              },
            };
          } else if (part.text) {
            return {
              type: "text",
              text: part.text,
            };
          }
          return part;
        }),
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1500,
    });

    return {
      response: {
        text: () => response.choices[0].message.content || "",
      },
    };
  },
};

// Placeholder for Veo integration (Phase 4)
export const veo = {
  generate: async (prompt: string) => {
    throw new Error("Veo integration coming in Phase 4");
  },
};
