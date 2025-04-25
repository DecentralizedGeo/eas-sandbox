import { ethers, Signer } from "ethers";
import { getProviderSigner } from "../provider";
import { checkExistingSchema, fetchSchema, SchemaRegistrationData, registerSchema } from "../eas-schema"; // Assuming a utility function
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
// Import createOffChainAttestation and saveOffChainAttestation if needed later
// import { createOffChainAttestation, OffChainAttestationData } from "../eas-attestation";
// import { saveOffChainAttestation } from "../offchain-storage";

// --- Geocaching Schema ---
// Defines the structure for a geocaching discovery attestation.
// const GEOCACHING_SCHEMA_STRING = "bytes32 cacheId, string latitude, string longitude, uint64 timestamp, address finderAddress";
// const GEOCACHING_SCHEMA_RESOLVER_ADDRESS = undefined; // No resolver for this example
// const GEOCACHING_SCHEMA_REVOCABLE = true; // Discoveries can be revoked if needed

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for event check-in with GeoJSON location
    schemaName: "EventCheckInGeoIPLocation",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    // schemaUID: "0x74bfb50ce021fc8ec599d1b96b3bfd1ebabdcac3101241d99af15c8dfa9ba545", // Leave blank to register, or fill in if already registered
    schemaString: "bytes32 cacheId, string latitude, string longitude, uint64 timestamp, address finderAddress",
    resolverAddress: ethers.ZeroAddress, //EASSchemaRegistryAddress // Optional: Use a resolver if needed
    revocable: true, // Check-ins are typically not revocable

    // Example Data for the Attestation (IP will be fetched dynamically)
    eventId: "Acme CONFERENCE 2025", // Example event ID
    ticketId: ethers.Wallet.createRandom().address, // Simulate a unique ticket ID
    recipient: ethers.ZeroAddress, // Attest to self or event organizer
    expirationTime: 0n, // No expiration
};
// ---------------------------

/**
 * Simulates scanning a QR code and extracting geocaching data.
 * In a real application, this would involve QR code scanning and parsing.
 * @returns {object} Simulated QR code data.
 */
function simulateQRCodeScan(): { cacheId: string; latitude: string; longitude: string } {
    console.log("\nSimulating QR code scan at geocache location...");
    // Example data - replace with actual QR data parsing logic if available
    const data = {
        cacheId: ethers.id(`cache-${Math.floor(Math.random() * 1000)}`), // Generate a unique-ish cache ID
        latitude: "40.7128", // Example coordinates (New York City)
        longitude: "-74.0060"
    };
    console.log("Simulated QR Data:", data);
    return data;
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
 * Runs the full geocaching workflow:
 * 1. Ensures the geocaching schema is registered.
 * 2. Simulates scanning a QR code.
 * 3. Creates an on-chain attestation for the discovery.
 * (Optional: Extend to create/save off-chain attestations)
 */
export async function runGeocachingWorkflow(): Promise<void> {
    console.log("\n--- Starting Geocaching Workflow ---");

    try {
        const { signer } = getProviderSigner();
        const finderAddress = await signer.getAddress();
        console.log(`Finder Address (Signer): ${finderAddress}`);

        // 1. Ensure the schema is registered
        console.log("\nStep 1: Ensuring Geocaching Schema is Registered...");
        const schemaUID = await ensureSchemaRegistered(signer);

        console.log(`Using Schema UID: ${schemaUID}`);

        // 2. Simulate QR Code Scan
        console.log("\nStep 2: Simulating QR Code Scan...");
        const qrData = simulateQRCodeScan();

        // 3. Prepare and Create On-Chain Attestation
        console.log("\nStep 3: Preparing and Creating On-Chain Attestation...");
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

        const attestationData: OnChainAttestationData = {
            recipient: finderAddress, // Attest to the finder themselves
            expirationTime: 0n, // No expiration
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString,
            dataToEncode: [
                { name: "cacheId", value: qrData.cacheId, type: "bytes32" },
                { name: "latitude", value: qrData.latitude, type: "string" },
                { name: "longitude", value: qrData.longitude, type: "string" },
                { name: "timestamp", value: currentTimestamp, type: "uint64" },
                { name: "finderAddress", value: finderAddress, type: "address" },
            ],
            // refUID: ethers.ZeroHash // No reference UID for this example
        };

        console.log("\nAttestation Data to Encode:", attestationData.dataToEncode);

        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nOn-chain geocaching attestation created successfully! UID: ${newAttestationUID}`);

        // --- Optional: Extend for Off-Chain ---
        // console.log("\nStep 4: Creating and Saving Off-Chain Attestation (Optional)...");
        // const offChainData: OffChainAttestationData = { ...attestationData, time: currentTimestamp };
        // const signedOffChainAttestation = await createOffChainAttestation(signer, offChainData);
        // await saveOffChainAttestation(signedOffChainAttestation);
        // console.log(`Off-chain geocaching attestation created and saved! UID: ${signedOffChainAttestation.uid}`);
        // --- End Optional ---


        console.log("\n--- Geocaching Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- Geocaching Workflow Failed ---");
        console.error(error);
        // Consider more specific error handling based on potential failure points
    }
}

runGeocachingWorkflow()
// Example of how to run the workflow (if this file is executed directly)
// Consider moving this to an example script in src/examples/
/*
if (require.main === module) {
    runGeocachingWorkflow().catch(error => {
        console.error("Workflow failed:", error);
        process.exit(1);
    });
}
*/
