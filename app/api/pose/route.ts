import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sceneImage, objectImages, instruction } = await req.json();

    if (!sceneImage) {
      return NextResponse.json({ error: "Missing input image" }, { status: 400 });
    }
    
    const hasObjectImages = objectImages && objectImages.length > 0;

    // Construct the parts for the multimodal request
    const parts = [];

    // 1. Add the text instruction with enhanced pose preservation
    let prompt = "";
    
    if (hasObjectImages) {
       // Case 1: Re-posing with explicit garment reference (Swap + Pose)
       prompt = `You are an expert fashion photographer and editor.
    
TASK: NEW POSE GENERATION & GARMENT SWAP
${instruction || "Generate a new, dynamic fashion pose for the model."}

INPUTS:
1. FIRST IMAGE (Scene/Model): Contains the target model (identity, face, body type) and the background location.
2. SUBSEQUENT IMAGE(S) (Garment): Contains the garment(s) the model should be wearing.

REQUIREMENTS:
1. IDENTITY: Preserve the EXACT facial features, hair, skin tone, and body type of the model from the First Image.
2. GARMENT: The model must be wearing the garment(s) shown in the Subsequent Image(s). The garment details (texture, logo, pattern) must be preserved.
3. LOCATION: The background/environment must match the First Image (same lighting vibe, same setting).
4. POSE: IGNORE the pose in the First Image. Generate a COMPLETELY NEW, professional fashion pose.
   - The pose should be natural and photorealistic.
   - The garment should drape naturally in the new pose.
   
OUTPUT:
A photorealistic image of the SAME model, in the SAME location, wearing the SAME garment, but in a NEW pose.
High quality, 4k, fashion photography style.`;
    } else {
       // Case 2: Re-posing a single image (Result Image) - Garment is already on the model
       prompt = `You are an expert fashion photographer and editor.

TASK: NEW POSE GENERATION (RE-POSE)
${instruction || "Generate a new, dynamic fashion pose for the model in the image."}

INPUTS:
1. INPUT IMAGE: Contains the model wearing the correct garment in a specific location.

REQUIREMENTS:
1. IDENTITY: Preserve the EXACT facial features, hair, skin tone, and body type of the model.
2. GARMENT: Preserve the EXACT garment the model is currently wearing (style, texture, color, logo, pattern).
3. LOCATION: The background/environment must match the original image (same lighting vibe, same setting).
4. POSE: IGNORE the current pose. Generate a COMPLETELY NEW, professional fashion pose.
   - The pose should be natural and photorealistic.
   - The garment should drape naturally in the new pose.

OUTPUT:
A photorealistic image of the SAME model, in the SAME location, wearing the SAME garment, but in a NEW pose.
High quality, 4k, fashion photography style.`;
    }

    parts.push({ text: prompt });

    // 2. Add the Scene Image (or Main Input Image)
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: sceneImage
      }
    });

    // 3. Add Object Images (if any)
    if (hasObjectImages) {
        objectImages.forEach((objBase64: string) => {
        parts.push({
            inlineData: {
            mimeType: 'image/png',
            data: objBase64
            }
        });
        });
    }

    // Use Gemini 3 Pro Image Preview for better editing quality
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
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
    console.error("Pose Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate pose: ${errorMessage}` },
      { status: 500 }
    );
  }
}
