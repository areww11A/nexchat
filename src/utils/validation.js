export function validateFile(file, options = {}) {
  if (!file) {
    return { valid: false, message: 'No file provided' };
  }

  // Check file type
  if (options.types && !options.types.includes(file.mimetype)) {
    return {
      valid: false,
      message: `Invalid file type. Allowed types: ${options.types.join(', ')}`
    };
  }

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      message: `File size exceeds maximum of ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

export function validateSticker(file) {
  return validateFile(file, {
    types: ['image/png', 'image/gif'],
    maxSize: 512 * 1024 // 512KB
  });
}
