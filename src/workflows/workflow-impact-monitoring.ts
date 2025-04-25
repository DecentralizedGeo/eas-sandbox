import { getProviderSigner } from "../provider";
import { registerSchema, fetchSchema, SchemaRegistrationData, SchemaRecord } from "../eas-schema";
import { createOnChainAttestation, OnChainAttestationData, getAttestation } from "../eas-attestation";
import { ethers } from "ethers";

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for geospatial bounds
    schemaName: "GeospatialAreaBounds",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    schemaString: "string areaName, string description, string geoJsonBounds",
    resolverAddress: ethers.ZeroAddress, // Optional: Use a resolver if needed
    revocable: true,

    // Example Data for the Attestation
    areaName: "Willow Creek Conservation Area",
    description: "Protected wetland habitat established 2025.",
    // Example GeoJSON string for a polygon (replace with actual data if needed)
    geoJsonBounds: JSON.stringify({
        type: "Polygon",
        coordinates: [[[-74.0, 40.7], [-74.1, 40.7], [-74.1, 40.8], [-74.0, 40.8], [-74.0, 40.7]]]
    }),
    recipient: ethers.ZeroAddress, // Attest to self or a specific entity
    expirationTime: 0n, // No expiration
};
// ---------------------------

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
 * Main function for the Impact Monitoring workflow.
 */
async function runImpactMonitoringWorkflow() {
    console.log("\n--- Starting Impact Monitoring Workflow ---");

    try {
        // 1. Initialize provider and signer
        const { signer } = getProviderSigner();
        console.log(`Using signer: ${signer.address}`);

        // 2. Ensure the schema is registered (FR4, FR10 - Chaining)
        const schemaUID = await ensureSchemaRegistered(signer);

        // 3. Prepare Attestation Data (FR1)
        // Note: Data validation against the schema happens implicitly within SchemaEncoder (FR5)
        const attestationData: OnChainAttestationData = {
            recipient: WORKFLOW_CONFIG.recipient,
            expirationTime: WORKFLOW_CONFIG.expirationTime,
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString, // Needed for encoding
            dataToEncode: [
                { name: "areaName", value: WORKFLOW_CONFIG.areaName, type: "string" },
                { name: "description", value: WORKFLOW_CONFIG.description, type: "string" },
                { name: "geoJsonBounds", value: WORKFLOW_CONFIG.geoJsonBounds, type: "string" },
            ],
        };
        console.log("\nPrepared attestation data:", {
            areaName: WORKFLOW_CONFIG.areaName,
            description: WORKFLOW_CONFIG.description,
            geoJsonBounds: WORKFLOW_CONFIG.geoJsonBounds,
        });

        // 4. Create the On-Chain Attestation (FR6)
        console.log("\nCreating on-chain attestation for geospatial bounds...");
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nAttestation created successfully! UID: ${newAttestationUID}`);
        console.log(`View attestation: https://sepolia.easscan.org/attestation/view/${newAttestationUID}`);

        // 5. Optional: Retrieve the attestation to verify (FR6)
        console.log("\nRetrieving created attestation for verification...");
        const fetchedAttestation = await getAttestation(newAttestationUID);
        if (fetchedAttestation) {
            console.log("Successfully fetched and verified attestation details.");
            // Potentially decode and display data here if needed
        } else {
            console.warn("Could not fetch the newly created attestation immediately.");
        }

        console.log("\n--- Impact Monitoring Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- Impact Monitoring Workflow Failed ---");
        console.error(error);
        process.exit(1);
    }
}

runImpactMonitoringWorkflow();
