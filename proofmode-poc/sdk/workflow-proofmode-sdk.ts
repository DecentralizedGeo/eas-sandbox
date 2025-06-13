import { ethers } from "ethers";
import * as fs from 'fs';
import * as path from 'path';
import { getProviderSigner } from "../../src/provider";

// Import modules
const AdmZip = require('adm-zip');
const { AstralSDK } = require('@decentralized-geo/astral-sdk');


// Extracts zip file
function extractZipFile(zipFilePath: string, destDir: string): string {
    console.log(`\nExtracting zip file: ${zipFilePath}`);

    try {
        // Create the destination directory if it doesn't exist
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Extract the zip file
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(destDir, true);

        console.log(`Zip file extracted successfully to: ${destDir}`);
        return destDir;
    } catch (error) {
        console.error(`Error extracting zip file: ${error}`);
        throw new Error(`Failed to extract zip file: ${error}`);
    }
}

/**
 * Processes a ProofMode directory
 * Extracts "Location.Latitude", "Location.Longitude", and "Proof Generated" metadata from proof.json file.
 * Requires location data (latitude/longitude) to be present in the proof.
 * @throws Error if location data is missing
 * @param proofDir - The directory containing the proof.json file.
 * @returns An object containing the location, locationType, and timestamp.
 */
function processProofModeData(proofDir: string): {
    location: string;
    locationType: string;
    timestamp: Date;
} {
    console.log("\n--- Processing ProofMode Data ---");

    if (!fs.existsSync(proofDir)) {
        throw new Error(`ProofMode directory not found at path: ${proofDir}`);
    }

    console.log(`\nProcessing ProofMode data from: ${proofDir}`);

    try {
        // List all files in the directory to find the proof.json file
        const files = fs.readdirSync(proofDir);
        const proofJsonFile = files.find(file => file.endsWith('.proof.json'));

        if (!proofJsonFile) {
            throw new Error('No proof.json file found in the directory');
        }

        const proofJsonPath = path.join(proofDir, proofJsonFile);
        console.log(`Found proof JSON file: ${proofJsonPath}`);

        // Read and parse the proof.json file
        const proofData = JSON.parse(fs.readFileSync(proofJsonPath, 'utf8'));

        // Extract data from the proof.json file for required schema fields
        const extractedData = {
            latitude: proofData["Location.Latitude"],
            longitude: proofData["Location.Longitude"],
            proofGenerated: proofData["Proof Generated"] || "",
        };
        
        // Validate that location data exists
        if (!extractedData.latitude || !extractedData.longitude) {
            throw new Error('Location data is required. The proof data does not contain valid latitude/longitude information.');
        }
        
        // Format the location as "latitude,longitude" if available
        const coordinates = `${extractedData.latitude},${extractedData.longitude}`;

        // Parse the date string to get a Date object
        let timestampDate = new Date();
        if (extractedData.proofGenerated) {
            timestampDate = new Date(extractedData.proofGenerated);
        }
        
        const data = {
            location: coordinates,
            locationType: coordinates ? "decimalDegrees" : "",
            timestamp: timestampDate,
        };

        console.log("Final Data:", {
            location: data.location || "(none)",
            locationType: data.locationType,
            timestamp: data.timestamp.toISOString(),
        });

        return data;
    } catch (error) {
        console.error(`Error processing ProofMode data: ${error}`);
        throw new Error(`Failed to process ProofMode data: ${error}`);
    }
}

/**
 * Initializes the Astral SDK
 * This replaces the schema registration step from the original workflow
 * @param signer - Ethers signer instance.
 * @returns {Promise<any>} The initialized Astral SDK instance.
 */
async function initializeAstralSDK(signer: ethers.Signer): Promise<any> {
    console.log("Initializing Astral SDK...");
    
    const sdk = new AstralSDK({
        signer: signer,
        defaultChain: 'sepolia',
        mode: 'onchain',
        debug: true
    });

    console.log("Astral SDK initialized successfully");
    return sdk;
}

/**
 * Runs the full ProofMode workflow using Astral SDK:
 * 1. Initializes the Astral SDK (replaces schema registration)
 * 2. Finds and extracts the ProofMode zip file
 * 3. Computes the IPFS CID of the zip file (simulated) and create the recipe
 * 4. Processes the ProofMode data from the extracted folder
 * 5. Prepares and creates an on-chain attestation using Astral SDK
 * 6. Finalizes the workflow.
 */
