
import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQuestion {
  text: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: string;
  explanation?: string;
  image?: string; 
  image_description?: string;
}

export interface GeneratedRTReading {
    text: string;
    type: 'WORD' | 'SENTENCE' | 'PASSAGE';
}

export interface ReadingEvaluation {
    isCorrect: boolean;
    feedback: string;
    encouragement: string;
    phoneticHelp?: string;
}

const generateImageUrl = (description: string): string => {
  if (!description || description.toLowerCase() === 'none') return '';
  const style = "clean cute cartoon style, high quality illustration for kids, simple white background, educational";
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(description + ', ' + style)}?width=512&height=512&nologo=true`;
};

/**
 * 🟢 AI วิเคราะห์การอ่านออกเสียง
 */
export const evaluateReading = async (
    targetText: string,
    transcriptText: string,
    apiKey: string
): Promise<ReadingEvaluation> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const prompt = `
        คุณคือ "พี่นกฮูก" ครูสอนภาษาไทยใจดีสำหรับเด็ก ป.1
        นักเรียนกำลังฝึกอ่านคำว่า: "${targetText}"
        ระบบบันทึกเสียงแปลงเสียงเด็กได้เป็นคำว่า: "${transcriptText}"

        หน้าที่ของคุณ:
        1. วิเคราะห์ว่าเด็กอ่านถูกต้องหรือไม่ (ให้ยอมรับความคลาดเคลื่อนของไมโครโฟนได้บ้าง เช่น ถ้าคำใกล้เคียงกันมากให้ถือว่าถูก)
        2. หากผิด: อธิบายสั้นๆ ว่าต้องออกเสียงอย่างไร (phoneticHelp) เช่น "ต้องออกเสียงควบกล้ำ ร เรือ ให้ชัดนะจ๊ะ"
        3. ให้คำแนะนำและคำชม (encouragement) ที่ทำให้เด็กอยากฝึกต่อ
        4. ใช้ภาษาที่น่ารัก เป็นกันเอง เหมือนพี่คุยกับน้อง

        คืนค่าเป็น JSON ตามโครงสร้างนี้เท่านั้น:
        {
            "isCorrect": boolean,
            "feedback": "คำอธิบายว่าทำไมถึงถูกหรือผิด",
            "encouragement": "คำชมหรือการให้กำลังใจ",
            "phoneticHelp": "วิธีออกเสียงที่ถูกต้อง (ถ้าผิด)"
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isCorrect: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING },
                        encouragement: { type: Type.STRING },
                        phoneticHelp: { type: Type.STRING }
                    },
                    required: ["isCorrect", "feedback", "encouragement"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No response from AI");
    } catch (e) {
        console.error("AI Evaluation Error:", e);
        return {
            isCorrect: targetText.trim() === transcriptText.trim(),
            feedback: "พี่นกฮูกกำลังตั้งใจฟังอยู่จ้ะ",
            encouragement: "เก่งมากเลยที่พยายามจ้ะ!"
        };
    }
};

/**
 * 🟢 AI สำหรับ RT การอ่านออกเสียง (Reading Aloud)
 */
