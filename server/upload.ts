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
    fileSize: 20 * 1024 * 1024 // 20MB file size limit as per requirements
  }
});

// Setup upload routes
export function setupUploadRoutes(app: Express) {
  // Handle multer errors
  const handleMulterError = (err: any, req: Request, res: Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      // A multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File is too large. Maximum size is 20MB.' 
        });
      }
      return res.status(400).json({ 
        error: `Upload error: ${err.message}` 
      });
    } else if (err) {
      // Another error occurred
      console.error('Upload error:', err);
      return res.status(500).json({ 
        error: err.message || 'Failed to upload file' 
      });
    }
    next();
  };
  
  // Single file upload endpoint
  app.post('/api/upload', (req: Request, res: Response, next: express.NextFunction) => {
    // Check authentication first
    // Special case for demo mode - allow uploads without authentication
    const isDemoMode = req.query.demo === 'true' || 
                       req.get('host')?.includes('replit.dev') || 
                       process.env.NODE_ENV === 'development';
    
    if (!isDemoMode && (!req.isAuthenticated || !req.isAuthenticated())) {
      console.log('Upload attempted without authentication');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to upload files' 
      });
    }
    
    // For demo mode, mock a user if needed
    if (isDemoMode && !req.user) {
      console.log('Using demo mode for upload');
    }
    
    console.log('Upload endpoint hit. Headers:', req.headers['content-type']);
    console.log('Request body type:', typeof req.body);
    console.log('Authenticated user:', req.user?.id);
    
    // First handle the upload
    upload.single('media')(req, res, (err) => {
      if (err) {
        console.error('Upload error during multer processing:', err);
        return handleMulterError(err, req, res, next);
      }
      
      try {
        console.log('Multer processed request. File present:', !!req.file);
        
        if (!req.file) {
          console.error('No file in request after multer processing');
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        console.log('File uploaded successfully:', req.file.filename);
        console.log('File details:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });
        
        // Return the file information including the URL path
        // Make sure the URL path is absolute to avoid any path resolution issues
        const fileUrl = `/uploads/${req.file.filename}`;
        
        console.log(`Upload successful. Returning URL: ${fileUrl}`);
        
        return res.status(200).json({
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
        console.error('Error processing uploaded file:', error);
        return res.status(500).json({ error: 'Failed to process uploaded file' });
      }
    });
  });
}

// Serve uploaded files
export function serveUploads(app: Express) {
  // Serve uploads directory with proper cache headers
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '1h',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));
  
  // Also serve attached_assets for demo content
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
    maxAge: '1h',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));
  
  // For demo purposes, log available files
  console.log('Serving files from uploads directory');
  try {
    const files = fs.readdirSync(path.join(process.cwd(), 'uploads'));
    console.log(`Available files in uploads (${files.length}):`, files.slice(0, 5).join(', ') + (files.length > 5 ? '...' : ''));
  } catch (err) {
    console.error('Error reading uploads directory:', err);
  }
}