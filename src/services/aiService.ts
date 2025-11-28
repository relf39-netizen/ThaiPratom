
import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQuestion {
  text: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: string;
  explanation: string;
}

export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  topic: string,
  apiKey: string,
  count: number = 1 // ✅ รับจำนวนข้อ (Default 1)
): Promise<GeneratedQuestion[] | null> => {
  try {
    if (!apiKey) {
      throw new Error("กรุณาระบุ API Key");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = "gemini-2.5-flash";
    
    const prompt = `
      Create ${count} multiple-choice question(s) for ${grade} grade students.
      Subject: ${subject}
      Topic: ${topic}
      Language: Thai (Make sure the question and choices are natural Thai).
      
      Requirements:
      - Return an array of objects.
      - Each object must have 4 choices (c1, c2, c3, c4).
      - Indicate the correct choice number (1, 2, 3, or 4).
      - Provide a short explanation for the correct answer.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY, // ✅ เปลี่ยนเป็น Array
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The question text" },
              c1: { type: Type.STRING, description: "Choice 1" },
              c2: { type: Type.STRING, description: "Choice 2" },
              c3: { type: Type.STRING, description: "Choice 3" },
              c4: { type: Type.STRING, description: "Choice 4" },
              correct: { type: Type.STRING, description: "The correct choice number '1', '2', '3', or '4'" },
              explanation: { type: Type.STRING, description: "Explanation of the answer" },
            },
            required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Ensure we return an array even if single object returned (rare case safety)
      return Array.isArray(data) ? data : [data];
    }
    
    return null;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
