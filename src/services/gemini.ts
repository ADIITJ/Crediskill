import { GoogleGenAI, Type } from "@google/genai";

// Support multiple API keys separated by commas for fallback/rotation
const API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function getAIInstance() {
  const key = API_KEYS[currentKeyIndex] || "";
  return new GoogleGenAI({ apiKey: key });
}

async function withFallback<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  let lastError: any;
  const startIdx = currentKeyIndex;

  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      const ai = getAIInstance();
      return await fn(ai);
    } catch (error: any) {
      lastError = error;
      // If it's a rate limit or auth error, try the next key
      if (error.message?.includes("429") || error.message?.includes("401") || error.message?.includes("API_KEY_INVALID")) {
        console.warn(`Gemini API Key ${currentKeyIndex} failed, trying next...`);
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        // If we've looped back to the start, stop and throw
        if (currentKeyIndex === startIdx) break;
      } else {
        // For other errors, throw immediately
        throw error;
      }
    }
  }
  throw lastError || new Error("All Gemini API keys failed");
}

export async function generateTask(skill: string, difficulty: string, submissionType: string) {
  return withFallback(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{
          text: `Create a specific, verifiable micro-task for the skill "${skill}" at "${difficulty}" difficulty level. 
          The submission type is "${submissionType}". 
          
          The task must include:
          1. A clear, professional title.
          2. A detailed scenario that puts the user in a realistic situation.
          3. A set of 3-5 specific, measurable requirements that the user must meet.
          4. Clear submission instructions.
          
          If it's a design/painting task, the scenario should focus on visual elements and specific design constraints.
          If it's a video task, focus on performance, explanation, or demonstration of a specific concept.
          If it's a code task, provide a specific logic challenge or architectural problem.
          
          Return ONLY a JSON object with these keys: title, scenario, requirements (array), starterCode (optional string), submissionInstructions.`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            scenario: { type: Type.STRING },
            requirements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            starterCode: { type: Type.STRING },
            submissionInstructions: { type: Type.STRING }
          },
          required: ["title", "scenario", "requirements", "submissionInstructions"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function generateAntiCheat(title: string, code: string) {
  return withFallback(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [{
          text: `Generate a multiple-choice question about the specific logic in the following code for the task "${title}" to verify the author's understanding. The question should be challenging but fair.
          
          Code:
          ${code}
          
          Return ONLY a JSON object with these keys: question, options (array of 4 strings), correctIndex (integer).`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctIndex: { type: Type.INTEGER }
          },
          required: ["question", "options", "correctIndex"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}

export async function evaluateSubmission(task: any, submission: string, type: string, mimeType?: string) {
  return withFallback(async (ai) => {
    const prompt = `Evaluate the following submission for the task "${task.title}".
      
      Task Scenario: ${task.scenario}
      Requirements: ${task.requirements.join(", ")}
      
      Submission Type: ${type}
      
      CRITICAL: You must evaluate the submission STRICTLY against the Scenario and Requirements provided above. 
      If the submission does not address the specific scenario or fails to meet the core requirements, it should receive a low score and "failed" status.
      
      You are a world-class expert in this field. Analyze the submission deeply.
      If it's code, look for efficiency, edge cases, and best practices.
      If it's an image, look for composition, technical skill, and adherence to the prompt.
      If it's a video, look for clarity, engagement, and content accuracy.
      
      Provide JSON with these keys:
      1. reasoning: A detailed reasoning of your evaluation.
      2. score: A score (0-100).
      3. status: A verification status ("verified" if score > 70 and requirements met, otherwise "failed").
      4. feedback: A list of specific feedback points.`;

    const parts: any[] = [{ text: prompt }];

    if (type === 'code') {
      parts.push({ text: `Code Submission:\n${submission}` });
    } else {
      parts.push({
        inlineData: {
          data: submission,
          mimeType: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4')
        }
      });
    }

    const response = await ai.models.generateContent({
      model: type === 'code' ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING },
            score: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ["verified", "failed"] },
            feedback: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["reasoning", "score", "status", "feedback"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
}
