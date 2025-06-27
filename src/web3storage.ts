/**
 * IPFS/Filecoin Storage using Web3.Storage (via external ES module script)
 * Provides IPFS storage with Filecoin backup via Web3.Storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Storage result interface
export interface IPFSUploadResult {
  cid: string;
  uri: string;
  size?: number;
}

/**
 * Upload data buffer to Web3.Storage using external ES module script
 */
export async function uploadToWeb3Storage(data: Buffer, fileName: string): Promise<IPFSUploadResult> {
  if (!process.env.WEB3STORAGE_TOKEN || !process.env.WEB3STORAGE_PROOF) {
    throw new Error('Web3Storage credentials not configured. Please set WEB3STORAGE_TOKEN and WEB3STORAGE_PROOF in your .env file');
  }

  // Write buffer to temporary file
  const tempFilePath = path.join(__dirname, '..', 'temp', `${Date.now()}-${fileName}`);
  const tempDir = path.dirname(tempFilePath);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  fs.writeFileSync(tempFilePath, data);

  try {
    console.log(`Uploading to Web3.Storage: ${fileName} (${data.length} bytes)`);
    
    // Run the external Web3.Storage uploader script
    const uploaderScript = path.join(__dirname, 'web3-storage-uploader.mjs');
    
    const result = await new Promise<IPFSUploadResult>((resolve, reject) => {
      const child = spawn('node', [uploaderScript, tempFilePath, fileName], {
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse the JSON result from stdout
            const result = JSON.parse(stdout.trim());
            console.log(`Web3.Storage CID: ${result.cid}`);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse upload result: ${parseError}`));
          }
        } else {
          reject(new Error(`Web3.Storage upload failed (exit code ${code}): ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn uploader process: ${error}`));
      });
    });

    return result;
    
  } catch (error) {
    console.error('Web3.Storage upload failed:', error);
    throw new Error(`Failed to upload to Web3.Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
  }
}