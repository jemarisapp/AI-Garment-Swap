import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY or API_KEY not found in environment variables!');
  console.error('Please create a .env.local file with: GEMINI_API_KEY=your_key_here');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// API Route: Generate (Scene or Object)
app.post('/api/generate', async (req, res) => {
  try {
    const { type, params } = req.body;

    let prompt = "";
    let parts = [];

    // Construct the prompt based on the request type
    if (type === 'scene') {
      const { prompt: sceneDesc, gender, aspectRatio, modelConfig, locationConfig } = params;
      
      console.log('🎨 Generating Scene...');
      console.log('  Aspect Ratio:', aspectRatio);
      console.log('  Gender:', gender);

      let modelDescription = modelConfig.prompt || 'A professional fashion model';
      let locationDescription = locationConfig.prompt || 'A professional studio background';

      // Analyze Model Image if provided
      if (modelConfig.source !== 'generate' && modelConfig.imageUrl) {
        console.log('  Analyzing uploaded model image...');
        const analysis = await analyzeReferenceImage(modelConfig.imageUrl, 'model');
        modelDescription = `REFERENCE MODEL VISUALS: ${analysis.description}\n\nUse this description to generate a similar model, but adapted to the scene description.`;
        
        // Add visual reference to generation parts
        const cleanBase64 = modelConfig.imageUrl.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: { mimeType: 'image/png', data: cleanBase64 }
        });
        console.log('  ✅ Model analysis complete & image added to generation');
      }

      // Analyze Location Image if provided
      if (locationConfig.source !== 'generate' && locationConfig.imageUrl) {
        console.log('  Analyzing uploaded location image...');
        const analysis = await analyzeReferenceImage(locationConfig.imageUrl, 'location');
        locationDescription = `REFERENCE LOCATION VISUALS: ${analysis.description}\n\nUse this description to generate a similar location.`;
        
        // Add visual reference to generation parts
        const cleanBase64 = locationConfig.imageUrl.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: { mimeType: 'image/png', data: cleanBase64 }
        });
        console.log('  ✅ Location analysis complete & image added to generation');
      }

      prompt = `ROLE: You are an expert fashion photographer and art director.
      
      TASK: Generate a high-end, photorealistic fashion scene using the provided reference images strictly.
      
      SCENE COMPOSITION:
      ${sceneDesc}
      
      MODEL DETAILS:
      Gender: ${gender}
      ${modelDescription}
      IMPORTANT: Use the first image provided as the VISUAL REFERENCE for the model. Copy the identity, face, body type, and look as closely as possible.
      
      LOCATION DETAILS:
      ${locationDescription}
      ${locationConfig.source !== 'generate' ? 'IMPORTANT: Use the second image provided as the VISUAL REFERENCE for the location.' : ''}
      
      TECHNICAL SPECIFICATIONS:
      - Aspect Ratio: ${aspectRatio}
      - Lighting: Professional fashion photography lighting, perfectly matched to the scene
      - Camera: High-end phase one camera, 100MP, sharp focus
      - Quality: 8k, photorealistic, highly detailed texture and skin tones
      - Style: Vogue/Harper's Bazaar editorial style`;
      
      // Insert the prompt at the BEGINNING of parts (or end? Text usually comes first or along with images)
      // We already pushed images if they exist. Let's put text first.
      parts.unshift({ text: prompt });

    } else if (type === 'object') {
      const { prompt: objectDesc, type: garmentType } = params;
      prompt = `Generate a high-quality product shot of a fashion item.
      Item Type: ${garmentType}
      Description: ${objectDesc}
      Style: Isolated on a neutral background, professional product photography, soft even lighting, high texture detail.`;
      
      parts.push({ text: prompt });
    }

    // Use Gemini 3 Pro Image Preview for high-quality generation
    console.log('  Calling Gemini API for generation...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: type === 'scene' ? (params.aspectRatio || "3:4") : "1:1",
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

    console.log('  ✅ Image generated successfully');
    res.json({ 
      imageUrl: `data:image/png;base64,${base64Image}` 
    });

  } catch (error) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

/**
 * Helper to analyze reference images for generation
 */
