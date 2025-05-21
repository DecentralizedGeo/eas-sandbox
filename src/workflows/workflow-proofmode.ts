import { ethers, Signer } from "ethers";
import * as CryptoJS from 'crypto-js';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { getProviderSigner } from "../provider";
import { checkExistingSchema, fetchSchema, SchemaRegistrationData, registerSchema } from "../eas-schema"; // Assuming a utility function
import { createOnChainAttestation, OnChainAttestationData, getAttestation } from "../eas-attestation";

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for ProofMode content upload
    schemaName: "ProofModeContentUpload",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    schemaString: "string location, string locationType, uint64 timestamp, string notes, string media",
    resolverAddress: ethers.ZeroAddress, //EASSchemaRegistryAddress // Optional: Use a resolver if needed
    revocable: true, // Check-ins are typically not revocable
};
// ---------------------------

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
 * Extracts ProofMode metadata from proof.json file.
 * Processes a ProofMode image file and extracts actual metadata from the corresponding proof.json file.
 */
function simulateProofModeUpload(imagePath: string): { 
    imageData: Buffer;
    location: string; 
    locationType: string;
    timestamp: number;
    notes: string;
    media: string;
} {
    console.log("\n--- Processing ProofMode Data ---");
    
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found at path: ${imagePath}`);
    }
    
    console.log(`\nProcessing image from: ${imagePath}`);
    
    try {
        // Read the image file
        const imageData = fs.readFileSync(imagePath);
        
        // Derive the path to the proof.json file based on the image path
        const imageDir = path.dirname(imagePath);
        
        // List all files in the directory to find the proof.json file
        const files = fs.readdirSync(imageDir);
        const proofJsonFile = files.find(file => file.endsWith('.proof.json'));
        
        if (!proofJsonFile) {
            throw new Error('No proof.json file found in the directory');
        }
        
        const proofJsonPath = path.join(imageDir, proofJsonFile);
        console.log(`Found proof JSON file: ${proofJsonPath}`);
        
        // Read and parse the proof.json file
        const proofData = JSON.parse(fs.readFileSync(proofJsonPath, 'utf8'));
        
        // Extract only the required fields: Location.Latitude, Location.Longitude, and Location.Time
        const latitude = proofData["Location.Latitude"];
        const longitude = proofData["Location.Longitude"];
        const timeSeconds = parseFloat(proofData["Location.Time"]);
        
        // Format the location as "latitude,longitude"
        const coordinates = `${latitude},${longitude}`;
        
        const data = {
            imageData: imageData,
            location: coordinates,
            locationType: "coordinates",
            timestamp: Math.floor(timeSeconds),
            notes: "",
            media: "",
        };
        
        console.log("ProofMode Data:", {
            location: data.location,
            locationType: data.locationType,
            timestamp: data.timestamp,
            notes: data.notes,
            media: data.media ? data.media : "(none)"
        });
        
        return data;
    } catch (error) {
        console.error(`Error processing ProofMode data: ${error}`);
        throw new Error(`Failed to process ProofMode data: ${error}`);
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
 * 3. Creates an on-chain attestation for the image with metadata.
 * 4. Finalizes the workflow.
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

        // 2. Find and extract the ProofMode zip file
        console.log("\nStep 2: Finding and extracting the ProofMode zip file...");
        const zipFile = fs.readdirSync(__dirname).find(file => file.startsWith('Test_PM-') && file.endsWith('.zip'));
        
        if (!zipFile) {
            throw new Error('No ProofMode zip file found. Please ensure a Test_PM-*.zip file is available.');
        }
        
        const zipFilePath = path.join(__dirname, zipFile);
        console.log(`Found ProofMode zip file: ${zipFilePath}`);
        
        // Create a directory to extract the zip file to (use the same name as the zip file without the .zip extension)
        const extractDir = path.join(__dirname, zipFile.replace('.zip', ''));
        
        // Extract the zip file
        extractZipFile(zipFilePath, extractDir);
        
        // 3. Process an image with ProofMode added metadata
        console.log("\nStep 3: Processing an image with ProofMode added metadata...");

        // Find the JPG file in the directory
        const files = fs.readdirSync(extractDir);
        const imageFile = files.find(file => file.endsWith('.JPG') || file.endsWith('.jpg'));
        
        if (!imageFile) {
            throw new Error('No image file found in the extracted ProofMode directory');
        }
        
        const imagePath = path.join(extractDir, imageFile);
        console.log(`Found ProofMode image: ${imagePath}`);
        
        const proofModeData = simulateProofModeUpload(imagePath);

        // 4. Prepare and Create On-Chain Attestation
        console.log("\nStep 4: Preparing and Creating On-Chain Attestation...");

        const attestationData: OnChainAttestationData = {
            recipient: finderAddress, // Attest to the finder themselves
            expirationTime: 0n, // No expiration
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString,
            dataToEncode: [
                { name: "location", value: proofModeData.location, type: "string" },
                { name: "locationType", value: proofModeData.locationType, type: "string" },
                { name: "timestamp", value: BigInt(proofModeData.timestamp), type: "uint64" },
                { name: "notes", value: proofModeData.notes, type: "string" },
                { name: "media", value: proofModeData.media, type: "string" },
            ],
        };

        console.log("\nAttestation Data to Encode:", attestationData.dataToEncode);

        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nOn-chain ProofMode attestation created successfully! UID: ${newAttestationUID}`);
        
        // 5. Finalize the workflow
        console.log("\nStep 5: Finalizing the workflow...");
        
        // In a real implementation, this would involve notifying the user or updating the UI
        // Here we just log the success message
        console.log("\n--- ProofMode Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- ProofMode Workflow Failed ---");
        console.error(error);
    }
}

runProofModeWorkflow()