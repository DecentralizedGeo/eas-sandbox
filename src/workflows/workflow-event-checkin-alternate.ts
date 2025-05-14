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
const SECTION_NAME = "event-checkin-workflow-alternate"; // Changed script name

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
            // console.log("Schema found and matches configuration.");
            return schemaUID;
        } else {
            console.warn("Provided schema UID not found or schema string mismatch. Attempting to register new schema.");
        }
    }

    // If schemaUID is not provided or does not match, register a new schema. But let's check if
    // the schema is already registered by calculating the UID and checking the SchemaRegistry.
    const existingSchemaUID = await checkExistingSchema(config.schemaString!, config.resolverAddress!, config.revocable!); // Used config
    if (existingSchemaUID) {
        // console.log(`Found existing schema with UID: ${existingSchemaUID}. Using this schema.`);
        return existingSchemaUID; // Return the existing UID if found
    }

    console.log(`Schema UID not provided or invalid. Registering new schema: "${config.schemaString}"`);
    const schemaData: SchemaRegistrationData = {
        schema: config.schemaString!, // Used config
        resolverAddress: config.resolverAddress!, // Used config
        revocable: config.revocable!, // Used config
    };

    schemaUID = await registerSchema(signer, schemaData);
    // console.log(`Schema registered with new UID: ${schemaUID}`);
    return schemaUID;
}


/**
 * Main function for the  Event Check-In workflow.
 */