async function analyzeReferenceImage(imageBase64, type) {
  const prompt = type === 'model' 
    ? "Analyze this fashion model. Describe their physical appearance, ethnicity, hair style, body type, and pose in detail. Ignore the clothing if possible, or describe it generally."
    : "Analyze this location/background. Describe the environment, lighting, architectural details, colors, and mood in detail.";

  // Clean base64 string if it has a prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64
          }
        }
      ]
    },
    config: {
      generationConfig: {
        mediaResolution: "media_resolution_high"
      }
    }
  });

  let text = '';
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) text += part.text;
    }
  }

  return { description: text.trim() };
}

/**
 * Helper function to extract JSON from text response
 */
function extractJSON(text) {
  try {
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
}

/**
 * Step 1: Analyze person image and extract PERSON_DESCRIPTION and PERSON_JSON
 */
async function analyzePersonImage(personImageBase64) {
  const analysisPrompt = `Analyze this person image in EXTREME detail, with special focus on capturing the exact pose and body position. You are extracting structured information for a garment replacement system where the pose must remain IDENTICAL.

CRITICAL: Pay special attention to:
- Exact joint positions and angles (shoulders, elbows, wrists, hips, knees, ankles)
- Body orientation and facing direction
- Limb positions and bends
- Head position, tilt, and rotation
- Weight distribution and stance
- All anatomical landmarks that define the pose

Provide:
1. A detailed natural language description of the person, pose (with emphasis on exact body positioning), scene, lighting, and current garment.
2. A structured JSON object with the following structure (fill in ALL pose details with precision):

{
  "body_pose": {
    "position": "description of body position",
    "torso_angle": "angle description",
    "torso_rotation": "torso rotation (facing left/right/forward/backward)",
    "torso_lean": "torso lean direction and degree",
    "support": "what supports the body",
    "head_position": "head position",
    "head_tilt": "head tilt angle (left/right/up/down)",
    "head_rotation": "head rotation (facing direction)",
    "shoulder_alignment": "shoulder position and alignment",
    "left_arm": {
      "shoulder": "left shoulder position",
      "elbow": "left elbow angle and position",
      "wrist": "left wrist position",
      "hand": "left hand position and interaction",
      "overall_angle": "left arm overall angle and orientation"
    },
    "right_arm": {
      "shoulder": "right shoulder position",
      "elbow": "right elbow angle and position",
      "wrist": "right wrist position",
      "hand": "right hand position and interaction",
      "overall_angle": "right arm overall angle and orientation"
    },
    "left_leg": {
      "hip": "left hip position",
      "knee": "left knee angle and position",
      "ankle": "left ankle position",
      "foot": "left foot placement and angle",
      "weight_bearing": "whether bearing weight"
    },
    "right_leg": {
      "hip": "right hip position",
      "knee": "right knee angle and position",
      "ankle": "right ankle position",
      "foot": "right foot placement and angle",
      "weight_bearing": "whether bearing weight"
    },
    "overall_stance": "overall body stance and weight distribution",
    "body_orientation": "which direction the body is facing",
    "joint_angles": "key joint angles that define the pose"
  },
  "facial_details": {
    "expression": "facial expression",
    "gaze_direction": "where they're looking",
    "demographics": "demographic description",
    "features": "hair, makeup, visible features"
  },
  "props_and_accessories": [
    {
      "item": "item name",
      "position": "where it is",
      "interaction": "how person interacts with it"
    }
  ],
  "garment_to_replace": {
    "type": "garment type (e.g., blazer, shirt, jacket)",
    "color": "color",
    "style": "style description",
    "buttons": "button details if applicable",
    "fit": "fit description",
    "state": "how it's worn (open, closed, etc)"
  },
  "lighting": {
    "type": "lighting type",
    "temperature": "warm/cool",
    "direction": "light direction",
    "quality": "light quality",
    "shadows": "shadow description"
  },
  "camera": {
    "angle": "camera angle",
    "distance": "shot distance",
    "framing": "what's in frame",
    "perspective": "perspective description"
  },
  "background": {
    "type": "background type",
    "color": "background color",
    "gradient": "gradient if any"
  },
  "surface": {
    "type": "surface type if visible",
    "color": "surface color",
    "texture": "surface texture"
  },
  "composition": {
    "style": "photography style"
  }
}

Format your response as:
PERSON_DESCRIPTION: [natural language description]

PERSON_JSON: [JSON object]`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: analysisPrompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: personImageBase64
          }
        }
      ]
    },
    config: {
      generationConfig: {
        mediaResolution: "media_resolution_high"
      }
    }
  });

  // Extract text from response
  let text = '';
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        text += part.text;
      }
    }
  }
  
  // Extract description and JSON
  const descMatch = text.match(/PERSON_DESCRIPTION:\s*(.+?)(?=PERSON_JSON:|$)/s);
  const jsonMatch = text.match(/PERSON_JSON:\s*(\{[\s\S]*\})/);
  
  const personDescription = descMatch ? descMatch[1].trim() : text.split('PERSON_JSON:')[0].trim();
  let personJSON = null;
  try {
    personJSON = jsonMatch ? JSON.parse(jsonMatch[1]) : extractJSON(text);
    if (!personJSON) {
      console.warn('⚠️ Could not extract PERSON_JSON, using fallback structure');
      personJSON = { garment_to_replace: { type: 'unknown' } };
    }
  } catch (e) {
    console.error('Error parsing PERSON_JSON:', e);
    personJSON = { garment_to_replace: { type: 'unknown' } };
  }

  return { personDescription, personJSON };
}

