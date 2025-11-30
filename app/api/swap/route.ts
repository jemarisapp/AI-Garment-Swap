
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

    // 1. Add the text instruction with enhanced pose preservation
    const prompt = `You are an expert fashion editor and photo retoucher specializing in precise garment replacement while maintaining exact body positioning.

TASK: GARMENT REPLACEMENT
${instruction || "Replace the top/upper garment on the person in the first image with the garment from the subsequent image(s)."}

IMPORTANT: This is an EDITING task, not a generation task. You must:
1. Take the EXACT person, pose, face, body, and scene from the first image
2. Identify the garment(s) to replace (typically the top/shirt/jacket/sweatshirt visible on the person)
3. Replace ONLY those garment(s) with the garment(s) from the subsequent image(s)
4. Keep EVERYTHING else identical (pose, face, hair, hands, background, lighting, etc.)

INPUT IMAGES:
1. FIRST IMAGE (Model/Scene): This is your PRIMARY REFERENCE containing:
   - The person with their current pose, face, body, and garment(s) to be replaced
   - The background and scene
   - The lighting and camera angle
   - ALL non-garment elements that must remain unchanged

2. SUBSEQUENT IMAGE(S) (Product/Garment): These show:
   - The target garment(s) to replace the existing garment(s) with
   - Use these ONLY for garment design, colors, graphics, and style
   - DO NOT use these for pose, body, face, or scene elements
    
    CRITICAL POSE PRESERVATION REQUIREMENTS:
    
    The model's pose, body position, and stance MUST remain EXACTLY as shown in the first image. This includes:
    
    POSE ELEMENTS TO PRESERVE (DO NOT ALTER):
    - Exact body orientation and angle (facing direction, body rotation)
    - Arm positions and angles (elbow bends, wrist positions, hand placement)
    - Leg positions and stance (knee angles, foot placement, weight distribution)
    - Head position and tilt (chin angle, head rotation, gaze direction)
    - Shoulder alignment and posture
    - Torso rotation and lean
    - Overall body silhouette and contour
    
    ANATOMICAL LANDMARKS TO MAINTAIN:
    - Joint positions (shoulders, elbows, wrists, hips, knees, ankles)
    - Body proportions and scale
    - Muscle definition and body shape
    - Natural body curves and lines
    
    SCENE ELEMENTS TO PRESERVE:
    - Background environment (unchanged)
    - Lighting direction and intensity (apply to new garments only)
    - Camera angle and perspective
    - Shadows cast by the body (maintain original shadow positions)
    - Props and accessories (unchanged)
    
    GARMENT INTEGRATION RULES:
    - Fit the new garments to the EXISTING pose - do not change pose to fit garments
    - Garments must follow the body's current position and form
    - Maintain natural fabric draping that respects the pose
    - Preserve realistic wrinkles and folds that match the body position
    - Ensure garments interact correctly with body parts in their current positions
    
STEP-BY-STEP PROCESS:
1. ANALYZE the first image: Identify the person, their pose, face, current garment(s), and all scene elements
2. IDENTIFY which garment(s) to replace: Typically the top/shirt/jacket/sweatshirt visible on the person
3. EXTRACT garment design from subsequent image(s): Note colors, graphics, style, materials, but NOT pose or body
4. REPLACE the garment: Remove the old garment and place the new garment, fitting it to the EXISTING pose
5. PRESERVE everything else: Keep pose, face, hair, hands, background, lighting, shadows exactly as in first image

OUTPUT REQUIREMENTS:
Generate a photorealistic EDITED image where:
1. The person's pose, body position, face, identity, hair, hands, and background are IDENTICAL to the first image
2. ONLY the garment(s) visible on the person are replaced with those from subsequent images
3. The new garment(s) are perfectly fitted to the existing pose (do NOT change pose to fit garments)
4. Lighting and shadows match the original scene exactly
5. The result looks as if the person was originally photographed wearing these new garments in this exact pose
6. All graphics, logos, and details from the product image(s) are accurately reproduced on the garment
    
    QUALITY STANDARDS:
    - Photorealistic quality matching the original image
    - Seamless integration of new garments
    - No visible artifacts or distortions
    - Natural fabric behavior respecting the pose
    - Professional fashion photography standards`;

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
    console.error("Swap Error:", error);
    return NextResponse.json(
      { error: "Failed to process swap" },
      { status: 500 }
    );
  }
}
