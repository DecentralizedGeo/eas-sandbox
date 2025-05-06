import { preparePrivateDataObject, prepareSchemaItem, generatePrivateDataProof } from "../utils/eas-helpers"; // Added verifyPrivateDataProof
import { fetchSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "create-private-data-object";


// Example Usage (can be removed or adapted)
async function examplePrivateAttestationFlow() {

    console.log("\n--- Create Private data object ---");

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
    // if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
    //     console.error(`Error: Invalid or missing 'schemaUid' in config for ${EXAMPLE_SCRIPT_NAME}.`);
    //     process.exit(1);
    // }
    if (!config.fields || typeof config.fields !== 'object' || Object.keys(config.fields).length === 0) {
        console.error(`Error: Invalid or missing 'fields' in config for ${EXAMPLE_SCRIPT_NAME}.`);
        process.exit(1);
    }

    // check if config.schemaString or config.schemaUid is provided
    if (!config.schemaUid && !config.schemaString) {
        console.error(`Error: Neither 'schemaUid' nor 'schemaString' provided in config for ${EXAMPLE_SCRIPT_NAME}.`);
        process.exit(1);
    }

    if (!config.schemaString && config.schemaUid) {
        console.log(`\nLooks like the schema string is missing but the schema UID is provided.`);
        console.log(`Fetching schema string for UID: ${config.schemaUid}...`);
        const schemaRecord = await fetchSchema(config.schemaUid); // Pass validated schemaUid
        if (!schemaRecord) {
            console.error("Failed to fetch schema record. Aborting creation.");
            process.exit(1);
        }

        // now we'll need to validate the config.fields against the schemaString that we just fetched
        const schemaItem = prepareSchemaItem(schemaRecord.schema, config.fields);
        if (!schemaItem) {
            console.error(`Failed to validate the fields set in config against the schema ${schemaRecord.schema}.`);
            process.exit(1);
        }
        config.schemaString = schemaRecord.schema; // Set the schemaString in the config
    }

    const exampleSchemaItem = prepareSchemaItem(config.schemaString!, config.fields)

    const privateDataInstance = preparePrivateDataObject(exampleSchemaItem);

    if (privateDataInstance) {
        console.log("Private data root hash :", privateDataInstance.getFullTree().root);
        console.log("PrivateData Leaves (Hashed Values):");
        console.log(privateDataInstance.getFullTree().values);
    } else {
        console.log("Failed to create PrivateData object.");
    }
}

examplePrivateAttestationFlow();
