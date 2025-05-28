import { ethers, Signer } from "ethers";
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
    schemaString: "string location, string locationType, uint64 timestamp, tuple(string,string)[] proofs",
    resolverAddress: ethers.ZeroAddress, //EASSchemaRegistryAddress // Optional: Use a resolver if needed
    revocable: true, // Check-ins are typically not revocable
};

// ProofType enum registry
enum ProofType {
    BASIC = "basic",           // Basic proof
    LOCATION = "location",     // Location verification proof
    NETWORK = "network",       // Network context verification
    NOTARY = "notary",         // Third-party notarization
    C2PA = "c2pa",             // Content authenticity verification
}
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
 * Interface for proof evidence objects
 */
interface ProofEvidence {
    proofType: ProofType;
    payload: string;
}

/**
 * Extracts ProofMode metadata from proof.json file.
 * Processes a ProofMode directory and extracts metadata from the proof.json file.
 */
function simulateProofModeUpload(proofDir: string): { 
    location: string; 
    locationType: string;
    timestamp: number;
    proofs: ProofEvidence[];
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
            timeSeconds: parseFloat(proofData["Proof Generated"] || "0"),
        };
        
        // Format the location as "latitude,longitude" if available
        const coordinates = (extractedData.latitude && extractedData.longitude) 
            ? `${extractedData.latitude},${extractedData.longitude}` 
            : "";
            
        // Determine the proof types present in this folder
        const proofTypes: ProofEvidence[] = [];
        
        // Basic proof is always present (all .proof.json files have non-empty values for these keys)
        proofTypes.push({
            proofType: ProofType.BASIC,
            payload: JSON.stringify({
                // File information
                fileHash: proofData["File Hash SHA256"],
                
                // Device information
                deviceId: proofData["DeviceID"],
                
                // Timestamps
                proofGenerated: proofData["Proof Generated"],
                
                // Network details
                network: proofData["Network"],
                networkType: proofData["NetworkType"],
                ipv4: proofData["IPv4"],
                ipv6: proofData["IPv6"],
                cellInfo: proofData["CellInfo"],
                dataType: proofData["DataType"],
                
                // Regional settings
                language: proofData["Language"],
                locale: proofData["Locale"]
            })
        });
        
        // Check for location proof
        if (extractedData.latitude && extractedData.longitude) {
            proofTypes.push({
                proofType: ProofType.LOCATION,
                payload: JSON.stringify({
                    latitude: proofData["Location.Latitude"],
                    longitude: proofData["Location.Longitude"],
                    time: parseFloat(proofData["Location.Time"]),
                    altitude: proofData["Location.Altitude"],
                    accuracy: proofData["Location.Accuracy"],
                    provider: proofData["Location.Provider"]
                })
            });
        }
        
        // Check for network proof
        if (proofData["CellInfo"] && proofData["CellInfo"] !== "none") {
            proofTypes.push({
                proofType: ProofType.NETWORK,
                payload: JSON.stringify({
                    cellInfo: proofData["CellInfo"],
                })
            });
        }
        
        // Check for notary proof (TO DO)
        
        // Check for C2PA proof (TO DO)
        
        const data = {
            location: coordinates,
            locationType: coordinates ? "coordinates" : "",
            timestamp: Math.floor(extractedData.timeSeconds) || 0,
            proofs: proofTypes
        };
        
        console.log("Final Data:", {
            location: data.location || "(none)",
            locationType: data.locationType,
            timestamp: data.timestamp,
            proofs: `${proofTypes.length} proof types detected`
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

        // check if the sample-data directory exists
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

        // 3. Process ProofMode data from folder
        console.log("\nStep 3: Processing ProofMode data from folder...");

        const proofModeData = simulateProofModeUpload(extractDir);

        // 4. Prepare and Create On-Chain Attestation
        console.log("\nStep 4: Preparing and Creating On-Chain Attestation...");

        // Prepare the proof types for the schema
        const proofTypes: ProofEvidence[] = proofModeData.proofs;
        
        // Convert ProofEvidence objects into tuples for the schema
        const proofTuples = proofTypes.map(proof => {
            // Each proof becomes a tuple of [proofType, payload]
            return [proof.proofType, proof.payload];
        });
        
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
                { name: "proofs", value: proofTuples, type: "tuple[]" },
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