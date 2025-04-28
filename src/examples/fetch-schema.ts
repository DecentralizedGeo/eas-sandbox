import { fetchSchema } from "../eas-schema";
import { displaySchemaDetails } from "../utils/eas-helpers"; // Use the display helper
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import loadFullConfig and BaseConfig

// Example script name
const EXAMPLE_SCRIPT_NAME = "fetch-schema";

// Remove hardcoded configuration constants (already done)

async function runExampleFetchSchema() {
    try {
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

        // For this example, process the first config entry.
        const config: BaseConfig = scriptConfigs[0];
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);
        // ------------------------------------

        // --- Script-Specific Validation ---
        if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
            console.error(`Error: Invalid or missing 'schemaUid' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        // ------------------------------------

        // 1. Fetch the schema using the UID from the config
        console.log(`\nAttempting to fetch schema with UID: ${config.schemaUid}...`);
        const schemaRecord = await fetchSchema(config.schemaUid); // Pass validated schemaUid

        if (schemaRecord) {
            console.log("\nSchema fetched successfully:");
            console.log(schemaRecord);
        } else {
            console.log(`\nSchema with UID ${config.schemaUid} could not be fetched or was not found.`);
        }

        console.log(`\nExample script ${EXAMPLE_SCRIPT_NAME} finished.`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleFetchSchema();