async function runEventCheckinAlternateWorkflow() { // Renamed function
    console.log("\n--- Starting  Event Check-In Workflow ---");

    try {
        // 0. Load Configuration
        console.log(`\nLoading full configuration from examples.yaml for "${SECTION_NAME}"...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        const scriptConfigs = fullConfig[SECTION_NAME];
        if (!scriptConfigs || scriptConfigs.length === 0) {
            console.error(`Configuration for "${SECTION_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        interface AttestationBatchConfig {
            attestations: BaseConfig[];
        }
        const batchConfig = scriptConfigs[0] as AttestationBatchConfig; // Assuming the first entry contains the batch

        if (!batchConfig || !Array.isArray(batchConfig.attestations) || batchConfig.attestations.length !== 2) {
            console.error(`Error: Configuration for "${SECTION_NAME}" must contain an 'attestations' array with exactly two attestation configurations.`);
            process.exit(1);
        }

        const ticketPurchaseConfig = batchConfig.attestations[0];
        const eventCheckinConfig = batchConfig.attestations[1];

        // console.log("\nUsing configuration for Ticket Purchase:", ticketPurchaseConfig);
        // console.log("Using configuration for Event Check-in:", eventCheckinConfig);


        // 1. Initialize provider and signer
        const { signer } = getProviderSigner();
        console.log(`\nUsing signer: ${signer.address}`);

        // -------------------------------------------------------------------------------------------------------------
        // --- Process Attestation 1: Ticket Purchase ---
        // -------------------------------------------------------------------------------------------------------------

        console.log("\n--- Processing Ticket Purchase Attestation ---");

        if (!ticketPurchaseConfig.schemaString || !ticketPurchaseConfig.fields) {
            console.error("Error: Ticket purchase config is missing schemaUid, schemaString, or fields.");
            process.exit(1);
        }

        const ticketSchemaUID = await ensureSchemaRegistered(signer, ticketPurchaseConfig);

        // Prepare ticket attestation data
        const ticketAttestationValues: Record<string, any> = { ...ticketPurchaseConfig.fields };
        // Add any specific runtime values for ticket if needed, e.g., a generated ticketId if not in fields
        if (ticketPurchaseConfig.fields.ticketId === undefined) {
            // Example: if schema expects a ticketId and it's not in config, generate one
            ticketAttestationValues.ticketId = ethers.Wallet.createRandom().address;
        }
        console.log("\nFinal ticket attestation values to be encoded:", ticketAttestationValues);


        if (!validateAttestationData(ticketPurchaseConfig.schemaString!, ticketAttestationValues)) {
            console.error("Ticket attestation data validation failed. Aborting.");
            process.exit(1);
        }
        const ticketDataToEncode = prepareSchemaItem(ticketPurchaseConfig.schemaString!, ticketAttestationValues);

        const ticketApiPayload: OnChainAttestationData = {
            recipient: ticketPurchaseConfig.recipient!,
            expirationTime: ticketPurchaseConfig.expirationTime!,
            revocable: ticketPurchaseConfig.revocable!,
            schemaUID: ticketSchemaUID,
            schemaString: ticketPurchaseConfig.schemaString!,
            refUID: ticketPurchaseConfig.referenceUid!, // Usually ZeroHash for the first attestation
            dataToEncode: ticketDataToEncode,
        };

        console.log("\nCreating on-chain attestation for ticket purchase...");
        const ticketAttestationUID = await createOnChainAttestation(signer, ticketApiPayload);
        console.log(`\nTicket Purchase Attestation created successfully! UID: ${ticketAttestationUID}`);
        // console.log(`View Ticket Attestation: https://sepolia.easscan.org/attestation/view/${ticketAttestationUID}`);

        console.log("\nUser is now heading to the event venue for check-in...");
        // Simulate a delay for the user to arrive at the event venue and print a `...` for each second for visual effect
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            process.stdout.write("...");
        }
        // Simulate a delay for the user to arrive at the event venue and print a `...` for each second for visual effect
        console.log("\nUser has now arrived and is in line to check-in.");
        // Simulate a delay for the user to arrive at the event venue and print a `...` for each second for visual effect
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            process.stdout.write("...");
        }
        console.log("\nTicket is ready to be scanned...");

        // -------------------------------------------------------------------------------------------------------------
        // --- Process Attestation 2: Event Check-in (references Ticket Purchase) ---
        // -------------------------------------------------------------------------------------------------------------
        console.log("\n--- Processing Event Check-in Attestation ---");

        if (!eventCheckinConfig.schemaString || !eventCheckinConfig.fields) {
            console.error("Error: Event check-in config is missing schemaUid, schemaString, or fields.");
            process.exit(1);
        }

        const checkinSchemaUID = await ensureSchemaRegistered(signer, eventCheckinConfig);

        // Get Public IP and Geolocation for check-in
        let runtimeGeoJsonLocationString = "{}"; // Default empty GeoJSON object
        try {
            const ipAddress = await publicIpv4();
            console.log(`Fetched public IP address for check-in: ${ipAddress}`);
            const locationData = geoip.lookup(ipAddress);
            if (locationData && locationData.ll) {
                console.log(`Geolocation lookup successful: Lat=${locationData.ll[0]}, Lon=${locationData.ll[1]}`);
                const geoJsonPoint = { type: "Point", coordinates: [locationData.ll[1], locationData.ll[0]] };
                runtimeGeoJsonLocationString = JSON.stringify(geoJsonPoint);
            } else {
                console.warn("Could not determine geolocation from IP address for check-in.");
            }
        } catch (error) {
            console.warn(`Error fetching public IP or geolocation for check-in: ${error}. Using default GeoJSON.`);
        }

        // Prepare check-in attestation data
        const checkinAttestationValues: Record<string, any> = { ...eventCheckinConfig.fields };
        // checkinAttestationValues.timestamp = BigInt(Math.floor(Date.now() / 1000));
        checkinAttestationValues.location = runtimeGeoJsonLocationString; // Assuming schema uses 'geoJson'
        // If the check-in schema expects the ticket UID as a field:
        // checkinAttestationValues.originalTicketUID = ticketAttestationUID;


        // console.log("\nFinal check-in attestation values to be encoded:", checkinAttestationValues);

        if (!validateAttestationData(eventCheckinConfig.schemaString!, checkinAttestationValues)) {
            console.error("Check-in attestation data validation failed. Aborting.");
            process.exit(1);
        }
        const checkinDataToEncode = prepareSchemaItem(eventCheckinConfig.schemaString!, checkinAttestationValues);

        const checkinApiPayload: OnChainAttestationData = {
            recipient: eventCheckinConfig.recipient!,
            expirationTime: eventCheckinConfig.expirationTime!,
            revocable: eventCheckinConfig.revocable!,
            schemaUID: checkinSchemaUID,
            schemaString: eventCheckinConfig.schemaString!,
            refUID: ticketAttestationUID, // Crucial: Reference the ticket purchase attestation
            dataToEncode: checkinDataToEncode,
        };

        console.log("\nCreating on-chain attestation for event check-in...");
        const checkinAttestationUID = await createOnChainAttestation(signer, checkinApiPayload);
        console.log(`\nEvent Check-in Attestation created successfully! UID: ${checkinAttestationUID}`);

        // // Optional: Retrieve and verify attestations
        // console.log("\nRetrieving created ticket attestation for verification...");
        // const fetchedTicketAttestation = await getAttestation(ticketAttestationUID);
        // if (fetchedTicketAttestation) console.log("Successfully fetched ticket attestation.");

        // console.log("\nRetrieving created check-in attestation for verification...");
        // const fetchedCheckinAttestation = await getAttestation(checkinAttestationUID);
        // if (fetchedCheckinAttestation) {
        //     console.log("Successfully fetched check-in attestation.");
        //     if (fetchedCheckinAttestation.refUID === ticketAttestationUID) {
        //         console.log("Check-in attestation correctly references the ticket attestation.");
        //     } else {
        //         console.warn("Warning: Check-in attestation refUID does not match ticket attestation UID.");
        //     }
        // }

        console.log("\n---  Event Check-In Workflow Completed Successfully ---");

    } catch (error) {
        console.error("\n---  Event Check-In Workflow Failed ---");
        console.error(error);
        process.exit(1);
    }
}

runEventCheckinAlternateWorkflow(); // Renamed function call
