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

    res.json({ 
      imageUrl: `data:image/png;base64,${base64Image}` 
    });

  } catch (error) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

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
  const analysisPrompt = `Analyze this person image in detail. You are extracting structured information for a garment replacement system.

Provide:
1. A detailed natural language description of the person, pose, scene, lighting, and current garment.
2. A structured JSON object with the following structure:

{
  "body_pose": {
    "position": "description of body position",
    "torso_angle": "angle description",
    "support": "what supports the body",
    "head_position": "head position",
    "head_tilt": "head tilt angle",
    "left_arm": "left arm position",
    "right_arm": "right arm position",
    "left_hand": "left hand position and interaction",
    "right_hand": "right hand position and interaction",
    "legs": "legs position"
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

You are a photorealistic garment replacement engine. You take:

1. A person image with an existing outfit

2. ${productText.charAt(0).toUpperCase() + productText.slice(1)} that show target ${garmentText}

and you replace the original ${garmentText} on the person with the target ${garmentText}.

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

1) Garment replacement only

${replacementInstruction}

2) Image priority order

1. Person image controls pose, body, lighting, face, hair, props, scene.

2. Product image${isMultipleGarments ? 's' : ''} control${isMultipleGarments ? '' : 's'} garment design, colors, textures, graphics.

3. JSON guides interpretation but never overrides visuals.

3) Preserve all non garment elements

Do not change the person's face, hands, hair, accessories, background, lighting, surface, or camera angle.

4) Copy the target ${garmentText} accurately

Reproduce the ${garmentText} from the product image${isMultipleGarments ? 's' : ''} exactly, including:

- silhouette

- materials

- colors

- all graphics, artwork, patches, and illustrations in the same shapes and positions

Do not design new ${garmentText}. Do not modify graphics. Do not simplify or restyle elements.

5) Fit ${garmentText} to pose

Match folds, compression, sleeve bending, and draping based on the body pose described in PERSON_JSON and visible in the person image.

6) Lighting consistency

Apply the lighting of the person image to the new ${garmentText} so ${isMultipleGarments ? 'they' : 'it'} blend${isMultipleGarments ? '' : 's'} naturally.

7) Interaction and realism

${garmentText.charAt(0).toUpperCase() + garmentText.slice(1)} should layer naturally with hair, arms, and body.

No clipping or floating.

Add realistic contact shadows.

OUTPUT SUMMARY:

Create a final image where the person is wearing the ${garmentText} from the product image${isMultipleGarments ? 's' : ''}. Everything else remains unchanged.`;
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

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`✅ API routes available at /api/generate and /api/swap`);
});