/**
 * Step 2: Analyze product image and extract PRODUCT_DESCRIPTION and PRODUCT_JSON
 */
async function analyzeProductImage(productImageBase64) {
  const analysisPrompt = `Analyze this product/garment image in detail. You are extracting structured information for a garment replacement system.

Provide:
1. A detailed natural language description of the garment, including all visible details, colors, materials, graphics, and construction.
2. A structured JSON object with the following structure:

{
  "garment_type": "type of garment",
  "colors": {
    "primary": "primary color",
    "sleeves": "sleeve color if different",
    "trim": "trim color if applicable"
  },
  "materials": {
    "body": "main material",
    "sleeves": "sleeve material if different",
    "trim": "trim material"
  },
  "construction": {
    "closure": "how it closes (buttons, zipper, etc)",
    "collar": "collar type",
    "cuffs": "cuff type",
    "hem": "hem type",
    "pockets": "pocket details"
  },
  "graphics": "description of any graphics, patches, artwork, illustrations. Note: The model will copy graphics from the actual image, so describe what's visible but emphasize that exact graphics should be copied from the image."
}

Format your response as:
PRODUCT_DESCRIPTION: [natural language description]

PRODUCT_JSON: [JSON object]`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: analysisPrompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: productImageBase64
          }
        }
      ]
    },
    config: {
      generationConfig: {
        mediaResolution: "media_resolution_high"
      }
    }
  });

  // Extract text from response
  let text = '';
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        text += part.text;
      }
    }
  }
  
  // Extract description and JSON
  const descMatch = text.match(/PRODUCT_DESCRIPTION:\s*(.+?)(?=PRODUCT_JSON:|$)/s);
  const jsonMatch = text.match(/PRODUCT_JSON:\s*(\{[\s\S]*\})/);
  
  const productDescription = descMatch ? descMatch[1].trim() : text.split('PRODUCT_JSON:')[0].trim();
  let productJSON = null;
  try {
    productJSON = jsonMatch ? JSON.parse(jsonMatch[1]) : extractJSON(text);
    if (!productJSON) {
      console.warn('⚠️ Could not extract PRODUCT_JSON, using fallback structure');
      productJSON = { garment_type: 'unknown' };
    }
  } catch (e) {
    console.error('Error parsing PRODUCT_JSON:', e);
    productJSON = { garment_type: 'unknown' };
  }

  return { productDescription, productJSON };
}

/**
 * Step 3 & 4: Generate final prompt using template and create swapped image
 */
