#!/usr/bin/env node

/**
 * Standalone Web3.Storage uploader script (ES Module)
 * This script runs as a separate Node.js process to handle the ES module compatibility
 */

import * as Client from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import * as Proof from '@web3-storage/w3up-client/proof';
import { Signer } from '@web3-storage/w3up-client/principal/ed25519';
import { readFileSync } from 'fs';

async function uploadToWeb3Storage() {
  try {
    // Get arguments from command line
    const filePath = process.argv[2];
    const token = process.env.WEB3STORAGE_TOKEN;
    const proof = process.env.WEB3STORAGE_PROOF;

    if (!token || !proof) {
      throw new Error('Web3Storage credentials not configured');
    }

    // Initialize client
    const principal = Signer.parse(token);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    // Setup space delegation
    const parsedProof = await Proof.parse(proof);
    const space = await client.addSpace(parsedProof);
    await client.setCurrentSpace(space.did());

    // Read and upload file
    const fileData = readFileSync(filePath);
    
    const blob = new Blob([fileData], { type: 'application/zip' });
    const cid = await client.uploadFile(blob);
    
    const cidString = cid.toString();
    
    // Output result as JSON to stdout
    console.log(JSON.stringify({
      cid: cidString,
      uri: `https://${cidString}.ipfs.w3s.link`,
      size: fileData.length
    }));

  } catch (error) {
    console.error('Web3.Storage upload failed:', error);
    process.exit(1);
  }
}

uploadToWeb3Storage();
