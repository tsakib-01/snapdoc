export const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PDF_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/bmp',
  'image/gif',
];

export const ALLOWED_PDF_TYPES = [
  'application/pdf',
];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 50MB.' };
  }

  const isAllowed = ALLOWED_IMAGE_TYPES.includes(file.type) ||
    /\.(jpe?g|png|webp|avif|tiff?|bmp|gif)$/i.test(file.name);

  if (!isAllowed) {
    return { valid: false, error: 'Unsupported format. Please upload a JPG, PNG, WebP, AVIF, or BMP image.' };
  }

  return { valid: true };
}

export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_PDF_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 100MB.' };
  }

  const isAllowed = ALLOWED_PDF_TYPES.includes(file.type) || /\.pdf$/i.test(file.name);

  if (!isAllowed) {
    return { valid: false, error: 'Unsupported format. Please upload a valid PDF file.' };
  }

  return { valid: true };
}
