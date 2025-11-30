
import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { type, params } = await req.json();

    let prompt = "";

    // Construct the prompt based on the request type
    if (type === 'scene') {
      const { prompt: sceneDesc, gender, aspectRatio, modelConfig, locationConfig } = params;
      
      prompt = `Generate a photorealistic fashion scene. 
      Aspect Ratio: ${aspectRatio}.
      
      Scene Description: ${sceneDesc}
      
      Model Details:
      Gender: ${gender || 'Not specified'}
      Description: ${modelConfig.prompt || 'A professional fashion model'}
      
      Location Details:
      Description: ${locationConfig.prompt || 'A studio background'}
      
      Lighting: Professional fashion photography lighting, high detail, 4k.`;
      
    } else if (type === 'object') {
      const { prompt: objectDesc, type: garmentType } = params;
      prompt = `Generate a high-quality product shot of a fashion item.
      Item Type: ${garmentType}
      Description: ${objectDesc}
      Style: Isolated on a neutral background, professional product photography.`;
    }

    // Use Gemini 3 Pro Image Preview for high-quality generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt }
        ],
      },
      config: {
        // Only 1 image for now
        imageConfig: {
          aspectRatio: type === 'scene' ? "3:4" : "1:1", // Mapping simple aspect ratios
          imageSize: "1K"
        }
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
    console.error("Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
