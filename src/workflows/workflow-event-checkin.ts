import { getProviderSigner } from "../provider";
import { EASSchemaRegistryAddress } from "../config";
import { registerSchema, fetchSchema, SchemaRegistrationData, SchemaRecord, checkExistingSchema } from "../eas-schema";
import { createOnChainAttestation, OnChainAttestationData, getAttestation } from "../eas-attestation";
import { ethers } from "ethers";
import { publicIpv4 } from 'public-ip'; // Import library to get public IP
import geoip from 'geoip-lite'; // Import library for IP geolocation

// --- Workflow Configuration ---
const WORKFLOW_CONFIG = {
    // Define the schema for event check-in with GeoJSON location
    schemaName: "EventCheckInGeoIPLocation",
    schemaUID: "", // Leave blank to register, or fill in if already registered
    // schemaUID: "0x74bfb50ce021fc8ec599d1b96b3bfd1ebabdcac3101241d99af15c8dfa9ba545", // Leave blank to register, or fill in if already registered
    schemaString: "string eventId, string ticketId, uint64 timestamp, string geoJson",
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
 * Main function for the Event Check-In workflow.
 */
async function runEventCheckInWorkflow() {
    console.log("\n--- Starting Event Check-In Workflow ---");

    try {
        // 1. Initialize provider and signer
        const { signer } = getProviderSigner();
        console.log(`Using signer: ${signer.address}`);

        // 2. Ensure the schema is registered (FR4, FR10)
        const schemaUID = await ensureSchemaRegistered(signer);

        // 3. Get Public IP and Geolocation
        let ipAddress = "";
        let locationData = null;
        let geoJsonLocationString = "{}"; // Default empty GeoJSON object
        try {
            ipAddress = await publicIpv4();
            console.log(`Fetched public IP address: ${ipAddress}`);
            locationData = geoip.lookup(ipAddress);
            if (locationData && locationData.ll) {
                console.log(`Geolocation lookup successful: Lat=${locationData.ll[0]}, Lon=${locationData.ll[1]}`);
                // Create GeoJSON Point string
                const geoJsonPoint = {
                    type: "Point",
                    coordinates: [locationData.ll[1], locationData.ll[0]] // GeoJSON uses [longitude, latitude]
                };
                geoJsonLocationString = JSON.stringify(geoJsonPoint);
            } else {
                console.warn("Could not determine geolocation from IP address.");
            }
        } catch (error) {
            console.warn(`Error fetching public IP or geolocation: ${error}. Using default values.`);
            ipAddress = "0.0.0.0"; // Fallback IP
        }

        // 4. Prepare Attestation Data (FR2)
        const timestamp = BigInt(Math.floor(Date.now() / 1000));
        const attestationData: OnChainAttestationData = {
            recipient: WORKFLOW_CONFIG.recipient,
            expirationTime: WORKFLOW_CONFIG.expirationTime,
            revocable: WORKFLOW_CONFIG.revocable,
            schemaUID: schemaUID,
            schemaString: WORKFLOW_CONFIG.schemaString, // Needed for encoding
            dataToEncode: [
                { name: "eventId", value: WORKFLOW_CONFIG.eventId, type: "string" },
                { name: "ticketId", value: WORKFLOW_CONFIG.ticketId, type: "string" },
                { name: "timestamp", value: timestamp, type: "uint64" },
                { name: "geoJson", value: geoJsonLocationString, type: "string" }, // Add GeoJSON string
            ],
        };
        console.log("\nPrepared attestation data:", {
            eventId: WORKFLOW_CONFIG.eventId,
            ticketId: WORKFLOW_CONFIG.ticketId,
            timestamp: timestamp.toString(),
            geoJson: geoJsonLocationString,
        });

        // 5. Create the On-Chain Attestation (FR6)
        console.log("\nCreating on-chain attestation for event check-in...");
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nAttestation created successfully! UID: ${newAttestationUID}`);
        console.log(`View attestation: https://sepolia.easscan.org/attestation/view/${newAttestationUID}`);

        // 6. Optional: Retrieve the attestation to verify (FR6)
        console.log("\nRetrieving created attestation for verification...");
        const fetchedAttestation = await getAttestation(newAttestationUID);
        if (fetchedAttestation) {
            console.log("Successfully fetched and verified attestation details.");
        } else {
            console.warn("Could not fetch the newly created attestation immediately.");
        }

        console.log("\n--- Event Check-In Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n--- Event Check-In Workflow Failed ---");
        console.error(error);
        process.exit(1);
    }
}

runEventCheckInWorkflow();
