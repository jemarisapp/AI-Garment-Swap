
export interface UploadedImage {
  id?: string;
  file: File | null;
  preview: string;
  url?: string;
  name?: string;
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error' | 'generating';

export interface SwapJobResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export type ElementType = 'scene' | 'model' | 'object' | 'location';

export interface ProjectElement {
  id: string;
  name: string;
  type: ElementType;
  preview: string;
  dateCreated: number;
}

export type Gender = 'female' | 'male' | 'non-binary';
export type AspectRatio = '1:1' | '3:4' | '9:16' | '16:9';
export type GarmentType = 'top' | 'bottom' | 'dress' | 'outerwear' | 'accessory' | 'shoes';

export type GenerationSource = 'generate' | 'upload' | 'library';

export interface AssetGenerationConfig {
  source: GenerationSource;
  prompt?: string;
  image?: File | null;
  imageUrl?: string; // For library items or uploaded previews
  libraryId?: string;
}

export interface SceneGenerationParams {
  prompt: string; // Global scene prompt
  gender?: Gender;
  aspectRatio: AspectRatio;
  modelConfig: AssetGenerationConfig;
  locationConfig: AssetGenerationConfig;
}

export interface ObjectGenerationParams {
  prompt: string;
  type: GarmentType;
}
