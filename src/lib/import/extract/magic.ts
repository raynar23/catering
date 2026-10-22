// File magic number (header signature) validation
export function validateMagicNumber(buffer: Buffer, ext: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const normalizedExt = ext.replace(/^\./, "").toLowerCase();

  switch (normalizedExt) {
    case "xlsx":
    case "docx":
      // ZIP format (PK\x03\x04)
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

    case "pdf":
      // %PDF
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    case "png":
      // PNG header (\x89PNG)
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

    case "jpg":
    case "jpeg":
      // JPEG SOI marker (\xFF\xD8\xFF)
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case "webp":
      // RIFF....WEBP
      if (buffer.length < 12) return false;
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      return isRiff && isWebp;

    case "csv":
      // Plain text CSV: no binary NULL bytes in the first 1024 bytes
      const checkLength = Math.min(buffer.length, 1024);
      for (let i = 0; i < checkLength; i++) {
        if (buffer[i] === 0x00) return false;
      }
      return true;

    default:
      return false;
  }
}