function createSwapPrompt(personDescription, personJSON, productDataArray, instruction) {
  const isMultipleGarments = productDataArray.length > 1;
  const garmentText = isMultipleGarments ? 'garments' : 'garment';
  const productText = isMultipleGarments ? 'product images' : 'product image';
  
  // Build product descriptions section
  let productSections = '';
  productDataArray.forEach((productData, index) => {
    productSections += `
PRODUCT IMAGE ${index + 1}:

This image is the visual source of truth for target garment ${index + 1}. Copy the garment exactly as shown in the product photo. Use it to match colors, materials, silhouette, and artwork.

PRODUCT ${index + 1} DESCRIPTION:

${productData.description}

PRODUCT ${index + 1} PARAMETERS JSON:

Use this JSON only as a guide to interpret the product image. If there is any conflict, follow the image.

${JSON.stringify(productData.json, null, 2)}

`;
  });

  // Build instruction section
  let instructionSection = '';
  if (instruction && instruction.trim()) {
    instructionSection = `
CUSTOM INSTRUCTIONS:

${instruction}

`;
  }

  // Build replacement instruction
  let replacementInstruction = '';
  if (isMultipleGarments) {
    replacementInstruction = `Replace the garment(s) described in PERSON_JSON with the ${productDataArray.length} garment(s) from the product images. Remove the original garment(s) and replace them with the target garments. Each product image corresponds to a specific garment to be swapped.`;
  } else {
    replacementInstruction = `Replace the garment described in PERSON_JSON with the garment in the product image. Remove the original garment and replace it with the target garment.`;
  }

  return `ROLE:

You are a photorealistic garment replacement engine. This is an EDITING task, not a generation task.

You take:

1. A person image with an existing outfit (FIRST IMAGE) - this contains the person, pose, face, body, and the garment(s) to be REPLACED

2. ${productText.charAt(0).toUpperCase() + productText.slice(1)} that show target ${garmentText} (SUBSEQUENT IMAGES) - these show the new garment(s) to use

TASK: Replace the garment(s) visible on the person in the first image with the ${garmentText} from the product image${isMultipleGarments ? 's' : ''}.

CRITICAL: 
- Identify which garment(s) on the person need to be replaced (typically the top/shirt/jacket/sweatshirt)
- Remove the old garment(s) and replace with the new ${garmentText} from product image${isMultipleGarments ? 's' : ''}
- Keep EVERYTHING else from the first image (person, pose, face, hair, hands, background, lighting)

REFERENCES AND STRUCTURE:

PERSON IMAGE:

This image is the visual source of truth for the person, pose, camera angle, lighting, background, props, and all non garment elements. Nothing in this image should change except the ${garmentText} that ${isMultipleGarments ? 'are' : 'is'} marked for replacement.

PERSON DESCRIPTION:

${personDescription}

PERSON PARAMETERS JSON:

Use this JSON only as a guide to interpret the person image. If there is any conflict, follow the image.

${JSON.stringify(personJSON, null, 2)}

${productSections}${instructionSection}GENERAL EXPECTATIONS:

Output a single photorealistic image. The result should look like the person originally wore the target ${garmentText} during the shoot.

INSTRUCTIONS FOR THE MODEL:

1) Garment replacement only - THIS IS THE ONLY CHANGE ALLOWED

${replacementInstruction}

SPECIFIC INSTRUCTIONS:
- Look at the person in the PERSON IMAGE and identify the garment(s) they are currently wearing
- These are the garment(s) that must be REPLACED
- Take the ${garmentText} from the PRODUCT IMAGE${isMultipleGarments ? 'S' : ''} and replace the old ${garmentText}
- The new ${garmentText} must be fitted to the person's existing pose and body
- All graphics, logos, colors, and details from the product image${isMultipleGarments ? 's' : ''} must be accurately reproduced

2) Image priority order

1. Person image controls pose, body, lighting, face, hair, props, scene.

2. Product image${isMultipleGarments ? 's' : ''} control${isMultipleGarments ? '' : 's'} garment design, colors, textures, graphics.

3. JSON guides interpretation but never overrides visuals.

3) CRITICAL: Preserve exact pose and body position

The person's pose MUST remain EXACTLY as shown in the person image. This is the highest priority requirement.

POSE ELEMENTS THAT MUST BE PRESERVED (DO NOT ALTER):
- Exact body orientation and facing direction
- All joint positions (shoulders, elbows, wrists, hips, knees, ankles)
- Arm positions, angles, and bends (maintain exact elbow and wrist positions)
- Leg positions, stance, and weight distribution (maintain exact knee angles and foot placement)
- Head position, tilt, and rotation (maintain exact chin angle and gaze direction)
- Torso angle, rotation, and lean (maintain exact body posture)
- Shoulder alignment and posture
- Overall body silhouette and contour
- All anatomical landmarks and proportions

The pose described in PERSON_JSON body_pose section provides detailed joint and limb positions. Use this as a reference to ensure the pose remains identical. The person image is the visual source of truth - match it exactly.

4) Preserve all non garment elements

Do not change the person's face, hands, hair, accessories, background, lighting, surface, or camera angle. The only change should be the garment(s) being replaced.

4) Copy the target ${garmentText} accurately

Reproduce the ${garmentText} from the product image${isMultipleGarments ? 's' : ''} exactly, including:

- silhouette

- materials

- colors

- all graphics, artwork, patches, and illustrations in the same shapes and positions

Do not design new ${garmentText}. Do not modify graphics. Do not simplify or restyle elements.

5) Fit ${garmentText} to the EXISTING pose (DO NOT change pose to fit garments)

CRITICAL: The pose is fixed and unchangeable. The ${garmentText} must be fitted to match the existing pose exactly.

- Match folds, compression, sleeve bending, and draping based on the body pose described in PERSON_JSON body_pose section
- Garments must follow the body's current position and form - do not adjust the body to fit the garments
- Respect all joint angles and limb positions from the pose analysis
- Ensure fabric behavior (wrinkles, draping, compression) accurately reflects the pose
- Sleeves must follow arm angles exactly as shown in the person image
- Torso garments must follow torso rotation and lean exactly
- Leg garments must follow leg positions and knee angles exactly

6) Lighting consistency

Apply the lighting of the person image to the new ${garmentText} so ${isMultipleGarments ? 'they' : 'it'} blend${isMultipleGarments ? '' : 's'} naturally.

7) Interaction and realism

${garmentText.charAt(0).toUpperCase() + garmentText.slice(1)} should layer naturally with hair, arms, and body.

No clipping or floating.

Add realistic contact shadows.

OUTPUT SUMMARY:

Create a final image where:
1. The person's pose, body position, face, identity, and all non-garment elements are IDENTICAL to the person image
2. Only the garment(s) are replaced with those from the product image${isMultipleGarments ? 's' : ''}
3. The new ${garmentText} ${isMultipleGarments ? 'are' : 'is'} perfectly fitted to the existing pose
4. The result looks as if the person was originally photographed wearing these ${garmentText} in this exact pose

VERIFICATION CHECKLIST:
- [ ] Pose matches person image exactly (compare joint positions)
- [ ] Body orientation unchanged
- [ ] Face, hands, hair unchanged
- [ ] Background and lighting unchanged
- [ ] Only garments are different
- [ ] Garments fit naturally to the pose
- [ ] No artifacts or distortions`;
}