export async function runProofModeWorkflow(): Promise<void> {
    console.log("\n--- Starting ProofMode Workflow with Astral SDK ---");

    try {
        const { signer } = getProviderSigner();
        const finderAddress = await signer.getAddress();
        console.log(`Finder Address (Signer): ${finderAddress}`);

        // 1. Initialize Astral SDK (replaces schema registration)
        console.log("\nStep 1: Initializing Astral SDK...");
        const sdk = await initializeAstralSDK(signer);

        // 2. Find and extract the ProofMode zip file

        // Check if the sample-data directory exists
        if (!fs.existsSync(path.join(__dirname, '..', '..', 'sample-data'))) {
            throw new Error('Sample data directory not found. Please ensure it exists.');
        }

        const sampleDataDir = path.join(__dirname, '..', '..', 'sample-data');
        const zipFile = fs.readdirSync(sampleDataDir).find(file => file.startsWith('Test_PM-') && file.endsWith('.zip'));
        
        if (!zipFile) {
            throw new Error('No ProofMode zip file found. Please ensure a Test_PM-*.zip file is available.');
        }
        
        const zipFilePath = path.join(sampleDataDir, zipFile);
        console.log(`Found ProofMode zip file: ${zipFilePath}`);

        // Create a directory to extract the zip file to (use the same name as the zip file without the .zip extension)
        const extractDir = path.join(sampleDataDir, zipFile.replace('.zip', ''));

        // Extract the zip file
        extractZipFile(zipFilePath, extractDir);

        if (!fs.existsSync(extractDir)) {
            throw new Error(`Location folder not found at path: ${extractDir}`);
        }

        console.log(`Using location folder: ${extractDir}`);

        // 3. Compute the IPFS CID of the zip file (simulated) and create the recipe
        
        // Note: This step is not implemented in this example, but you would typically use an IPFS library to upload the file and get the CID.
        // For this example, we will skip the IPFS upload step and assume the CID is already known or not required.
        console.log("\nStep 3: Computing IPFS CID of the zip file...");
        const ipfsCID = "QmExampleCIDofTheZipFile";
        console.log(`IPFS CID of the zip file: ${ipfsCID}`);

        // Prepare the recipe for the schema
        const recipe: string[] = ["ProofMode", ipfsCID];

        // 4. Process the ProofMode data from the extracted folder
        console.log("\nStep 4: Processing ProofMode data from folder...");

        const proofModeData = processProofModeData(extractDir);

        // 5. Prepare and create an on-chain attestation using Astral SDK
        console.log("\nStep 5: Creating On-Chain Attestation using Astral SDK...");

        // Parse location coordinates for Astral SDK
        const [latitude, longitude] = proofModeData.location.split(',').map(parseFloat);

        // Create location input in GeoJSON format (Astral SDK's native format)
        const locationInput = {
            location: {
                type: 'Point',
                // GeoJSON uses [longitude, latitude] order
                coordinates: [longitude, latitude]
            },
            locationType: 'geojson',
            recipeType: ['ProofMode'],
            recipePayload: recipe,
            // Use Date object directly since Astral SDK expects a Date object
            timestamp: proofModeData.timestamp
        };

        console.log("\nLocation input for Astral SDK:", locationInput);

        // Create the attestation using Astral SDK
        const onchainProof = await sdk.createOnchainLocationAttestation(locationInput);
        console.log(`\nOn-chain ProofMode attestation created successfully using Astral SDK! UID: ${onchainProof.uid}`);
        console.log("Transaction Hash:", onchainProof.txHash);
        console.log("Block Number:", onchainProof.blockNumber);
        console.log("Attestation URL:", `https://sepolia.easscan.org/attestation/view/${onchainProof.uid}`);

        // 6. Finalize the workflow
        console.log("\nStep 6: Finalizing the workflow...");

        // In a real implementation, this would involve notifying the user or updating the UI
        // Here we just log the success message
        console.log("\n--- ProofMode Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- ProofMode Workflow Failed ---");
        console.error(error);
        throw error;
    }
}

runProofModeWorkflow()