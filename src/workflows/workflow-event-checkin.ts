import { getProviderSigner } from "../provider";
import { EASSchemaRegistryAddress } from "../config";
import { registerSchema, fetchSchema, SchemaRegistrationData, SchemaRecord, checkExistingSchema } from "../eas-schema";
import { createOnChainAttestation, OnChainAttestationData, getAttestation } from "../eas-attestation";
import { ethers } from "ethers";
import { publicIpv4 } from 'public-ip'; // Import library to get public IP
import geoip from 'geoip-lite'; // Import library for IP geolocation
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Added import
import { validateAttestationData, prepareSchemaItem } from "../utils/eas-helpers"; // Added imports

// --- Script Name for Configuration ---
const EXAMPLE_SCRIPT_NAME = "event-checkin-workflow"; // Added script name

/**
 * Ensures the required schema exists, registering it if necessary.
 * @param signer - Ethers signer instance.
 * @param config - The configuration object for this workflow.
 * @returns {Promise<string>} The UID of the schema.
 */
async function ensureSchemaRegistered(signer: ethers.Signer, config: BaseConfig): Promise<string> { // Added config parameter
    let schemaUID = config.schemaUid;

    if (schemaUID) {
        console.log(`Schema UID provided: ${schemaUID}. Verifying existence...`);
        const schemaRecord = await fetchSchema(schemaUID);
        if (schemaRecord && schemaRecord.schema === config.schemaString) {
            console.log("Schema found and matches configuration.");
            return schemaUID;
        } else {
            console.warn("Provided schema UID not found or schema string mismatch. Attempting to register new schema.");
        }
    }

    // If schemaUID is not provided or does not match, register a new schema. But let's check if
    // the schema is already registered by calculating the UID and checking the SchemaRegistry.
    const existingSchemaUID = await checkExistingSchema(config.schemaString!, config.resolverAddress!, config.revocable!); // Used config
    if (existingSchemaUID) {
        console.log(`Found existing schema with UID: ${existingSchemaUID}. Using this schema.`);
        return existingSchemaUID; // Return the existing UID if found
    }

    console.log(`Schema UID not provided or invalid. Registering new schema: "${config.schemaString}"`);
    const schemaData: SchemaRegistrationData = {
        schema: config.schemaString!, // Used config
        resolverAddress: config.resolverAddress!, // Used config
        revocable: config.revocable!, // Used config
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
        // 0. Load Configuration
        console.log(`\nLoading full configuration from examples.yaml...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        const scriptConfigs = fullConfig[EXAMPLE_SCRIPT_NAME];
        if (!scriptConfigs || scriptConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }
        const config: BaseConfig = scriptConfigs[0]; // Using the first config entry
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);

        // Validate required fields from config
        if (!config.fields || typeof config.fields !== 'object') {
            console.error(`Error: 'fields' object is missing or invalid in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        if (typeof config.fields.eventId !== 'string' || !config.fields.eventId) {
            console.error(`Error: 'eventId' is missing or invalid in config.fields for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        if (!config.schemaString) {
            console.error(`Error: 'schemaString' is missing in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        // 1. Initialize provider and signer
        const { signer } = getProviderSigner();
        console.log(`Using signer: ${signer.address}`);

        // 2. Ensure the schema is registered (FR4, FR10)
        const schemaUID = await ensureSchemaRegistered(signer, config); // Pass config

        // 3. Get Public IP and Geolocation
        let ipAddress = "";
        let locationData = null;
        let runtimeGeoJsonLocationString = "{}"; // Default empty GeoJSON object
        try {
            ipAddress = await publicIpv4();
            console.log(`Fetched public IP address: ${ipAddress}`);
            locationData = geoip.lookup(ipAddress);
            if (locationData && locationData.ll) {
                console.log(`Geolocation lookup successful: Lat=${locationData.ll[0]}, Lon=${locationData.ll[1]}`);
                const geoJsonPoint = {
                    type: "Point",
                    coordinates: [locationData.ll[1], locationData.ll[0]]
                };
                runtimeGeoJsonLocationString = JSON.stringify(geoJsonPoint);
            } else {
                console.warn("Could not determine geolocation from IP address.");
            }
        } catch (error) {
            console.warn(`Error fetching public IP or geolocation: ${error}. Using default values.`);
            ipAddress = "0.0.0.0"; // Fallback IP
        }

        // 4. Prepare Attestation Payload by merging config fields with runtime values
        const attestationValues: Record<string, any> = { ...config.fields };

        // Determine ticketId: use from config if provided, otherwise generate a new one
        const finalTicketId = (typeof config.fields.ticketId === 'string' && config.fields.ticketId)
            ? config.fields.ticketId
            : ethers.Wallet.createRandom().address;

        attestationValues.ticketId = finalTicketId;
        attestationValues.timestamp = BigInt(Math.floor(Date.now() / 1000));
        attestationValues.location = runtimeGeoJsonLocationString;
        // eventId is already set from config.fields

        console.log("\nFinal attestation values to be encoded:", attestationValues);

        // 5. Validate the complete attestation payload against the schema string from config
        const isValid = validateAttestationData(config.schemaString, attestationValues);
        if (!isValid) {
            console.error("Attestation data validation failed against schema string. Aborting creation.");
            process.exit(1);
        }

        // 6. Prepare dataToEncode using the validated schema string and final attestation values
        const dataToEncode = prepareSchemaItem(config.schemaString, attestationValues);

        // 7. Prepare OnChainAttestationData object
        const attestationData: OnChainAttestationData = {
            recipient: config.recipient!,
            expirationTime: config.expirationTime!,
            revocable: config.revocable!,
            schemaUID: schemaUID, // From ensureSchemaRegistered
            schemaString: config.schemaString!, // Schema string from config
            refUID: config.referenceUid!, // Default applied in loadFullConfig if not in YAML
            dataToEncode: dataToEncode, // From prepareSchemaItem
        };

        console.log("\nPrepared OnChainAttestationData object:", attestationData);

        // 8. Create the On-Chain Attestation (FR6)
        console.log("\nCreating on-chain attestation for event check-in...");
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`\nAttestation created successfully! UID: ${newAttestationUID}`);
        console.log(`View attestation: https://sepolia.easscan.org/attestation/view/${newAttestationUID}`);

        // 9. Optional: Retrieve the attestation to verify (FR6)
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
