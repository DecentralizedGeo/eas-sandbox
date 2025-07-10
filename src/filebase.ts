#!/usr/bin/env ts-node

/**
 * Simple IPFS Upload Script using Filebase RPC API
 * 
 * To get your API token:
 * 1. Go to https://console.filebase.com/keys
 * 2. Find the "IPFS RPC API Keys" section
 * 3. Select your IPFS bucket from the dropdown
 * 4. Copy the token
 * 5. Add it to your .env file as FILEBASE_API_KEY
 * 
 * Usage:
 *   1. Get your IPFS token (see above)
 *   2. Run: yarn filebase
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

/**
 * Upload a JPG file to IPFS via Filebase RPC API
 */
async function uploadToIPFS(filePath: string, apiKey: string) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  
  console.log(`Uploading ${fileName} to IPFS...`);

  // Read file and create form data
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = `----formdata-${Date.now()}`;
  
  const formData = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    `Content-Type: image/jpeg`,
    '',
    fileBuffer.toString('binary'),
    `--${boundary}--`
  ].join('\r\n');

  // Upload to Filebase
  const response = await fetch('https://rpc.filebase.io/api/v0/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: Buffer.from(formData, 'binary')
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} ${error}`);
  }

  const result = await response.json() as { Hash: string; Name: string };
  
  console.log(`Upload successful!`);
  console.log(`CID: ${result.Hash}`);
  console.log(`URL: https://gateway.filebase.io/ipfs/${result.Hash}`);
  console.log(`Size: ${stats.size} bytes`);

  return result.Hash;
}

async function main() {
  const apiKey = process.env.FILEBASE_API_KEY;
  
  if (!apiKey) {
    console.error('Missing FILEBASE_API_KEY in .env file');
    process.exit(1);
  }
  
  const imagePath = './sample-data/test-image.jpg';
  
  try {
    console.log('Starting IPFS upload...\n');
    const cid = await uploadToIPFS(imagePath, apiKey);
    console.log(`\nSuccess! CID: ${cid}`);
  } catch (error) {
    console.error(`Failed:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}