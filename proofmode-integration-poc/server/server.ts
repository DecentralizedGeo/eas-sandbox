import { runProofModeWorkflowWithFile } from './workflow-proofmode-server';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'proofmode-uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'proofmode-' + uniqueSuffix + ext);
  }
});

// Create the multer instance with file size limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only zip files
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only zip files are allowed') as any);
    }
  }
});

// Handle file upload
app.post('/upload', upload.single('proofmodeFile'), (req: express.Request, res: express.Response) => {
  if (!req.file) {
    res.status(400).json({ 
      success: false,
      message: 'No file uploaded' 
    });
    return;
  }

  console.log(`File uploaded: ${req.file.path}`);
  
  // Process the uploaded file with the ProofMode workflow
  runProofModeWorkflowWithFile(req.file.path)
    .then((result: { attestationUID: string; location: string; timestamp: number }) => {
      // Return the attestation result
      res.json({
        success: true,
        message: 'ProofMode data processed successfully',
        attestationUID: result.attestationUID,
        location: result.location,
        timestamp: result.timestamp,
        easUrl: `https://sepolia.easscan.org/attestation/view/${result.attestationUID}`
      });
    })
    .catch((error: any) => {
      console.error('Error processing upload:', error);
      res.status(500).json({
        success: false,
        message: `Error processing the ProofMode data: ${error.message || 'Unknown error'}`
      });
    });
});

// Error handler middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false, 
    message: err.message || 'Something went wrong!'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
