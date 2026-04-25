import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryFolder =
  | 'medvault/documents'
  | 'medvault/chat'
  | 'medvault/whatsapp'
  | 'medvault/prescriptions';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
}

/**
 * Upload a Buffer directly to Cloudinary.
 * Works for images, PDFs (raw resource type), audio.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  folder: CloudinaryFolder,
  publicIdPrefix?: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimeType);
    const format = mimeTypeToFormat(mimeType);

    const options: any = {
      folder,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
    };

    if (format) options.format = format;
    if (publicIdPrefix) options.public_id = `${publicIdPrefix}_${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Upload from a public URL (e.g. Twilio media URL) to Cloudinary.
 * Used when Twilio sends us media via webhook.
 */
export async function uploadUrlToCloudinary(
  sourceUrl: string,
  mimeType: string,
  folder: CloudinaryFolder
): Promise<CloudinaryUploadResult> {
  const resourceType = getResourceType(mimeType);
  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder,
    resource_type: resourceType,
    use_filename: false,
    unique_filename: true,
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    bytes: result.bytes,
    resourceType: result.resource_type,
  };
}

function getResourceType(mimeType: string): 'image' | 'video' | 'raw' | 'auto' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'video'; // Cloudinary uses 'video' for audio too
  return 'raw'; // PDFs and other raw files
}

function mimeTypeToFormat(mimeType: string): string | null {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mp4': 'mp4',
    'audio/webm': 'webm',
  };
  return map[mimeType] || null;
}

export { cloudinary };
