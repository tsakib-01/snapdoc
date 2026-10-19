export const MAX_UPLOAD_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_PDF_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/jfif',
  'image/pjpeg',
  'image/pjp',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/bmp',
  'image/gif',
  'image/heic',
  'image/heif',
];

export const ALLOWED_PDF_TYPES = [
  'application/pdf',
];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return { valid: false, error: 'Please choose an image smaller than 20 MB.' };
  }

  const isAllowed = ALLOWED_IMAGE_TYPES.includes(file.type) ||
    /\.(jpe?g|jfif|pjpeg|pjp|png|webp|avif|tiff?|bmp|gif|heic|heif)$/i.test(file.name);

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
    return { valid: false, error: 'Please choose a PDF smaller than 20 MB.' };
  }

  const isAllowed = ALLOWED_PDF_TYPES.includes(file.type) || /\.pdf$/i.test(file.name);

  if (!isAllowed) {
    return { valid: false, error: 'Unsupported format. Please upload a valid PDF file.' };
  }

  return { valid: true };
}
