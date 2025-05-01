import { ethers, Signer } from "ethers";
import * as CryptoJS from 'crypto-js';
import * as fs from 'fs';
import * as path from 'path';
import { getProviderSigner } from "../provider";
import { checkExistingSchema, fetchSchema, SchemaRegistrationData, registerSchema } from "../eas-schema"; // Assuming a utility function
import { createOnChainAttestation, OnChainAttestationData, getAttestation } from "../eas-attestation";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for ProofMode content upload
    schemaName: "ProofModeContentUpload",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    schemaString: "string latitude, string longitude, uint64 timestamp, string fileHash, string ipfsCid",
    resolverAddress: ethers.ZeroAddress, //EASSchemaRegistryAddress // Optional: Use a resolver if needed
    revocable: true, // Check-ins are typically not revocable
};
// ---------------------------

/**
 * Creates a SHA256 hash of a string using crypto-js
 * @param text - Text (for demonstration purposes) to hash
 * @returns Hexadecimal string representation of the hash
 */
function sha256(text: string): string {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}

/**
 * Simulates ProofMode content upload and extracting metadata.
 * Processes a ProofMode image file and extracts/simulates its metadata.
 * 
 * @param {string} imagePath - Path to the image file
 * @returns {object} The image data and its metadata
 */
function simulateProofModeUpload(imagePath: string): { 
    imageData: Buffer;
    latitude: string; 
    longitude: string; 
    timestamp: number;
    fileHash: string;
} {
    // Simulate the process of uploading a photo with ProofMode and extracting metadata such as latitude, longitude, timestamp, and file hash
    // In a real implementation, this would be done by the ProofMode app. Here we just read the file and simulate the metadata extraction
    // For demonstration, we will use a sample image file
    console.log("\n--- Simulating ProofMode Upload ---");
    
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found at path: ${imagePath}`);
    }
    
    console.log(`\nProcessing image from: ${imagePath}`);
    
    try {
        // Read the image file
        const imageData = fs.readFileSync(imagePath);
        
        // In a real ProofMode implementation, the metadata would be extracted from the image EXIF data
        // Here we simulate the metadata that would be provided by ProofMode
        const data = {
            imageData: imageData,
            latitude: "40.7128", // Example coordinates (New York City)
            longitude: "-74.0060",
            timestamp: Math.floor(Date.now() / 1000),
            fileHash: sha256(imageData.toString('hex')), // Hash of the file contents
        };
        
        console.log("ProofMode Data:", {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp,
            fileHash: data.fileHash,
        });
        
        return data;
    } catch (error) {
        console.error(`Error processing image: ${error}`);
        throw new Error(`Failed to process image: ${error}`);
    }
}

/**
 * Ensures the required schema exists, registering it if necessary.
 * @param signer - Ethers signer instance.
 * @returns {Promise<string>} The UID of the schema.
 */
async function ensureSchemaRegistered(signer: ethers.Signer): Promise<string> {
    let schemaUID = WORKFLOW_CONFIG.schemaUID;

    if (schemaUID) {
        console.log(`Schema UID provided: ${schemaUID}. Verifying existence...`);
        const schemaRecord = await fetchSchema(schemaUID);
        if (schemaRecord && schemaRecord.schema === WORKFLOW_CONFIG.schemaString) {
            console.log("Schema found and matches configuration.");
            return schemaUID;
        } else {
            console.warn("Provided schema UID not found or schema string mismatch. Attempting to register new schema.");
        }
    }

    // If schemaUID is not provided or does not match, register a new schema. But let's check if
    // the schema is already registered by calculating the UID and checking the SchemaRegistry.
    const existingSchemaUID = await checkExistingSchema(WORKFLOW_CONFIG.schemaString, WORKFLOW_CONFIG.resolverAddress, WORKFLOW_CONFIG.revocable);
    if (existingSchemaUID) {
        return existingSchemaUID; // Return the existing UID if found
    }

    console.log(`Schema UID not provided or invalid. Registering new schema: "${WORKFLOW_CONFIG.schemaString}"`);
    const schemaData: SchemaRegistrationData = {
        schema: WORKFLOW_CONFIG.schemaString,
        resolverAddress: WORKFLOW_CONFIG.resolverAddress,
        revocable: WORKFLOW_CONFIG.revocable,
    };

    schemaUID = await registerSchema(signer, schemaData);
    console.log(`Schema registered with new UID: ${schemaUID}`);
    return schemaUID;
}

/**
 * Runs the full ProofMode workflow:
 * 1. Ensures the ProofMode schema is registered.
 * 2. Simulates uploading the image and extracting metadata.
 * 3. Simulates storing the image on IPFS.
 * 4. Creates an on-chain attestation for the image with metadata and IPFS CID.
 * 5. Simulates the verification of the attestation by a third-party verifier.
 * 6. Finalizes the workflow.
 */
export async function runProofModeWorkflow(): Promise<void> {
    console.log("\n--- Starting ProofMode Workflow ---");

    try {
        const { signer } = getProviderSigner();
        const finderAddress = await signer.getAddress();
        console.log(`Finder Address (Signer): ${finderAddress}`);

        // 1. Ensure the schema is registered
        console.log("\nStep 1: Ensuring ProofMode Schema is Registered...");
        const schemaUID = await ensureSchemaRegistered(signer);

        console.log(`Using Schema UID: ${schemaUID}`);

        // 2. Simulate taking a photo with ProofMode and extracting its metadata
        console.log("\nStep 2: Simulating taking a photo with ProofMode and extracting its metadata...");
        // For demonstration, we will use a sample image file
        const sampleImagePath = path.join(__dirname, '../../sample-data/sample-image.jpg');
        
        // Create a sample image file if it doesn't exist
        if (!fs.existsSync(path.dirname(sampleImagePath))) {
            fs.mkdirSync(path.dirname(sampleImagePath), { recursive: true });
        }
        
        if (!fs.existsSync(sampleImagePath)) {
            // Creating a simple empty image file for demo purposes
            const sampleBuffer = Buffer.from('Sample image', 'utf8');
            fs.writeFileSync(sampleImagePath, sampleBuffer);
            console.log(`Created a sample image file at: ${sampleImagePath}`);
        }
        
        const proofModeData = simulateProofModeUpload(sampleImagePath);

        
        // 3. Simulate storing the image on IPFS (in a real app) and getting the IPFS CID
        console.log("\nStep 3: Simulating storing the image on IPFS and getting the CID...");
        const mockIpfsCid = "ipfs://Qm" + proofModeData.fileHash.substring(0, 44);
        console.log(`Simulated IPFS CID: ${mockIpfsCid}`);

        // 4. Prepare and Create On-Chain Attestation
        console.log("\nStep 4: Preparing and Creating On-Chain Attestation...");

        const attestationData: OnChainAttestationData = {
            recipient: finderAddress, // Attest to the finder themselves
            expirationTime: 0n, // No expiration
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString,
            dataToEncode: [
                { name: "latitude", value: proofModeData.latitude, type: "string" },
                { name: "longitude", value: proofModeData.longitude, type: "string" },
                { name: "timestamp", value: BigInt(proofModeData.timestamp), type: "uint64" },
                { name: "fileHash", value: proofModeData.fileHash, type: "string" },
                { name: "ipfsCid", value: mockIpfsCid, type: "string" },
            ],
        };

        console.log("\nAttestation Data to Encode:", attestationData.dataToEncode);

        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nOn-chain ProofMode attestation created successfully! UID: ${newAttestationUID}`);

        // 5. Simulate the verification of the attestation by a third-party verifier
        console.log("\nStep 5: Simulating the verification of the attestation by a third-party verifier...");

        // First, the verifier retrieves the attestion from the blockchain using the UID
        console.log(`Verifier is retrieving the attestation with UID: ${newAttestationUID} from the blockchain...`);
        const fetchedAttestation = await getAttestation(newAttestationUID);

        if (!fetchedAttestation) {
            console.error("Failed to retrieve the attestation from the blockchain. Verification cannot proceed.");
            return;
        }

        console.log("Attestation retrieved successfully!");

        // Then, the verifier would decode the attestation data...
        console.log("Verifier is decoding the attestation data to extract the fileHash...");
        const schemaEncoder = new SchemaEncoder(WORKFLOW_CONFIG.schemaString);
        const decodedData = schemaEncoder.decodeData(fetchedAttestation.data);
        console.log("Decoded Data:", decodedData);
        
        // ... and extract the fileHash
        let attestedFileHash = "";
        for (const field of decodedData) {
            if (field.name === "fileHash") {
                attestedFileHash = field.value.value as string;
                break;
            }
        }
        
        if (!attestedFileHash) {
            console.error("Could not extract fileHash from the attestation. Verification cannot proceed.");
            return;
        }

        console.log(`Extracted fileHash from attestation: ${attestedFileHash}`);
        
        // Then, the verifier would retrieve the image file using the IPFS CID and calculating its hash
        // Here we simulate this process by reading the local file
        console.log("Simulating the verifier retrieving the image file from IPFS...");
        const retrievedIpfsImageData = fs.readFileSync(sampleImagePath);
        const verifierCalculatedHash = sha256(retrievedIpfsImageData.toString('hex'));
        
        console.log(`Hash from blockchain attestation: ${attestedFileHash}`);
        console.log(`Hash calculated by verifier: ${verifierCalculatedHash}`);
        
        // Compare the hashes
        const isVerified = attestedFileHash === verifierCalculatedHash;
        
        if (isVerified) {
            console.log("\nVerification successful! The image has not been tampered with.");
        } else {
            console.log("\nVerification failed! The image may have been modified since attestation.");
        }
        
        // 6. Finalize the workflow
        console.log("\nStep 6: Finalizing the workflow...");
        
        // In a real implementation, this would involve notifying the user or updating the UI
        // Here we just log the success message
        console.log("\n--- ProofMode Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- ProofMode Workflow Failed ---");
        console.error(error);
    }
}

runProofModeWorkflow()
