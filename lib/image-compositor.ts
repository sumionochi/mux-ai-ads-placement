import sharp from "sharp";

interface CompositeImageInput {
  frameABuffer: Buffer;
  productBuffer: Buffer;
  frameBBuffer: Buffer;
}

/**
 * Creates a composite reference image for Sora showing:
 * [Frame A | Product | Frame B] in horizontal layout
 */
export async function createSoraReferenceComposite({
  frameABuffer,
  productBuffer,
  frameBBuffer,
}: CompositeImageInput): Promise<Buffer> {
  // Target: 1280x720 (Sora's native size)
  const targetWidth = 1280;
  const targetHeight = 720;

  // Each section gets 1/3 of width
  const sectionWidth = Math.floor(targetWidth / 3);

  // Resize all images to fit their sections
  const [frameA, product, frameB] = await Promise.all([
    // Frame A: Cover fit (fills space, may crop)
    sharp(frameABuffer)
      .resize(sectionWidth, targetHeight, {
        fit: "cover",
        position: "center",
      })
      .toBuffer(),

    // Product: Contain fit (fits inside, adds black bars if needed)
    sharp(productBuffer)
      .resize(sectionWidth, targetHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .toBuffer(),

    // Frame B: Cover fit
    sharp(frameBBuffer)
      .resize(sectionWidth, targetHeight, {
        fit: "cover",
        position: "center",
      })
      .toBuffer(),
  ]);

  // Composite them side-by-side horizontally
  const composite = await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      { input: frameA, left: 0, top: 0 },
      { input: product, left: sectionWidth, top: 0 },
      { input: frameB, left: sectionWidth * 2, top: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log("🖼️  Created composite reference image: 1280x720, 3 panels");

  return composite;
}

/**
 * Alternative: Vertical layout (better for some products)
 * [Frame A]
 * [Product]
 * [Frame B]
 */
export async function createSoraReferenceCompositeVertical({
  frameABuffer,
  productBuffer,
  frameBBuffer,
}: CompositeImageInput): Promise<Buffer> {
  const targetWidth = 1280;
  const targetHeight = 720;
  const sectionHeight = Math.floor(targetHeight / 3);

  const [frameA, product, frameB] = await Promise.all([
    sharp(frameABuffer)
      .resize(targetWidth, sectionHeight, { fit: "cover", position: "center" })
      .toBuffer(),

    sharp(productBuffer)
      .resize(targetWidth, sectionHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .toBuffer(),

    sharp(frameBBuffer)
      .resize(targetWidth, sectionHeight, { fit: "cover", position: "center" })
      .toBuffer(),
  ]);

  const composite = await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      { input: frameA, left: 0, top: 0 },
      { input: product, left: 0, top: sectionHeight },
      { input: frameB, left: 0, top: sectionHeight * 2 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log("🖼️  Created vertical composite reference: 1280x720, 3 rows");

  return composite;
}
