import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs'
import {v7 as uuidV7 } from 'uuid'

function makeTargetPath(cluster:string){
  const targetDir = path.join(__dirname, `../../../cdn.pirrot.de/httpdocs/storage/${cluster}/`);
  // Ensure the target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

  return targetDir
}
// Calculate the target directory path



// Different rate limits for different scenarios
export const uploadLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, 
    message: 'Too many upload requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  export const strictUploadLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 50 uploads per hour
    message: 'Hourly upload limit reached, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const appKey = (req as any).apiKey as string
      const userId = (req as any).userId as string
      const cluster = getHashedCluster(appKey, userId) 
      const uploadDir = makeTargetPath(cluster)
      ensureDir(uploadDir)
      cb(null, uploadDir) // Make sure this directory exists
    },
    filename: (req, file, cb) => {
            // Map MIME types to extensions
            const mimeToExt: { [key: string]: string } = {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'application/pdf': 'pdf'
            };
            
            // Get extension from MIME type, fallback to originalname if needed
            const ext = mimeToExt[file.mimetype];

      cb(null, `${uuidV7()}.${ext}`)
    }
  });
  
  // File filter to restrict file types
  const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and PDF files are allowed.'));
    }
  };
  
export const upload = multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB file size limit
      files: 5 // Only one file per request
    },
    fileFilter: fileFilter
  });


// Function to ensure directory exists
/**
 * @param {fs.PathLike} dir
 */

function ensureDir(dir: fs.PathLike) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SALT_STRING = process.env.SALT_STRING as string
export function getHashedCluster(
  str1: string,
  str2: string,
  saltStr: string = SALT_STRING ): string {
  // Combine inputs
  const combined = str1 + str2 + saltStr;
  
  // Simple hash algorithm (FNV-1a)
  let hash = 2166136261;

  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }


  // Convert to positive 32-bit integer
  hash = hash >>> 0;
  
  // Convert to base36 (alphanumeric) and ensure 12 chars
  let result = hash.toString(36).padStart(12, '0').slice(0, 12);
  
  return result;
}