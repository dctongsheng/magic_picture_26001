export enum AspectRatio {
  SQUARE = "1:1",
  LANDSCAPE_16_9 = "16:9",
  PORTRAIT_9_16 = "9:16",
  STANDARD_4_3 = "4:3",
  STANDARD_3_4 = "3:4"
}

export enum ImageResolution {
  RES_1K = "1K",
  RES_2K = "2K",
  RES_4K = "4K"
}

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  referenceImage?: string;
}

// Type definition for the injected aistudio global object.
// We augment the global AIStudio interface and ensure Window has the property.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    aistudio?: AIStudio;
  }
}