import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/generate-task", async (req, res) => {
    const { skill, difficulty, submissionType } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a specific, verifiable micro-task for the skill "${skill}" at "${difficulty}" difficulty level. 
        The submission type is "${submissionType}". 
        If it's a design/painting task, the scenario should focus on visual elements.
        If it's a video task, focus on performance or explanation.
        If it's a code task, provide a specific logic challenge.`,
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
              starterCode: { type: Type.STRING, description: "Only for code tasks" },
              submissionInstructions: { type: Type.STRING }
            },
            required: ["title", "scenario", "requirements", "submissionInstructions"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Error generating task:", error);
      res.status(500).json({ error: "Failed to generate task" });
    }
  });

  app.post("/api/generate-anti-cheat", async (req, res) => {
    const { code } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a multiple-choice question about the specific logic in the following code to verify the author's understanding. The question should be challenging but fair.
        
        Code:
        ${code}`,
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
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Error generating anti-cheat:", error);
      res.status(500).json({ error: "Failed to generate anti-cheat" });
    }
  });

  app.post("/api/evaluate-submission", async (req, res) => {
    const { task, submission, type, mimeType } = req.body;
    try {
      let parts: any[] = [
        {
          text: `Evaluate the following submission for the task "${task.title}".
        
        Task Scenario: ${task.scenario}
        Requirements: ${task.requirements.join(", ")}
        
        Submission Type: ${type}
        
        Provide a score (0-100), verification status, and constructive feedback.
        Be strict but fair. If it's an image or video, analyze the visual/auditory quality and adherence to requirements.`
        }
      ];

      if (type === 'code') {
        parts.push({ text: `Code Submission:\n${submission}` });
      } else {
        // For image or video, submission is expected to be a base64 string
        parts.push({
          inlineData: {
            data: submission,
            mimeType: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4')
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              status: { type: Type.STRING, enum: ["verified", "failed"] },
              feedback: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["score", "status", "feedback"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Error evaluating submission:", error);
      res.status(500).json({ error: "Failed to evaluate submission" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
