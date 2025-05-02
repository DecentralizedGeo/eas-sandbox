import { SchemaItem } from "@ethereum-attestation-service/eas-sdk";
import { getProviderSigner } from "../provider";
import { preparePrivateDataObject, prepareSchemaItem, generatePrivateDataProof } from "../utils/eas-helpers"; // Added verifyPrivateDataProof
import { fetchSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "private-data-proofs";

// Helper to convert BigInt arrays to string for JSON
const bigIntReplacer = (key: string, value: any) =>
    typeof value === 'bigint'
        ? value.toString()
        : value;

async function runPrivateDataWorkflow() {
    console.log("\n--- Starting Private Data Workflow ---");

    // --- Load Full Configuration from YAML ---
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
    const config: BaseConfig = scriptConfigs[0]; // Use the first config entry
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
    if (!config.recipient || typeof config.recipient !== 'string' || !config.recipient.startsWith('0x')) {
        console.error(`Error: Invalid or missing 'recipient' in config for ${EXAMPLE_SCRIPT_NAME}.`);
        process.exit(1);
    }
    // Define which fields to disclose later for the proof
    const fieldsToDisclose = ["timestamp", "location"]; // Example: Specify which private fields to disclose
    // const fieldsToDisclose: string[] | null = null; // Example with no fields to disclose
    // ------------------------------------

    // 1. Get Provider and Signer
    const { signer } = getProviderSigner();
    const signerAddress = await signer.getAddress();

    // 2. Fetch Original Schema String and prepare SchemaItem
    console.log(`\nFetching original schema record for UID: ${config.schemaUid}...`);
    const schemaRecord = await fetchSchema(config.schemaUid);
    if (!schemaRecord) {
        console.error("Failed to fetch schema record. Aborting.");
        process.exit(1);
    }

    // Create a SchemaItem from a set of records, matching the corresponding schemaUID 
    const originalSchemaString = schemaRecord.schema;
    let schemaItemPayload: SchemaItem[];
    try {
        schemaItemPayload = prepareSchemaItem(originalSchemaString, config.fields!);
        console.log("Validated Fields:", schemaItemPayload);
    } catch (error: any) {
        console.error(error.message);
        process.exit(1);
    }

    // 3. Create PrivateData Object
    console.log("\n--- 1. PrivateData Object Creation ---");
    let privateData = preparePrivateDataObject(schemaItemPayload);
    if (!privateData) {
        console.error("Failed to prepare PrivateData object. Aborting.");
        process.exit(1);
    }
    // 5. Calculate Merkle Root
    const merkleRoot = privateData.getFullTree().root;
    console.log(`Calculated Merkle Root: ${merkleRoot}`);

    // Optionally log leaves (hashed private data) - Be cautious in production
    console.log("PrivateData Leaves (Hashed Values):");
    console.log(privateData.getFullTree().values);

    console.log("\n--- 2. Proof Generation ---");
    const resultantProof = generatePrivateDataProof(privateData, fieldsToDisclose);
    // const resultantProof = generatePrivateDataProof(privateData);
    if (!resultantProof) {
        console.error("Failed to generate proof. Aborting.");
        process.exit(1);
    }
    const { proofObject, proofJson } = resultantProof;

    console.log("\nIf this privateData object was submitted as an attestation, you can verify it by pasting the following proof into the UI:");
    console.log(`${proofJson}`);

    console.log("\n--- Private Data Workflow Completed ---");
}

// Execute the workflow
runPrivateDataWorkflow().catch(error => {
    console.error("Workflow failed with error:", error);
    process.exit(1);
});
