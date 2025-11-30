
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sceneImage, objectImages, instruction } = await req.json();

    if (!sceneImage || !objectImages || objectImages.length === 0) {
      return NextResponse.json({ error: "Missing input images" }, { status: 400 });
    }

    // Construct the parts for the multimodal request
    const parts = [];

    // 1. Add the text instruction
    const prompt = `You are an expert fashion editor and photo retoucher.
    
    Task: ${instruction || "Swap the clothing onto the model."}
    
    Inputs:
    1. The first image is the 'Model/Scene'.
    2. The subsequent images are the 'Garments/Objects'.
    
    Goal:
    Generate a photorealistic result where the model in the first image is wearing the garments from the subsequent images.
    - Maintain the model's exact face, identity, pose, and the background environment.
    - Adjust the fit, lighting, and texture of the garments to match the scene perfectly.
    - Ensure high quality and realism.`;

    parts.push({ text: prompt });

    // 2. Add the Scene Image
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG for simplicity, usually handled by checking magic bytes
        data: sceneImage
      }
    });

    // 3. Add Object Images
    objectImages.forEach((objBase64: string) => {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: objBase64
        }
      });
    });

    // Use Gemini 2.5 Flash Image for editing tasks (supports multimodal input well)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      }
    });

    // Extract the image
    let base64Image = "";
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error("No image generated");
    }

    return NextResponse.json({ 
      imageUrl: `data:image/png;base64,${base64Image}` 
    });

  } catch (error) {
    console.error("Swap Error:", error);
    return NextResponse.json(
      { error: "Failed to process swap" },
      { status: 500 }
    );
  }
}
