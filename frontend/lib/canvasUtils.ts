/**
 * Canvas Compositing Utilities for CS2 Skin Studio
 *
 * Provides functions for layer compositing, rasterization,
 * normal map generation, and other canvas operations.
 */

import type {
  Layer,
  BlendMode,
  TextLayerContent,
  ShapeLayerContent,
  NormalMapSettings,
} from '@/types/studio';

// ==================== BLEND MODE MAPPING ====================

/**
 * Maps our BlendMode type to canvas globalCompositeOperation
 */
const blendModeToCompositeOp: Record<BlendMode, GlobalCompositeOperation> = {
  'normal': 'source-over',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  'difference': 'difference',
  'exclusion': 'exclusion',
  'hue': 'hue',
  'saturation': 'saturation',
  'color': 'color',
  'luminosity': 'luminosity',
  // Fallback for unsupported modes
  'dissolve': 'source-over',
  'linear-burn': 'multiply',
  'linear-dodge': 'screen',
  'vivid-light': 'hard-light',
  'linear-light': 'hard-light',
  'pin-light': 'overlay',
  'hard-mix': 'hard-light',
};

// ==================== CORE COMPOSITING ====================

/**
 * Create an offscreen canvas with optional initial dimensions
 */
export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Load an image from a data URL and return it as an HTMLImageElement
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Convert canvas to data URL
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality = 0.92): string {
  return canvas.toDataURL(`image/${format}`, quality);
}

/**
 * Composite a single layer onto a canvas context
 */
export async function compositeLayerToCanvas(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  if (!layer.visible) return;

  const prevAlpha = ctx.globalAlpha;
  const prevComposite = ctx.globalCompositeOperation;

  // Apply blend mode and opacity
  ctx.globalAlpha = layer.opacity / 100;
  ctx.globalCompositeOperation = blendModeToCompositeOp[layer.blendMode] || 'source-over';

  // Save state for transform
  ctx.save();

  // Apply transform if present
  if (layer.transform) {
    const t = layer.transform;
    const cx = t.x + t.width / 2;
    const cy = t.y + t.height / 2;

    ctx.translate(cx, cy);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scaleX, t.scaleY);
    ctx.translate(-cx, -cy);

    if (t.skewX || t.skewY) {
      ctx.transform(1, Math.tan(t.skewY * Math.PI / 180), Math.tan(t.skewX * Math.PI / 180), 1, 0, 0);
    }
  }

  // Draw based on layer type
  if (layer.imageData) {
    try {
      const img = await loadImageFromDataUrl(layer.imageData);
      if (layer.transform) {
        ctx.drawImage(img, layer.transform.x, layer.transform.y, layer.transform.width, layer.transform.height);
      } else {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      }
    } catch (e) {
      console.error('Failed to load layer image:', e);
    }
  } else if (layer.type === 'text' && layer.textContent) {
    await renderTextToCanvas(ctx, layer.textContent, canvasWidth, canvasHeight);
  } else if (layer.type === 'shape' && layer.shapeContent) {
    renderShapeToCanvas(ctx, layer.shapeContent, canvasWidth, canvasHeight);
  }

  // Apply mask if present
  if (layer.mask?.enabled && layer.mask.imageData) {
    await applyMaskToContext(ctx, layer.mask.imageData, layer.mask.inverted || false, canvasWidth, canvasHeight);
  }

  ctx.restore();
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevComposite;
}

/**
 * Composite multiple layers into a single canvas
 * Layers should be ordered from bottom to top
 * allLayers is the complete layer list for looking up group children by ID
 */
