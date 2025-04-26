import { getProviderSigner } from "../provider";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { ethers } from "ethers";
import { validateAttestationData } from "../utils/eas-helpers"; // Keep data validator
import { fetchSchema } from "../eas-schema"; // Keep schema fetcher
import { loadExampleConfig } from "../utils/config-helpers"; // Import the config loader

// Example script name, used to load config from examples.yaml
const EXAMPLE_SCRIPT_NAME = "create-onchain-attestation";

// Remove hardcoded configuration constants
// const exampleSchemaUID = "...";
// const exampleSchemaString = "...";
// const exampleRecipient = "...";

async function runExampleOnChainAttestation() {
    try {
        // --- Load Configuration from YAML ---
        console.log(`\nLoading configuration for "${EXAMPLE_SCRIPT_NAME}" from examples.yaml...`);
        const exampleConfigs = loadExampleConfig(EXAMPLE_SCRIPT_NAME);

        if (!exampleConfigs || exampleConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // For this example, we assume the first config entry is the one we want to use.
        // Future examples might loop through multiple configs.
        const config = exampleConfigs[0];
        console.log("Configuration loaded successfully:", config);
        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // --- Schema String Validation Step (using config) ---
        console.log(`\nFetching schema record for UID: ${config.schemaUid} to verify schema string...`);
        const schemaRecord = await fetchSchema(config.schemaUid);

        if (!schemaRecord) {
            console.error("Failed to fetch schema record. Aborting creation.");
            process.exit(1);
        }

        // Use schemaString from config if available, otherwise use the fetched one
        const schemaStringToValidate = config.schemaString ?? schemaRecord.schema;
        if (schemaRecord.schema !== schemaStringToValidate) {
            console.warn(`Warning: Schema string in config ("${config.schemaString}") does not match on-chain record ("${schemaRecord.schema}"). Using on-chain schema for validation.`);
            // Decide if this should be a hard error or just a warning
            // For now, proceed with on-chain schema but log warning.
        }
        console.log("Using schema string for validation:", schemaRecord.schema);
        // -------------------------------------

        // --- Data Validation Step (FR10 - using config) ---
        console.log("\nValidating attestation data against schema...");
        // Use the fields directly from the config object
        const isValid = validateAttestationData(schemaRecord.schema, config.fields);

        if (!isValid) {
            console.error("Attestation data validation failed. Aborting creation.");
            process.exit(1);
        }
        console.log("Data validation successful.");
        // -------------------------------------

        // 2. Prepare the on-chain attestation data from config
        // Map the fields from config.fields into the dataToEncode array format
        const dataToEncode = Object.entries(config.fields).map(([name, value]) => {
            // Attempt to infer type from the fetched schema record
            const schemaItem = new ethers.Interface([`function func(${schemaRecord.schema})`]).fragments[0].inputs.find(i => i.name === name);
            if (!schemaItem) {
                throw new Error(`Field "${name}" from config not found in schema definition: "${schemaRecord.schema}"`);
            }
            return { name, value, type: schemaItem.type };
        });

        const attestationData: OnChainAttestationData = {
            recipient: config.recipient!, // Use non-null assertion as defaults are applied
            expirationTime: config.expirationTime!, // Use non-null assertion
            revocable: config.revocable!, // Use non-null assertion
            schemaUID: config.schemaUid,
            schemaString: schemaRecord.schema, // Use the validated on-chain schema string
            refUID: config.referenceUid!, // Use non-null assertion
            dataToEncode: dataToEncode,
        };

        // 3. Create the on-chain attestation
        console.log("\nAttempting to create on-chain attestation with data:", attestationData);
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);

        console.log(`\nExample script finished successfully. Attestation UID: ${newAttestationUID}`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleOnChainAttestation();
