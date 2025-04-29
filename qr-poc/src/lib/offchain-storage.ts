/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignedOffchainAttestation } from "@ethereum-attestation-service/eas-sdk";
import * as fs from 'fs/promises';
import * as path from 'path';

const storageFilePath = path.join(__dirname, '..', 'offchain-attestations.json'); // Store in project root

// Helper function to read attestations from the file
async function readStorage(): Promise<SignedOffchainAttestation[]> {
    try {
        await fs.access(storageFilePath); // Check if file exists
        const fileContent = await fs.readFile(storageFilePath, 'utf-8');
        // Handle empty file case
        if (!fileContent.trim()) {
            return [];
        }
        // Parse JSON, converting stringified BigInts back
        const attestations = JSON.parse(fileContent, (key, value) => {
            // Assuming BigInts were stored as strings ending with 'n'
            if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
                return BigInt(value.slice(0, -1));
            }
            // Handle potential hex strings that might represent BigInts (like signature.r/s)
            // This might need refinement based on actual stored format
            if (key === 'r' || key === 's' || key === 'v' || key === 'expirationTime' || key === 'time') {
                // Attempt to convert hex or numeric strings to BigInt if appropriate
                // This is a basic attempt; robust parsing might be needed
                try {
                    if (typeof value === 'string' && value.startsWith('0x')) {
                        return BigInt(value);
                    } else if (typeof value === 'string' && !isNaN(Number(value))) {
                        // If it was stored as a plain number string, convert to BigInt
                        // return BigInt(value);
                        // Or handle as number if appropriate for the field
                    }
                } catch (e: any) {
                    console.log(`Error converting value for key ${key}:`, e);
                }
            }
            return value;
        });
        return Array.isArray(attestations) ? attestations : [];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        console.error("Error reading off-chain storage:", error);
        throw new Error(`Failed to read off-chain storage file: ${storageFilePath}`);
    }
}

// Helper function to write attestations to the file
async function writeStorage(attestations: SignedOffchainAttestation[]): Promise<void> {
    try {
        // Stringify with BigInt support (store as strings ending with 'n')
        const fileContent = JSON.stringify(attestations, (_key, value) =>
            typeof value === 'bigint' ? value.toString() + 'n' : value, 2);
        await fs.writeFile(storageFilePath, fileContent, 'utf-8');
    } catch (error) {
        console.error("Error writing to off-chain storage:", error);
        throw new Error(`Failed to write off-chain storage file: ${storageFilePath}`);
    }
}

/**
 * Saves a signed off-chain attestation to the local JSON storage file.
 * @param attestation - The SignedOffchainAttestation object to save.
 * @returns {Promise<void>}
 */
export async function saveOffChainAttestation(attestation: SignedOffchainAttestation): Promise<void> {
    console.log(`\nSaving off-chain attestation with UID: ${attestation.uid} to ${storageFilePath}...`);
    const currentAttestations = await readStorage();
    // Optional: Check for duplicates based on UID if desired
    if (currentAttestations.some(a => a.uid === attestation.uid)) {
        console.warn(`Attestation with UID ${attestation.uid} already exists in storage. Skipping save.`);
        return;
    }
    currentAttestations.push(attestation);
    await writeStorage(currentAttestations);
    console.log("Attestation saved successfully.");
}

// Interface for filtering criteria
export interface OffChainAttestationQuery {
    uid?: string;
    schema?: string;
    recipient?: string;
    attester?: string;
    // Add other potential filter fields as needed
}

/**
 * Loads signed off-chain attestations from the local JSON storage file.
 * Optionally filters based on provided criteria.
 * @param query - Optional criteria to filter attestations.
 * @returns {Promise<SignedOffchainAttestation[]>} An array of matching attestations.
 */
export async function loadOffChainAttestations(query?: OffChainAttestationQuery): Promise<SignedOffchainAttestation[]> {
    console.log(`\nLoading off-chain attestations from ${storageFilePath}...`);
    const allAttestations = await readStorage();

    if (!query || Object.keys(query).length === 0) {
        console.log(`Loaded ${allAttestations.length} total attestations.`);
        return allAttestations; // Return all if no query
    }

    console.log("Applying filter:", query);
    const filteredAttestations = allAttestations.filter(att => {
        if (query.uid && att.uid !== query.uid) return false;
        if (query.schema && att.message.schema !== query.schema) return false;
        if (query.recipient && att.message.recipient !== query.recipient) return false;
        // if (query.attester && att.signer !== query.attester) return false; // Assuming signer is the attester
        // Add more filter conditions here
        return true;
    });

    console.log(`Found ${filteredAttestations.length} matching attestations.`);
    return filteredAttestations;
}
