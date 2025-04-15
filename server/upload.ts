import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express, { Express, Request, Response } from 'express';

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images and videos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  const allowedMimeTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4, WebM, MOV, AVI videos are allowed.'));
  }
};

// Initialize multer upload
export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB file size limit to accommodate videos
  }
});

// Setup upload routes
export function setupUploadRoutes(app: Express) {
  // Single file upload endpoint
  app.post('/api/upload', upload.single('media'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return the file information including the URL path
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.status(200).json({
        message: 'File uploaded successfully',
        file: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
}

// Serve uploaded files
export function serveUploads(app: Express) {
  // Use the Express.static middleware
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}