export const generateRTReadingWithAI = async (
    type: 'WORD' | 'SENTENCE' | 'PASSAGE',
    instructions: string,
    apiKey: string,
    count: number = 20
): Promise<GeneratedRTReading[]> => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    
    const typePrompt = {
        'WORD': 'คำในบัญชีคำพื้นฐาน ป.1 จำนวน 20 คำ (คำที่มีตัวสะกดตรงมาตราและไม่ตรงมาตราง่ายๆ)',
        'SENTENCE': 'ประโยคสั้นๆ 10 ประโยค (ประโยค 3 ส่วนที่เด็ก ป.1 เข้าใจง่าย)',
        'PASSAGE': 'ข้อความสั้นๆ 1 เรื่อง (ความยาว 4-5 ประโยค เนื้อหาเกี่ยวกับกิจวัตรประจำวันหรือสัตว์เลี้ยง)'
    };
    
    const prompt = `
        คุณคือผู้เชี่ยวชาญการออกข้อสอบ RT (Reading Test) ชั้นประถมศึกษาปีที่ 1 ของประเทศไทย
        สร้างเนื้อหาสำหรับทดสอบ "การอ่านออกเสียง" ในรูปแบบ: ${typePrompt[type]}
        
        ข้อกำหนด:
        1. ใช้ภาษาไทยที่ถูกต้อง
        2. เลือกคำ/ประโยคที่มักใช้ในการสอบ RT ป.1 จริงๆ
        3. คำสั่งเพิ่มเติมจากครู: ${instructions}
        
        คืนค่าเป็น JSON Array ของสตริงเท่านั้น
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        if (response.text) {
            const data = JSON.parse(response.text);
            return data.map((t: string) => ({ text: t, type }));
        }
        return [];
    } catch (e) {
        console.error("RT Reading AI Error:", e);
        throw e;
    }
};

/**
 * 🟢 AI สำหรับ RT การอ่านรู้เรื่อง (Reading Comprehension)
 */
export const generateRTComprehensionWithAI = async (
  part: 'MATCHING' | 'SENTENCE' | 'PASSAGE',
  instructions: string,
  apiKey: string,
  count: number = 5
): Promise<GeneratedQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  let partRules = "";
  if (part === 'MATCHING') {
      partRules = "ตอนที่ 1 การอ่านรู้เรื่องคำ (จับคู่ภาพ): โจทย์เป็น 'คำศัพท์' และระบุ 'image_description' เป็นภาษาอังกฤษที่ชัดเจนสำหรับคำนั้น";
  } else if (part === 'SENTENCE') {
      partRules = "ตอนที่ 2 การอ่านรู้เรื่องประโยค: โจทย์เป็น 'ประโยคสั้นๆ' ให้เด็กเลือกคำตอบที่สัมพันธ์กับประโยค";
  } else {
      partRules = "ตอนที่ 3 การอ่านรู้เรื่องข้อความ: สร้าง 'ข้อความสั้น 1-2 บรรทัด' แล้วตั้งคำถาม 'ใคร ทำอะไร ที่ไหน เมื่อไหร่'";
  }

  const prompt = `
    สร้างข้อสอบ "RT การอ่านรู้เรื่อง" (ป.1) จำนวน ${count} ข้อ
    ส่วนที่ต้องการ: ${partRules}
    
    ข้อกำหนด:
    - ตัวเลือก 3-4 ข้อ
    - correct: ต้องระบุเป็นตัวเลข "1", "2", "3" หรือ "4" เท่านั้น
    - image_description: คำอธิบายภาพเป็นภาษาอังกฤษสั้นๆ (เช่น 'a red apple')
    - คำสั่งเพิ่มเติม: ${instructions}
    
    ส่งกลับเป็น JSON Array ของวัตถุตาม Schema
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY, 
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              c1: { type: Type.STRING },
              c2: { type: Type.STRING },
              c3: { type: Type.STRING },
              c4: { type: Type.STRING },
              correct: { type: Type.STRING, description: "Correct choice number (1, 2, 3, or 4)" },
              explanation: { type: Type.STRING },
              image_description: { type: Type.STRING }
            },
            required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any) => ({
        ...item,
        image: item.image_description ? generateImageUrl(item.image_description) : ''
      }));
    }
    return [];
  } catch (error) {
    console.error("RT Comprehension AI Error:", error);
    throw error;
  }
};

/**
 * 🟢 AI สำหรับข้อสอบวิชาทั่วไป
 */
export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  instructions: string,
  apiKey: string,
  count: number = 5
): Promise<GeneratedQuestion[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview"; 
  
  const prompt = `
    สร้างข้อสอบแบบเลือกตอบ ${count} ข้อ สำหรับนักเรียนชั้น ${grade}
    วิชา: ${subject}
    รายละเอียดเพิ่มเติม: ${instructions}
    
    ข้อกำหนด:
    - correct: ต้องระบุเป็นตัวเลข "1", "2", "3" หรือ "4"
    - คืนค่าเป็น JSON Array ของวัตถุตาม Schema
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY, 
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              c1: { type: Type.STRING },
              c2: { type: Type.STRING },
              c3: { type: Type.STRING },
              c4: { type: Type.STRING },
              correct: { type: Type.STRING, description: "Correct choice number (1, 2, 3, or 4)" },
              explanation: { type: Type.STRING },
              image_description: { type: Type.STRING }
            },
            required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any) => ({
        ...item,
        image: item.image_description ? generateImageUrl(item.image_description) : ''
      }));
    }
    return [];
  } catch (error) {
    console.error("General Question AI Error:", error);
    throw error;
  }
};
