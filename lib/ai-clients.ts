import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OpenAI API key in .env.local");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Using OpenAI for vision analysis
export const vision = {
  generateContent: async (parts: any[]) => {
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

export { openai };
