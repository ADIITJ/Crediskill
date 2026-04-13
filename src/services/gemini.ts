import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuiz(theme: string, gameType: string, isKidFriendly: boolean = false) {
  const persona = isKidFriendly 
    ? "a super friendly, magical, and encouraging cartoon character" 
    : "the ultimate chaotic game show host";
  
  const tone = isKidFriendly
    ? "whimsical, simple, and full of positive reinforcement"
    : "edgy, dark humor, and slightly unhinged";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [{
        text: `You are ${persona}. Create a ${gameType} session with the theme: "${theme}". 
        The theme should be interpreted as ${isKidFriendly ? "strictly child-friendly, educational, and fun" : "creative and themed"}.
        
        Generate 5 unique and engaging questions.
        
        Rules for game types:
        - "quiz": 4 options, 1 correct answer. ${isKidFriendly ? "Make the wrong options silly but not confusing." : "Make the wrong options funny or plausible but slightly off."}
        - "guessing": Provide a ${isKidFriendly ? "simple and fun" : "cryptic or funny"} hint and the exact answer.
        - "competition": Provide a ${isKidFriendly ? "playful" : "weird"} challenge and a criteria for winning.
        
        Return ONLY a JSON array of objects with these keys: text, options (array of strings, ONLY for quiz), answer, explanation (a ${isKidFriendly ? "fun and easy to understand" : "funny or interesting"} fact about the answer).`
      }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["text", "answer", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function generateGameIntro(theme: string, gameType: string, isKidFriendly: boolean = false) {
  const persona = isKidFriendly 
    ? "a magical storyteller who loves children" 
    : "a crazy game show host who has had too much coffee and is broadcasting from a secret underground bunker";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [{
        text: `Generate a short, high-energy, and ${isKidFriendly ? "magical" : "absolutely unhinged"} introduction for a ${gameType} game with the theme "${theme}". 
        You are ${persona}. 
        ${isKidFriendly ? "Use lots of emojis and friendly words." : "Use ALL CAPS for emphasis occasionally."}
        Keep it under 80 words.`
      }]
    }
  });

  return response.text || (isKidFriendly ? "HELLO FRIENDS! ARE YOU READY TO PLAY? ✨" : "WELCOME TO THE CHAOS! LET'S PLAY!");
}

