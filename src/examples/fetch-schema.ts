import { fetchSchema, checkExistingSchema } from "../eas-schema";
import { displaySchemaDetails } from "../utils/eas-helpers";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Specify the section name that you want to use in the examples.yaml file
const EXAMPLE_SCRIPT_NAME = "fetch-schema";


async function runExampleFetchSchema() {
    try {
        // --- Load Full Configuration from YAML ---
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

        // For this example, process the first config entry.
        const config: BaseConfig = scriptConfigs[0];
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);
        // ------------------------------------

        if (!config.schemaUid && !config.schemaString) {
            console.error(`Error: Neither 'schemaUid' nor 'schemaString' provided in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        if (config.schemaUid) {
            console.log(`\nAttempting to fetch schema with UID: ${config.schemaUid}`);
            const schemaRecord = await fetchSchema(config.schemaUid);
            if (schemaRecord) {
                console.log("\nSchema fetched successfully:");
                displaySchemaDetails(schemaRecord.uid);
            } else {
                console.log(`\nSchema with UID ${config.schemaUid} could not be fetched or was not found.`);
            }
        } else if (config.schemaString) {
            console.log(`\nIdentifying what the schema UID is for "${config.schemaString}"`);
            checkExistingSchema(config.schemaString);

        }
        console.log(`\nExample script ${EXAMPLE_SCRIPT_NAME} finished.`);

    } catch (error) {
        process.exit(1);
    }
}

runExampleFetchSchema();
