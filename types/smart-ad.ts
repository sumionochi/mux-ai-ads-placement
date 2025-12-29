export interface ProductInput {
  type: "image" | "text";
  imageBase64?: string;
  description?: string;
}

export interface SmartAdSettings {
  productDescription: string;
  productCategory:
    | "tech"
    | "fashion"
    | "food"
    | "beverage"
    | "lifestyle"
    | "other";
  adStyle: "UGC" | "Cinematic" | "Product Demo";
  integrationType:
    | "Reflection"
    | "Background"
    | "Foreground"
    | "Character Interaction";
  cameraMovement: string;
  lightingApproach: string;
  reasoning: string;
  enhancedPrompt: string;
  duration: 4 | 8 | 12;
}

export interface SmartAnalysisRequest {
  transitionId: string;
  frameAUrl: string;
  frameBUrl: string;
  frameAAnalysis: string;
  frameBAnalysis: string;
  visualContinuity: string;
  product: ProductInput;
}