// API Route: Swap
app.post('/api/swap', async (req, res) => {
  try {
    const { sceneImage, objectImages, instruction } = req.body;

    if (!sceneImage || !objectImages || objectImages.length === 0) {
      return res.status(400).json({ error: "Missing input images" });
    }

    console.log('🔄 Starting structured garment swap workflow...');
    console.log(`📊 Processing ${objectImages.length} product image(s)`);
    if (instruction && instruction.trim()) {
      console.log(`📝 Custom instruction provided: "${instruction.substring(0, 50)}..."`);
    }

    // Step 1: Analyze person image
    console.log('📸 Step 1: Analyzing person image...');
    const { personDescription, personJSON } = await analyzePersonImage(sceneImage);
    console.log('✅ Person image analyzed');
    console.log('Person Description:', personDescription.substring(0, 100) + '...');
    console.log('Person JSON keys:', Object.keys(personJSON || {}));

    // Step 2: Analyze ALL product images
    console.log(`📦 Step 2: Analyzing ${objectImages.length} product image(s)...`);
    const productDataArray = [];
    for (let i = 0; i < objectImages.length; i++) {
      console.log(`  Analyzing product image ${i + 1}/${objectImages.length}...`);
      const { productDescription, productJSON } = await analyzeProductImage(objectImages[i]);
      productDataArray.push({
        description: productDescription,
        json: productJSON
      });
      console.log(`  ✅ Product ${i + 1} analyzed: ${productDescription.substring(0, 60)}...`);
      console.log(`  Product ${i + 1} JSON keys:`, Object.keys(productJSON || {}));
    }
    console.log('✅ All product images analyzed');

    // Step 3: Create structured prompt
    console.log('📝 Step 3: Creating structured prompt...');
    const finalPrompt = createSwapPrompt(
      personDescription,
      personJSON,
      productDataArray,
      instruction
    );

    // Step 4: Generate final swapped image
    console.log('🎨 Step 4: Generating swapped image...');
    const parts = [
      { text: finalPrompt },
      {
        inlineData: {
          mimeType: 'image/png',
          data: sceneImage
        }
      }
    ];

    // Add ALL product images in order
    objectImages.forEach((objBase64, index) => {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: objBase64
        }
      });
      console.log(`  Added product image ${index + 1} to generation request`);
    });

    console.log(`  Calling Gemini API with model: gemini-3-pro-image-preview`);
    console.log(`  Parts count: ${parts.length} (1 text + ${parts.length - 1} images)`);
    
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: parts
        },
        config: {
          generationConfig: {
            mediaResolution: "media_resolution_high"
          }
        }
      });
      console.log(`  ✅ API call successful`);
    } catch (apiError) {
      console.error(`  ❌ API call failed:`, apiError);
      // Try fallback model
      console.log(`  Trying fallback model: gemini-3-pro-image-preview`);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: parts
          },
          config: {
            generationConfig: {
              mediaResolution: "media_resolution_high"
            }
          }
        });
        console.log(`  ✅ Fallback API call successful`);
      } catch (fallbackError) {
        console.error(`  ❌ Fallback also failed:`, fallbackError);
        throw new Error(`API call failed: ${apiError.message}. Fallback also failed: ${fallbackError.message}`);
      }
    }

    // Extract the image
    let base64Image = "";
    if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      console.log(`  Response has ${response.candidates[0].content.parts.length} parts`);
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          console.log(`  ✅ Found image data (${base64Image.length} chars)`);
          break;
        } else if (part.text) {
          console.log(`  ⚠️  Response part is text, not image: ${part.text.substring(0, 100)}...`);
        }
      }
    } else {
      console.error(`  ❌ Invalid response structure:`, JSON.stringify(response, null, 2).substring(0, 500));
    }

    if (!base64Image) {
      throw new Error("No image generated in response. Check API model and response structure.");
    }

    console.log('✅ Swap complete!');

    res.json({ 
      imageUrl: `data:image/png;base64,${base64Image}`,
      metadata: {
        personDescription,
        personJSON,
        products: productDataArray.map((p, i) => ({
          index: i + 1,
          description: p.description,
          json: p.json
        })),
        instruction: instruction || null,
        garmentCount: objectImages.length
      }
    });

  } catch (error) {
    console.error("Swap Error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    res.status(500).json({ 
      error: "Failed to process swap", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API Route: Pose
app.post('/api/pose', async (req, res) => {
  try {
    const { sceneImage, objectImages, instruction } = req.body;

    if (!sceneImage) {
      return res.status(400).json({ error: "Missing input image" });
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
        objectImages.forEach((objBase64) => {
        parts.push({
            inlineData: {
            mimeType: 'image/png',
            data: objBase64
            }
        });
        });
    }

    // Use Gemini 3 Pro Image Preview for better editing quality
    console.log('  Calling Gemini API for pose generation...');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: {
        generationConfig: {
            mediaResolution: "media_resolution_high"
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

    console.log('  ✅ Pose generated successfully');
    res.json({ 
      imageUrl: `data:image/png;base64,${base64Image}` 
    });

  } catch (error) {
    console.error("Pose Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: `Failed to generate pose: ${errorMessage}` });
  }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`✅ API routes available at /api/generate, /api/swap, and /api/pose`);
  });
}

export default app;

