export interface PromptValidation {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export function validateVeoPrompt(prompt: string): PromptValidation {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check 1: Length (100-300 words is optimal)
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount < 50) {
    issues.push("Prompt too short (needs more detail)");
  } else if (wordCount >= 50 && wordCount <= 300) {
    score += 20;
  } else if (wordCount > 300) {
    suggestions.push(
      "Consider condensing - very long prompts may confuse the model"
    );
  }

  // Check 2: Camera movement
  const cameraKeywords =
    /\b(pan|zoom|track|dolly|crane|tilt|orbit|pull back|push in|static shot|handheld)\b/i;
  if (cameraKeywords.test(prompt)) {
    score += 20;
  } else {
    issues.push("Missing camera movement description");
    suggestions.push('Add camera movement like "tracking shot" or "slow zoom"');
  }

  // Check 3: Timing specified
  const timingKeywords = /\b(\d+[- ]second|over \d+ seconds|duration)\b/i;
  if (timingKeywords.test(prompt)) {
    score += 20;
  } else {
    issues.push("Missing timing specification");
    suggestions.push(
      'Specify duration like "over 4 seconds" or "3-second shot"'
    );
  }

  // Check 4: Lighting description
  const lightingKeywords =
    /\b(light|lighting|shadow|bright|dim|soft|harsh|natural|golden|warm|cool|sunlight|glow)\b/i;
  if (lightingKeywords.test(prompt)) {
    score += 20;
  } else {
    issues.push("Missing lighting description");
    suggestions.push("Describe lighting conditions to match the scene");
  }

  // Check 5: Motion/action description
  const motionKeywords =
    /\b(rotates|spins|moves|slides|flows|pours|reveals|transitions|shifts)\b/i;
  if (motionKeywords.test(prompt)) {
    score += 20;
  } else {
    issues.push("Missing motion/action description");
    suggestions.push(
      'Add object motion like "bottle rotates" or "liquid pours"'
    );
  }

  // Bonus: Depth/perspective cues
  if (
    /\b(foreground|background|depth of field|shallow focus|bokeh|close-up|wide shot)\b/i.test(
      prompt
    )
  ) {
    score += 10;
  }

  // Bonus: Professional terminology
  if (
    /\b(commercial|professional|cinematic|aesthetic|photography)\b/i.test(
      prompt
    )
  ) {
    score += 10;
  }

  const isValid = score >= 60 && issues.length === 0;

  return {
    isValid,
    score: Math.min(score, 100),
    issues,
    suggestions,
  };
}

export function improvePrompt(
  originalPrompt: string,
  validation: PromptValidation
): string {
  if (validation.isValid) return originalPrompt;

  let improved = originalPrompt;

  // Add missing elements based on issues
  if (validation.issues.includes("Missing timing specification")) {
    improved = `A 4-second ${improved}`;
  }

  if (validation.issues.includes("Missing camera movement description")) {
    improved = improved.replace(/^(A )?/, "A smooth tracking shot: ");
  }

  if (validation.issues.includes("Missing lighting description")) {
    improved += ", with warm natural lighting and soft shadows";
  }

  if (validation.issues.includes("Missing motion/action description")) {
    improved += ", featuring smooth continuous motion";
  }

  return improved;
}
