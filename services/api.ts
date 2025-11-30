
import { SceneGenerationParams, ObjectGenerationParams } from '../types';

/**
 * Helper to convert File to Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return resizeImage(file);
};

/**
 * Helper to resize an image to a maximum dimension, maintaining aspect ratio.
 * Returns a Base64 string.
 */
const resizeImage = (file: File | Blob, maxDimension: number = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.8 quality to ensure smaller size
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        } else {
            reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
  });
};

/**
 * Helper to fetch a Blob URL and convert to Base64 (for Library items), resizing if needed.
 */
const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return resizeImage(blob);
};

/**
 * Uploads images. 
 * Note: In a real production app, you would upload to Vercel Blob/S3 here.
 * For this Gemini implementation, we will pass Base64 strings directly to the swap API 
 * to avoid setting up external storage buckets for this demo.
 */
export const uploadImages = async (
  sceneFile: File | null,
  objectFiles: File[]
): Promise<{ sceneUrl?: string; objectUrls: string[] }> => {
  // We still create object URLs for immediate UI feedback
  let sceneUrl = undefined;
  if (sceneFile) {
    sceneUrl = URL.createObjectURL(sceneFile);
  }
  const objectUrls = objectFiles.map(file => URL.createObjectURL(file));

  return { sceneUrl, objectUrls };
};

/**
 * Calls the Next.js API route to perform the swap/editing using Gemini
 */
export const processSwap = async (
  sceneUrl: string,
  objectUrls: string[],
  instruction: string
): Promise<string> => {
  
  // 1. Convert inputs to Base64
  // Check if sceneUrl is a blob (uploaded file) or external URL (library)
  const sceneBase64 = await urlToBase64(sceneUrl);
  
  const objectBase64Promises = objectUrls.map(url => urlToBase64(url));
  const objectBase64s = await Promise.all(objectBase64Promises);

  // 2. Call Backend API
  const response = await fetch('/api/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sceneImage: sceneBase64,
      objectImages: objectBase64s,
      instruction
    })
  });

  if (!response.ok) {
    throw new Error('Failed to process swap');
  }

  const data = await response.json();
  
  // 3. Return the generated image URL (Base64 data URI)
  return data.imageUrl;
};

/**
 * Calls the Next.js API route to generate a scene or object
 */
export const generateScene = async (params: SceneGenerationParams): Promise<string> => {
  // Handle image conversions for model/location if they are uploads
  const processedParams = { ...params };

  // Convert Model Image to Base64 if present
  if (params.modelConfig.source !== 'generate' && params.modelConfig.image) {
    try {
      const base64 = await resizeImage(params.modelConfig.image);
      processedParams.modelConfig = {
        ...params.modelConfig,
        imageUrl: base64 // Send base64 as imageUrl for the backend
      };
    } catch (e) {
      console.error("Failed to convert model image", e);
    }
  } else if (params.modelConfig.source !== 'generate' && params.modelConfig.imageUrl && params.modelConfig.imageUrl.startsWith('blob:')) {
    // Handle blob URLs (from library or upload preview)
     try {
      const base64 = await urlToBase64(params.modelConfig.imageUrl);
      processedParams.modelConfig = {
        ...params.modelConfig,
        imageUrl: base64
      };
    } catch (e) {
      console.error("Failed to convert model blob url", e);
    }
  }

  // Convert Location Image to Base64 if present
  if (params.locationConfig.source !== 'generate' && params.locationConfig.image) {
    try {
      const base64 = await resizeImage(params.locationConfig.image);
      processedParams.locationConfig = {
        ...params.locationConfig,
        imageUrl: base64
      };
    } catch (e) {
      console.error("Failed to convert location image", e);
    }
  } else if (params.locationConfig.source !== 'generate' && params.locationConfig.imageUrl && params.locationConfig.imageUrl.startsWith('blob:')) {
     try {
      const base64 = await urlToBase64(params.locationConfig.imageUrl);
      processedParams.locationConfig = {
        ...params.locationConfig,
        imageUrl: base64
      };
    } catch (e) {
      console.error("Failed to convert location blob url", e);
    }
  }

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'scene',
      params: processedParams
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate scene');
  }

  const data = await response.json();
  return data.imageUrl;
};

export const generateObject = async (params: ObjectGenerationParams): Promise<string> => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'object',
      params
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate object');
  }

  const data = await response.json();
  return data.imageUrl;
};

/**
 * Calls the Next.js API route to generate a new pose using existing inputs
 */
export const generateNewPose = async (
  sceneUrl: string,
  objectUrls: string[],
  instruction: string
): Promise<string> => {
  // 1. Convert inputs to Base64
  const sceneBase64 = await urlToBase64(sceneUrl);
  
  const objectBase64Promises = objectUrls.map(url => urlToBase64(url));
  const objectBase64s = await Promise.all(objectBase64Promises);

  // 2. Call Backend API
  const response = await fetch('/api/pose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sceneImage: sceneBase64,
      objectImages: objectBase64s,
      instruction
    })
  });

  if (!response.ok) {
    let errorMessage = `Failed to generate pose: ${response.status} ${response.statusText}`;
    try {
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            if (json.error) errorMessage = json.error;
        } catch {
            // response was not JSON, maybe HTML error page or empty
            if (text) errorMessage += ` - Response: ${text.substring(0, 200)}`;
        }
    } catch (e) {
        // reading text failed
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.imageUrl;
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 10MB' };
  }

  return { valid: true };
};
