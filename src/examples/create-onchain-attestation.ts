import { getProviderSigner } from "../provider";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { prepareSchemaItem, validateAttestationData } from "../utils/eas-helpers";
import { fetchSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "attest-onchain";

async function runExampleOnChainAttestation() {
    try {

        console.log(`\nLoading full configuration from examples.yaml...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        // --- Get Config for this specific script ---
        const scriptConfigs = fullConfig[EXAMPLE_SCRIPT_NAME];
        if (!scriptConfigs || scriptConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // For this example, we use the first config entry.
        const config: BaseConfig = scriptConfigs[0];
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);
        // ------------------------------------

        // --- Script-Specific Validation ---
        if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
            console.error(`Error: Invalid or missing 'schemaUid' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        if (!config.fields || typeof config.fields !== 'object' || Object.keys(config.fields).length === 0) {
            console.error(`Error: Invalid or missing 'fields' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // --- Schema String Validation Step (using config) ---
        console.log(`\nFetching schema record for UID ${config.schemaUid} to verify schema string...`);
        const schemaRecord = await fetchSchema(config.schemaUid); // Pass validated schemaUid

        if (!schemaRecord) {
            console.error("Failed to fetch schema record. Aborting creation.");
            process.exit(1);
        }

        // Use schemaString from config if available, otherwise use the fetched one
        const schemaStringToValidate = config.schemaString ?? schemaRecord.schema;
        if (schemaRecord.schema !== schemaStringToValidate) {
            console.warn(`Warning: Schema string in config ("${config.schemaString}") does not match on-chain record ("${schemaRecord.schema}"). Using on-chain schema for validation.`);
        }
        console.log(`Using schema string for validation: "${schemaStringToValidate}"\n`);
        // -------------------------------------

        // Use the validated fields directly from the config object
        const isValid = validateAttestationData(schemaRecord.schema, config.fields);

        if (!isValid) {
            console.error("Attestation data validation failed. Aborting creation.");
            process.exit(1);
        }
        // -------------------------------------

        const dataToEncode = prepareSchemaItem(schemaRecord.schema, config.fields); // Use the validated schema string and fields from config

        const attestationData: OnChainAttestationData = {
            recipient: config.recipient!, // Default applied in loadFullConfig
            expirationTime: config.expirationTime!, // Default applied & converted in loadFullConfig
            revocable: config.revocable!, // Default applied in loadFullConfig
            schemaUID: config.schemaUid, // Validated above
            schemaString: schemaRecord.schema, // Use the validated on-chain schema string
            refUID: config.referenceUid!, // Default applied in loadFullConfig
            dataToEncode: dataToEncode,
        };

        // 3. Create the on-chain attestation
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);

        console.log(`\nExample script finished successfully. Attestation UID: ${newAttestationUID}`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleOnChainAttestation();
