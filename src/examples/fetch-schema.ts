import { displaySchemaDetails } from "../utils/eas-helpers"; // Use the display helper
import { loadFetchSchemaConfig } from "../utils/config-helpers"; // Import the config loader

// Example script name
const EXAMPLE_SCRIPT_NAME = "fetch-schema";

// Remove hardcoded configuration constants
// const schemaUID = "...";

async function runExampleFetchSchema() {
    try {
        // --- Load Configuration from YAML ---
        console.log(`\nLoading configuration for "${EXAMPLE_SCRIPT_NAME}" from examples.yaml...`);
        const exampleConfigs = loadFetchSchemaConfig(); // Use the specific loader

        if (!exampleConfigs || exampleConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // Process the first config entry.
        const config = exampleConfigs[0];
        console.log("Configuration loaded successfully:", config);
        // ------------------------------------

        console.log(`\nAttempting to fetch and display schema details using displaySchemaDetails helper for UID: ${config.schemaUid}...`);

        // Use the helper function with the UID from config
        await displaySchemaDetails(config.schemaUid);

        console.log("\nSchema details displayed above (if found).");

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleFetchSchema();
