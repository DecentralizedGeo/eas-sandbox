// src/workflows/workflow-geocaching.ts
import { ethers, Signer } from "ethers";
import { getProviderSigner } from "../provider";
import { ensureSchemaRegistered } from "./workflow-utils"; // Assuming a utility function
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
// Import createOffChainAttestation and saveOffChainAttestation if needed later
// import { createOffChainAttestation, OffChainAttestationData } from "../eas-attestation";
// import { saveOffChainAttestation } from "../offchain-storage";

// --- Geocaching Schema ---
// Defines the structure for a geocaching discovery attestation.
const GEOCACHING_SCHEMA_STRING = "bytes32 cacheId, string latitude, string longitude, uint64 timestamp, address finderAddress";
const GEOCACHING_SCHEMA_RESOLVER_ADDRESS = undefined; // No resolver for this example
const GEOCACHING_SCHEMA_REVOCABLE = true; // Discoveries can be revoked if needed

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
        const schemaUID = await ensureSchemaRegistered(
            signer,
            GEOCACHING_SCHEMA_STRING,
            GEOCACHING_SCHEMA_RESOLVER_ADDRESS,
            GEOCACHING_SCHEMA_REVOCABLE
        );
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
            revocable: GEOCACHING_SCHEMA_REVOCABLE,
            schemaUID: schemaUID,
            schemaString: GEOCACHING_SCHEMA_STRING,
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


// src/workflows/workflow-geocaching.ts
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { config } from "../config";
import { provider, signer } from "../provider";
import { registerSchema, checkExistingSchema, fetchSchema } from "../eas-schema";
import { createOnchainAttestation, getAttestation } from "../eas-attestation";

// Define the schema for the geocaching attestation
// Includes cache ID, finder's address, coordinates, and timestamp
const geocachingSchemaString = "bytes32 cacheId, address finder, uint64 latitude, uint64 longitude, uint64 timestamp";
const schemaName = "Geocaching Discovery"; // Optional: Name for clarity

// Simulate QR code data (replace with actual QR decoding logic if needed)
// Coordinates are multiplied by 1e6 for precision as uint64
const qrCodeData = JSON.stringify({
    cacheId: ethers.id("unique-cache-identifier-123"), // Example cache ID
    latitude: 40.7128 * 1e6, // Example latitude (New York City)
    longitude: -74.0060 * 1e6, // Example longitude (New York City)
});

/**
 * Workflow for attesting a geocaching discovery based on simulated QR code data.
 * 1. Defines or retrieves the geocaching schema.
 * 2. Parses simulated QR code data.
 * 3. Creates an on-chain attestation for the discovery.
 */
async function runGeocachingWorkflow() {
    console.log("--- Starting Geocaching Workflow ---");

    try {
        const eas = new EAS(config.easContractAddress);
        eas.connect(signer);

        // 1. Get or Register the Schema
        console.log(`Checking/Registering schema: "${schemaName}"...`);
        let schemaRecord = await checkExistingSchema(schemaName, geocachingSchemaString);
        if (!schemaRecord) {
            console.log("Schema not found, registering new schema...");
            const newSchemaUID = await registerSchema(geocachingSchemaString, true, schemaName); // Make schema revocable
            if (!newSchemaUID) {
                throw new Error("Failed to register the geocaching schema.");
            }
            // schemaRecord = await getSchemaRecord(schemaName, geocachingSchemaString, newSchemaUID);
            // if (!schemaRecord) {
            //     // This should not happen if registration succeeded
            //     throw new Error("Failed to retrieve schema record after registration.");
            // }
            // console.log(`Schema registered with UID: ${schemaRecord.uid}`);
        } else {
            console.log(`Using existing schema with UID: ${schemaRecord}`);
        }

        const schemaUID = schemaRecord;

        // 2. Parse QR Code Data and Prepare Attestation Data
        console.log("Parsing QR code data...");
        const parsedData = JSON.parse(qrCodeData);
        const finderAddress = await signer.getAddress();
        const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp

        const schemaEncoder = new SchemaEncoder(geocachingSchemaString);
        const encodedData = schemaEncoder.encodeData([
            { name: "cacheId", value: parsedData.cacheId, type: "bytes32" },
            { name: "finder", value: finderAddress, type: "address" },
            { name: "latitude", value: BigInt(parsedData.latitude), type: "uint64" },
            { name: "longitude", value: BigInt(parsedData.longitude), type: "uint64" },
            { name: "timestamp", value: BigInt(timestamp), type: "uint64" },
        ]);

        console.log("Encoded Attestation Data:", encodedData);

        // 3. Create On-chain Attestation
        console.log("Creating on-chain attestation...");
        const attestationUID = await createOnchainAttestation(
            schemaUID,
            ethers.ZeroAddress, // No specific recipient needed for this type of attestation
            true, // Revocable
            encodedData
        );

        if (!attestationUID) {
            throw new Error("Failed to create the geocaching attestation.");
        }

        console.log(`Geocaching attestation created successfully! UID: ${attestationUID}`);

        // 4. (Optional) Verify by retrieving the attestation
        console.log("Verifying attestation by retrieving it...");
        const retrievedAttestation = await getAttestation(attestationUID);
        if (retrievedAttestation) {
            console.log("Attestation retrieved successfully:");
            console.log(retrievedAttestation);

            // Decode and display data for better readability
            const decodedData = schemaEncoder.decodeData(retrievedAttestation.data);
            console.log("Decoded Attestation Data:");
            decodedData.forEach(item => {
                // Convert BigInts back for display if needed
                let value = item.value.value;
                if (item.type === 'uint64' && typeof value === 'bigint') {
                    if (item.name === 'latitude' || item.name === 'longitude') {
                        value = Number(value) / 1e6; // Convert back from fixed-point
                    } else {
                        value = value.toString();
                    }
                }
                console.log(`  ${item.name} (${item.type}): ${value}`);
            });

        } else {
            console.warn("Could not retrieve the created attestation for verification.");
        }

    } catch (error) {
        console.error("Geocaching workflow failed:", error);
    } finally {
        console.log("--- Geocaching Workflow Finished ---");
    }
}

// Run the workflow
runGeocachingWorkflow();

// Export for potential use elsewhere if needed
export { runGeocachingWorkflow };
