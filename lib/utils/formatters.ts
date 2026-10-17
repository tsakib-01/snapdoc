export function formatBytes(bytes?: number | null, decimals: number = 2): string {
  if (bytes === null || bytes === undefined || typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(Math.max(0, i), sizes.length - 1);

  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm)) + ' ' + sizes[safeIndex];
}

export function formatPercentage(original: number, current: number): string {
  if (original <= 0) return '0%';
  const diff = original - current;
  const percent = (diff / original) * 100;
  if (percent <= 0) return '0%';
  return `${percent.toFixed(1)}%`;
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

export function sanitizeFilename(name: string, newExtension?: string): string {
  const baseName = name.substring(0, name.lastIndexOf('.')) || name;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  if (newExtension) {
    return `${cleanBase}.${newExtension.replace(/^\./, '')}`;
  }
  const ext = getFileExtension(name);
  return ext ? `${cleanBase}.${ext}` : cleanBase;
}
