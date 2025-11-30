
import { SceneGenerationParams, ObjectGenerationParams } from '../types';

/**
 * Helper to convert File to Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data:image/xyz;base64, prefix
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Helper to fetch a Blob URL and convert to Base64 (for Library items)
 */
const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
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
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'scene',
      params
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
