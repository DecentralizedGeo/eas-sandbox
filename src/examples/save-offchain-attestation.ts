import { getProviderSigner } from "../provider";
import { createOffChainAttestation, OffChainAttestationData } from "../eas-attestation"; // Needed to create the object
import { saveOffChainAttestation } from "../offchain-storage"; // Assuming this function exists
import { ethers } from "ethers";
import { validateAttestationData, prepareSchemaItem } from "../utils/eas-helpers";
import { fetchSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import new config helpers

// Example script name, used as key in examples.yaml
// Assuming a dedicated section or reusing create-offchain config
const EXAMPLE_SCRIPT_NAME = "save-offchain-attestation";

async function runExampleSaveOffChainAttestation() {
    try {
        // --- Load Full Configuration from YAML ---
        console.log(`\nLoading full configuration from examples.yaml...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        // --- Get Config for this specific script ---
        // It might reuse the config from 'create-offchain-attestation' or have its own section
        let scriptConfigs = fullConfig[EXAMPLE_SCRIPT_NAME];
        if (!scriptConfigs || scriptConfigs.length === 0) {
            console.warn(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found. Trying "create-offchain-attestation"...`);
            scriptConfigs = fullConfig["create-offchain-attestation"]; // Fallback
            if (!scriptConfigs || scriptConfigs.length === 0) {
                console.error(`Configuration for both "${EXAMPLE_SCRIPT_NAME}" and "create-offchain-attestation" not found or empty.`);
                process.exit(1);
            }
        }

        // For this example, we use the first config entry.
        const config: BaseConfig = scriptConfigs[0];
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);
        // ------------------------------------

        // --- Script-Specific Validation (same as create-offchain) ---
        if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
            console.error(`Error: Invalid or missing 'schemaUid' in config.`);
            process.exit(1);
        }
        if (!config.fields || typeof config.fields !== 'object' || Object.keys(config.fields).length === 0) {
            console.error(`Error: Invalid or missing 'fields' in config.`);
            process.exit(1);
        }
        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Fetch Schema for validation and data preparation
        console.log(`\nFetching schema record for UID: ${config.schemaUid}...`);
        const schemaRecord = await fetchSchema(config.schemaUid);
        if (!schemaRecord) {
            console.error("Failed to fetch schema record. Aborting.");
            process.exit(1);
        }
        console.log("Using schema string for validation:", schemaRecord.schema);

        // 3. Validate Data
        console.log("\nValidating attestation data against schema...");
        const isValid = validateAttestationData(schemaRecord.schema, config.fields);
        if (!isValid) {
            console.error("Attestation data validation failed. Aborting.");
            process.exit(1);
        }
        console.log("Data validation successful.");

        // 4. Prepare Attestation Data (same as create-offchain)
        const dataToEncode = prepareSchemaItem(schemaRecord.schema, config.fields!);

        const attestationData: OffChainAttestationData = {
            recipient: config.recipient!,
            expirationTime: config.expirationTime!,
            revocable: config.revocable!,
            schemaUID: config.schemaUid,
            schemaString: schemaRecord.schema,
            refUID: config.referenceUid!,
            time: BigInt(Math.floor(Date.now() / 1000)),
            dataToEncode: dataToEncode,
        };

        // 5. Create and sign the off-chain attestation object
        console.log("\nCreating and signing off-chain attestation object...");
        const signedOffChainAttestation = await createOffChainAttestation(signer, attestationData);
        console.log("Signed attestation object created.");

        // 6. Save the signed attestation
        console.log("\nAttempting to save signed off-chain attestation...");
        // Assuming saveOffChainAttestation takes the signed object and maybe a filename/key
        // Modify the call based on the actual function signature in offchain-storage.ts
        await saveOffChainAttestation(signedOffChainAttestation); // Adjust parameters as needed

        console.log(`\nExample script ${EXAMPLE_SCRIPT_NAME} finished successfully.`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleSaveOffChainAttestation();