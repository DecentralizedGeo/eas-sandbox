import { checkExistingSchema, fetchSchema, SchemaRegistrationData, registerSchema } from "../eas-schema";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { getProviderSigner } from "../provider";
import { ethers } from "ethers";
import * as path from 'path';
import AdmZip from 'adm-zip';
import * as fs from 'fs';

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for ProofMode content upload
    schemaName: "ProofModeContentUpload",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    schemaString: "string srs, string locationType, string location, uint8 specVersion, uint64 eventTimestamp, string memo, string recipeType, string[] recipePayload",
    resolverAddress: ethers.ZeroAddress, //EASSchemaRegistryAddress // Optional: Use a resolver if needed
    revocable: true, // Check-ins are typically not revocable
};

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
    timestamp: number;
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

        // Parse the date string to get a timestamp in seconds
        let timestampInSeconds = 0;
        if (extractedData.proofGenerated) {
            // Convert ISO 8601 date string to Unix timestamp in seconds
            timestampInSeconds = Math.floor(new Date(extractedData.proofGenerated).getTime() / 1000);
        }
        
        const data = {
            location: coordinates,
            locationType: coordinates ? "decimalDegrees" : "",
            timestamp: timestampInSeconds,
        };

        console.log("Final Data:", {
            location: data.location || "(none)",
            locationType: data.locationType,
            timestamp: data.timestamp,
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
 * 1. Ensures the ProofMode schema is registered
 * 2. Finds and extracts the ProofMode zip file
 * 3. Computes the IPFS CID of the zip file (simulated) and creates the recipe
 * 4. Processes the ProofMode data from the extracted folder
 * 5. Prepares and creates an on-chain attestation with the extracted metadata and recipe
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

        // 5. Prepare and creates an on-chain attestation with the extracted metadata and recipe
        console.log("\nStep 5: Preparing and Creating On-Chain Attestation...");

        const attestationData: OnChainAttestationData = {
            recipient: finderAddress, // Attest to the finder themselves
            expirationTime: 0n, // No expiration
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString,
            dataToEncode: [
                { name: "srs", value: "EPSG:4326", type: "string" },
                { name: "locationType", value: proofModeData.locationType, type: "string" },
                { name: "location", value: proofModeData.location, type: "string" },
                { name: "specVersion", value: 1, type: "uint8" },
                { name: "eventTimestamp", value: BigInt(proofModeData.timestamp), type: "uint64" },
                { name: "memo", value: "", type: "string" },
                { name: "recipeType", value: "ProofMode", type: "string" },
                { name: "recipePayload", value: recipe, type: "string[]" },
            ],
        };

        console.log("\nAttestation Data to Encode:", attestationData.dataToEncode);

        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nOn-chain ProofMode attestation created successfully! UID: ${newAttestationUID}`);

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