export async function compositeLayers(
  layers: Layer[],
  width: number,
  height: number,
  backgroundColor?: string,
  allLayers?: Layer[]
): Promise<HTMLCanvasElement> {
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  // Use provided allLayers or the layers array itself for lookups
  const layerLookup = allLayers || layers;

  // Fill background if specified
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Composite layers from bottom to top (reverse order since layers array is top to bottom)
  const orderedLayers = [...layers].reverse();

  for (const layer of orderedLayers) {
    if (layer.type === 'group' && layer.children) {
      // Look up child layers by ID
      const childLayers = layer.children
        .map(childId => layerLookup.find(l => l.id === childId))
        .filter((l): l is Layer => l !== undefined);

      // Recursively composite group children
      const groupCanvas = await compositeLayers(childLayers, width, height, undefined, layerLookup);

      // Draw group canvas with group's blend mode and opacity
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = blendModeToCompositeOp[layer.blendMode] || 'source-over';
      ctx.drawImage(groupCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      await compositeLayerToCanvas(ctx, layer, width, height);
    }
  }

  return canvas;
}

/**
 * Merge two layers together
 */
export async function mergeTwoLayers(
  topLayer: Layer,
  bottomLayer: Layer,
  width: number,
  height: number
): Promise<string> {
  const canvas = await compositeLayers([topLayer, bottomLayer], width, height);
  return canvasToDataUrl(canvas);
}

/**
 * Flatten all visible layers into one
 */
export async function flattenAllLayers(
  layers: Layer[],
  width: number,
  height: number,
  backgroundColor = '#ffffff'
): Promise<string> {
  const visibleLayers = layers.filter(l => l.visible);
  const canvas = await compositeLayers(visibleLayers, width, height, backgroundColor);
  return canvasToDataUrl(canvas);
}

// ==================== MASK APPLICATION ====================

/**
 * Apply a mask to the current canvas context
 */
async function applyMaskToContext(
  ctx: CanvasRenderingContext2D,
  maskDataUrl: string,
  inverted: boolean,
  width: number,
  height: number
): Promise<void> {
  try {
    const maskImg = await loadImageFromDataUrl(maskDataUrl);

    // Create mask canvas
    const maskCanvas = createOffscreenCanvas(width, height);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Draw mask
    maskCtx.drawImage(maskImg, 0, 0, width, height);

    // Get mask data
    const maskData = maskCtx.getImageData(0, 0, width, height);
    const mainData = ctx.getImageData(0, 0, width, height);

    // Apply mask using alpha channel
    for (let i = 0; i < maskData.data.length; i += 4) {
      // Use grayscale of mask as alpha multiplier
      const maskAlpha = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3 / 255;
      const finalAlpha = inverted ? 1 - maskAlpha : maskAlpha;
      mainData.data[i + 3] = Math.round(mainData.data[i + 3] * finalAlpha);
    }

    ctx.putImageData(mainData, 0, 0);
  } catch (e) {
    console.error('Failed to apply mask:', e);
  }
}

// ==================== TEXT RENDERING ====================

/**
 * Render text content to canvas
 */
export async function renderTextToCanvas(
  ctx: CanvasRenderingContext2D,
  textContent: TextLayerContent,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    textAlign,
    lineHeight,
    letterSpacing,
    color,
    stroke,
    shadow,
    gradient,
  } = textContent;

  // Wait for font to load
  try {
    await document.fonts.load(`${fontWeight} ${fontSize}px "${fontFamily}"`);
  } catch (e) {
    console.warn('Font loading failed, using fallback:', e);
  }

  ctx.save();

  // Set font
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
  ctx.textAlign = textAlign as CanvasTextAlign;
  ctx.textBaseline = 'top';

  // Apply letter spacing if supported
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${letterSpacing}px`;
  }

  // Calculate text position based on alignment
  let x: number;
  switch (textAlign) {
    case 'center':
      x = canvasWidth / 2;
      break;
    case 'right':
      x = canvasWidth - 20;
      break;
    default:
      x = 20;
  }

  // Split text into lines
  const lines = text.split('\n');
  const actualLineHeight = fontSize * lineHeight;
  let y = (canvasHeight - lines.length * actualLineHeight) / 2;

  // Apply shadow if present
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blur;
  }

  // Set fill style (gradient or solid color)
  if (gradient && gradient.stops.length > 0) {
    const grd = createGradientFromDefinition(ctx, gradient, canvasWidth, canvasHeight);
    ctx.fillStyle = grd;
  } else {
    ctx.fillStyle = color;
  }

  // Draw each line
  for (const line of lines) {
    if (stroke) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.strokeText(line, x, y);
    }
    ctx.fillText(line, x, y);
    y += actualLineHeight;
  }

  ctx.restore();
}

/**
 * Rasterize a text layer to image data
 */
export async function rasterizeText(
  textContent: TextLayerContent,
  width: number,
  height: number
): Promise<string> {
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  await renderTextToCanvas(ctx, textContent, width, height);
  return canvasToDataUrl(canvas);
}

// ==================== SHAPE RENDERING ====================

/**
 * Render shape content to canvas
 */
export function renderShapeToCanvas(
  ctx: CanvasRenderingContext2D,
  shapeContent: ShapeLayerContent,
  canvasWidth: number,
  canvasHeight: number
): void {
  const {
    type,
    fill,
    stroke,
    cornerRadius,
    points,
    innerRadius,
    outerRadius,
    sides,
  } = shapeContent;

  ctx.save();
  ctx.beginPath();

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const defaultSize = Math.min(canvasWidth, canvasHeight) * 0.4;

  switch (type) {
    case 'rectangle':
      drawRoundedRect(ctx, cx - defaultSize, cy - defaultSize / 2, defaultSize * 2, defaultSize, cornerRadius || 0);
      break;

    case 'ellipse':
      ctx.ellipse(cx, cy, defaultSize, defaultSize * 0.6, 0, 0, Math.PI * 2);
      break;

    case 'polygon':
      if (points && points.length >= 3) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
      } else {
        // Default polygon
        drawRegularPolygon(ctx, cx, cy, sides || 6, outerRadius || defaultSize);
      }
      break;

    case 'star':
      drawStar(ctx, cx, cy, sides || 5, outerRadius || defaultSize, innerRadius || defaultSize * 0.5);
      break;

    case 'line':
      if (points && points.length >= 2) {
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
      }
      break;

    case 'path':
    case 'custom':
      if (points && points.length >= 2) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      break;
  }

  // Apply fill
  if (fill) {
    if (typeof fill === 'string') {
      ctx.fillStyle = fill;
    } else if ('stops' in fill) {
      // Gradient fill
      ctx.fillStyle = createGradientFromDefinition(ctx, fill, canvasWidth, canvasHeight);
    }
    ctx.fill();
  }

  // Apply stroke
  if (stroke) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    if (stroke.dashArray) {
      ctx.setLineDash(stroke.dashArray);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a rounded rectangle path
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * Draw a regular polygon
 */
function drawRegularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sides: number,
  radius: number
): void {
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  ctx.moveTo(
    cx + radius * Math.cos(startAngle),
    cy + radius * Math.sin(startAngle)
  );

  for (let i = 1; i <= sides; i++) {
    const angle = startAngle + i * angleStep;
    ctx.lineTo(
      cx + radius * Math.cos(angle),
      cy + radius * Math.sin(angle)
    );
  }

  ctx.closePath();
}

/**
 * Draw a star shape
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerRadius: number,
  innerRadius: number
): void {
  const angleStep = Math.PI / points;
  const startAngle = -Math.PI / 2;

  ctx.moveTo(
    cx + outerRadius * Math.cos(startAngle),
    cy + outerRadius * Math.sin(startAngle)
  );

  for (let i = 1; i <= points * 2; i++) {
    const angle = startAngle + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    ctx.lineTo(
      cx + radius * Math.cos(angle),
      cy + radius * Math.sin(angle)
    );
  }

  ctx.closePath();
}

/**
 * Create a canvas gradient from our Gradient definition
 */
function createGradientFromDefinition(
  ctx: CanvasRenderingContext2D,
  gradient: { type: string; stops: { offset: number; color: string }[]; angle?: number },
  width: number,
  height: number
): CanvasGradient {
  let grd: CanvasGradient;

  if (gradient.type === 'radial') {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) / 2;
    grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  } else {
    // Linear gradient with angle
    const angle = ((gradient.angle || 0) * Math.PI) / 180;
    const x1 = width / 2 - Math.cos(angle) * width / 2;
    const y1 = height / 2 - Math.sin(angle) * height / 2;
    const x2 = width / 2 + Math.cos(angle) * width / 2;
    const y2 = height / 2 + Math.sin(angle) * height / 2;
    grd = ctx.createLinearGradient(x1, y1, x2, y2);
  }

  for (const stop of gradient.stops) {
    grd.addColorStop(stop.offset, stop.color);
  }

  return grd;
}

/**
 * Rasterize a shape layer to image data
 */
export function rasterizeShape(
  shapeContent: ShapeLayerContent,
  width: number,
  height: number
): string {
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  renderShapeToCanvas(ctx, shapeContent, width, height);
  return canvasToDataUrl(canvas);
}

// ==================== NORMAL MAP GENERATION ====================

/**
 * Generate a normal map from a grayscale height map
 */
export async function generateNormalMap(
  sourceDataUrl: string,
  settings: NormalMapSettings = {
    strength: 2,
    blurRadius: 1,
    invert: false,
    detailScale: 1,
    method: 'sobel',
  }
): Promise<string> {
  const img = await loadImageFromDataUrl(sourceDataUrl);
  const width = img.width;
  const height = img.height;

  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw source image
  ctx.drawImage(img, 0, 0);
  const sourceData = ctx.getImageData(0, 0, width, height);

  // Convert to grayscale height map
  const heightMap = new Float32Array(width * height);
  for (let i = 0; i < heightMap.length; i++) {
    const idx = i * 4;
    // Weighted grayscale conversion
    const gray = (
      sourceData.data[idx] * 0.299 +
      sourceData.data[idx + 1] * 0.587 +
      sourceData.data[idx + 2] * 0.114
    ) / 255;
    heightMap[i] = settings.invert ? 1 - gray : gray;
  }

  // Apply optional blur
  if (settings.blurRadius > 0) {
    applyGaussianBlur(heightMap, width, height, settings.blurRadius);
  }

  // Create normal map
  const normalData = ctx.createImageData(width, height);

  // Sobel/Scharr kernels for gradient calculation
  let kernelX: number[][], kernelY: number[][];

  if (settings.method === 'scharr') {
    kernelX = [
      [-3, 0, 3],
      [-10, 0, 10],
      [-3, 0, 3],
    ];
    kernelY = [
      [-3, -10, -3],
      [0, 0, 0],
      [3, 10, 3],
    ];
  } else if (settings.method === 'prewitt') {
    kernelX = [
      [-1, 0, 1],
      [-1, 0, 1],
      [-1, 0, 1],
    ];
    kernelY = [
      [-1, -1, -1],
      [0, 0, 0],
      [1, 1, 1],
    ];
  } else {
    // Default: Sobel
    kernelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    kernelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];
  }

  const strength = settings.strength * settings.detailScale;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;

      // Apply convolution kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const sx = Math.max(0, Math.min(width - 1, x + kx));
          const sy = Math.max(0, Math.min(height - 1, y + ky));
          const sample = heightMap[sy * width + sx];

          gx += sample * kernelX[ky + 1][kx + 1];
          gy += sample * kernelY[ky + 1][kx + 1];
        }
      }

      // Calculate normal vector
      const nx = -gx * strength;
      const ny = -gy * strength;
      const nz = 1;

      // Normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const normalX = nx / len;
      const normalY = ny / len;
      const normalZ = nz / len;

      // Convert to RGB (mapping from [-1, 1] to [0, 255])
      const idx = (y * width + x) * 4;
      normalData.data[idx] = Math.round((normalX * 0.5 + 0.5) * 255);     // R = X
      normalData.data[idx + 1] = Math.round((normalY * 0.5 + 0.5) * 255); // G = Y
      normalData.data[idx + 2] = Math.round((normalZ * 0.5 + 0.5) * 255); // B = Z
      normalData.data[idx + 3] = 255; // A
    }
  }

  ctx.putImageData(normalData, 0, 0);
  return canvasToDataUrl(canvas);
}

/**
 * Apply Gaussian blur to a float array
 */
function applyGaussianBlur(
  data: Float32Array,
  width: number,
  height: number,
  radius: number
): void {
  const sigma = radius / 3;
  const kernelSize = Math.ceil(radius) * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  let sum = 0;

  // Generate 1D Gaussian kernel
  for (let i = 0; i < kernelSize; i++) {
    const x = i - Math.floor(kernelSize / 2);
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  const temp = new Float32Array(data.length);
  const halfKernel = Math.floor(kernelSize / 2);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.max(0, Math.min(width - 1, x + k - halfKernel));
        val += data[y * width + sx] * kernel[k];
      }
      temp[y * width + x] = val;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.max(0, Math.min(height - 1, y + k - halfKernel));
        val += temp[sy * width + x] * kernel[k];
      }
      data[y * width + x] = val;
    }
  }
}

// ==================== GRAYSCALE CONVERSION ====================

/**
 * Convert an image to grayscale (for roughness/metalness maps)
 */
export async function convertToGrayscale(
  sourceDataUrl: string,
  invert = false,
  contrast = 1,
  brightness = 0
): Promise<string> {
  const img = await loadImageFromDataUrl(sourceDataUrl);
  const width = img.width;
  const height = img.height;

  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Weighted grayscale conversion
    let gray = (
      data[i] * 0.299 +
      data[i + 1] * 0.587 +
      data[i + 2] * 0.114
    );

    // Apply contrast and brightness
    gray = ((gray - 128) * contrast + 128) + brightness;
    gray = Math.max(0, Math.min(255, gray));

    // Invert if needed
    if (invert) {
      gray = 255 - gray;
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Keep alpha unchanged
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToDataUrl(canvas);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get image dimensions from data URL
 */
export async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = await loadImageFromDataUrl(dataUrl);
  return { width: img.width, height: img.height };
}

/**
 * Resize image to specific dimensions
 */
export async function resizeImage(
  dataUrl: string,
  width: number,
  height: number,
  quality = 0.92
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Use smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvasToDataUrl(canvas, 'png', quality);
}

/**
 * Create a thumbnail from an image
 */
export async function createThumbnail(
  dataUrl: string,
  maxSize = 128
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  const aspectRatio = img.width / img.height;

  let width: number, height: number;
  if (aspectRatio > 1) {
    width = maxSize;
    height = maxSize / aspectRatio;
  } else {
    height = maxSize;
    width = maxSize * aspectRatio;
  }

  return resizeImage(dataUrl, Math.round(width), Math.round(height), 0.8);
}

/**
 * Extract a specific color channel from an image
 */
export async function extractChannel(
  dataUrl: string,
  channel: 'red' | 'green' | 'blue' | 'alpha'
): Promise<string> {
  const img = await loadImageFromDataUrl(dataUrl);
  const canvas = createOffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  const channelIdx = { red: 0, green: 1, blue: 2, alpha: 3 }[channel];

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i + channelIdx];
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToDataUrl(canvas);
}

/**
 * Combine multiple grayscale images into RGB channels
 */
export async function combineChannels(
  redDataUrl: string | null,
  greenDataUrl: string | null,
  blueDataUrl: string | null,
  width: number,
  height: number
): Promise<string> {
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const resultData = ctx.createImageData(width, height);

  const loadChannel = async (dataUrl: string | null): Promise<Uint8ClampedArray | null> => {
    if (!dataUrl) return null;
    const img = await loadImageFromDataUrl(dataUrl);
    const tempCanvas = createOffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return null;
    tempCtx.drawImage(img, 0, 0, width, height);
    return tempCtx.getImageData(0, 0, width, height).data;
  };

  const [redData, greenData, blueData] = await Promise.all([
    loadChannel(redDataUrl),
    loadChannel(greenDataUrl),
    loadChannel(blueDataUrl),
  ]);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    resultData.data[idx] = redData ? redData[idx] : 0;
    resultData.data[idx + 1] = greenData ? greenData[idx] : 0;
    resultData.data[idx + 2] = blueData ? blueData[idx] : 0;
    resultData.data[idx + 3] = 255;
  }

  ctx.putImageData(resultData, 0, 0);
  return canvasToDataUrl(canvas);
}

// ==================== NOISE GENERATION ====================

/**
 * Permutation table for Perlin/Simplex noise
 */
const PERM = new Uint8Array(512);
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];

// Initialize permutation table with seed
function initNoiseSeed(seed: number): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  // Fisher-Yates shuffle with seeded random
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  for (let i = 0; i < 256; i++) {
    PERM[i] = PERM[i + 256] = p[i];
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dot3(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

/**
 * 2D Perlin noise
 */
export function perlinNoise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);

  const u = fade(x);
  const v = fade(y);

  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];

  const gradAA = GRAD3[aa % 12];
  const gradAB = GRAD3[ab % 12];
  const gradBA = GRAD3[ba % 12];
  const gradBB = GRAD3[bb % 12];

  const n00 = dot3(gradAA, x, y, 0);
  const n01 = dot3(gradAB, x, y - 1, 0);
  const n10 = dot3(gradBA, x - 1, y, 0);
  const n11 = dot3(gradBB, x - 1, y - 1, 0);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

/**
 * 2D Value noise (simpler, blocky noise)
 */
export function valueNoise2D(x: number, y: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);

  const fx = x - X;
  const fy = y - Y;

  const u = fade(fx);
  const v = fade(fy);

  const n00 = PERM[(PERM[X & 255] + Y) & 255] / 255;
  const n01 = PERM[(PERM[X & 255] + Y + 1) & 255] / 255;
  const n10 = PERM[(PERM[(X + 1) & 255] + Y) & 255] / 255;
  const n11 = PERM[(PERM[(X + 1) & 255] + Y + 1) & 255] / 255;

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

/**
 * Fractal Brownian Motion (FBM) - layered noise
 */
export function fbmNoise2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0,
  noiseFunc: (x: number, y: number) => number = perlinNoise2D
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noiseFunc(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * Turbulence noise (absolute value of FBM for more chaotic look)
 */
export function turbulenceNoise2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += Math.abs(perlinNoise2D(x * frequency, y * frequency)) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * Ridged noise (inverted turbulence for mountain-like features)
 */
export function ridgedNoise2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    let signal = perlinNoise2D(x * frequency, y * frequency);
    signal = 1 - Math.abs(signal);
    signal *= signal * weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    total += signal * amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total;
}

/**
 * Generate a noise texture to a canvas
 */
export function generateNoiseTexture(
  width: number,
  height: number,
  options: {
    type?: 'perlin' | 'value' | 'fbm' | 'turbulence' | 'ridged';
    scale?: number;
    octaves?: number;
    persistence?: number;
    lacunarity?: number;
    seed?: number;
    color1?: string;
    color2?: string;
  } = {}
): string {
  const {
    type = 'perlin',
    scale = 50,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.0,
    seed = 42,
    color1 = '#000000',
    color2 = '#ffffff',
  } = options;

  // Initialize noise with seed
  initNoiseSeed(seed);

  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Parse colors
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / scale;
      const ny = y / scale;

      let noiseValue: number;
      switch (type) {
        case 'value':
          noiseValue = valueNoise2D(nx, ny);
          break;
        case 'fbm':
          noiseValue = (fbmNoise2D(nx, ny, octaves, persistence, lacunarity) + 1) / 2;
          break;
        case 'turbulence':
          noiseValue = turbulenceNoise2D(nx, ny, octaves, persistence, lacunarity);
          break;
        case 'ridged':
          noiseValue = ridgedNoise2D(nx, ny, octaves, persistence, lacunarity) / 2;
          break;
        default: // perlin
          noiseValue = (perlinNoise2D(nx, ny) + 1) / 2;
      }

      noiseValue = Math.max(0, Math.min(1, noiseValue));

      const idx = (y * width + x) * 4;
      data[idx] = Math.round(c1.r + (c2.r - c1.r) * noiseValue);
      data[idx + 1] = Math.round(c1.g + (c2.g - c1.g) * noiseValue);
      data[idx + 2] = Math.round(c1.b + (c2.b - c1.b) * noiseValue);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToDataUrl(canvas);
}

// ==================== IMAGE FILTERS ====================

/**
 * Apply filter to image data
 */
export async function applyFilter(
  sourceDataUrl: string,
  filter: 'invert' | 'posterize' | 'edge' | 'emboss' | 'pixelate' | 'noise' | 'sepia' | 'threshold',
  params: Record<string, number> = {}
): Promise<string> {
  const img = await loadImageFromDataUrl(sourceDataUrl);
  const width = img.width;
  const height = img.height;

  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);

  switch (filter) {
    case 'invert':
      filterInvert(imageData);
      break;
    case 'posterize':
      filterPosterize(imageData, params.levels || 4);
      break;
    case 'edge':
      filterEdgeDetection(imageData, width, height);
      break;
    case 'emboss':
      filterEmboss(imageData, width, height, params.strength || 1);
      break;
    case 'pixelate':
      filterPixelate(imageData, width, height, params.size || 8);
      break;
    case 'noise':
      filterNoise(imageData, params.amount || 30);
      break;
    case 'sepia':
      filterSepia(imageData, params.intensity || 1);
      break;
    case 'threshold':
      filterThreshold(imageData, params.level || 128);
      break;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvasToDataUrl(canvas);
}

function filterInvert(imageData: ImageData): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

function filterPosterize(imageData: ImageData, levels: number): void {
  const data = imageData.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(Math.round(data[i] / step) * step);
    data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
    data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
  }
}

function filterEdgeDetection(imageData: ImageData, width: number, height: number): void {
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);

  // Sobel kernel
  const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (original[idx] + original[idx + 1] + original[idx + 2]) / 3;
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += gray * kernelX[ki];
          gy += gray * kernelY[ki];
        }
      }

      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const idx = (y * width + x) * 4;
      data[idx] = magnitude;
      data[idx + 1] = magnitude;
      data[idx + 2] = magnitude;
    }
  }
}

function filterEmboss(imageData: ImageData, width: number, height: number, strength: number): void {
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);

  // Emboss kernel
  const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const ki = (ky + 1) * 3 + (kx + 1);
          r += original[idx] * kernel[ki] * strength;
          g += original[idx + 1] * kernel[ki] * strength;
          b += original[idx + 2] * kernel[ki] * strength;
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r + 128));
      data[idx + 1] = Math.max(0, Math.min(255, g + 128));
      data[idx + 2] = Math.max(0, Math.min(255, b + 128));
    }
  }
}

function filterPixelate(imageData: ImageData, width: number, height: number, size: number): void {
  const data = imageData.data;

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      let r = 0, g = 0, b = 0, count = 0;

      // Average color in block
      for (let by = 0; by < size && y + by < height; by++) {
        for (let bx = 0; bx < size && x + bx < width; bx++) {
          const idx = ((y + by) * width + (x + bx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      // Fill block with average
      for (let by = 0; by < size && y + by < height; by++) {
        for (let bx = 0; bx < size && x + bx < width; bx++) {
          const idx = ((y + by) * width + (x + bx)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }
  }
}

function filterNoise(imageData: ImageData, amount: number): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * amount * 2;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
}

function filterSepia(imageData: ImageData, intensity: number): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const sepiaR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    const sepiaG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    const sepiaB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);

    data[i] = r + (sepiaR - r) * intensity;
    data[i + 1] = g + (sepiaG - g) * intensity;
    data[i + 2] = b + (sepiaB - b) * intensity;
  }
}

function filterThreshold(imageData: ImageData, level: number): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = gray >= level ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

// Helper to parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
