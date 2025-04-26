import { getProviderSigner } from "../provider";
import { registerSchema, SchemaRegistrationData } from "../eas-schema";
import { loadRegisterSchemaConfig } from "../utils/config-helpers"; // Import the config loader

// Example script name
const EXAMPLE_SCRIPT_NAME = "register-schema";

// Remove hardcoded configuration constants
// const schemaString = "...";
// const resolverAddress = "...";
// const revocable = ...;

async function runExampleRegisterSchema() {
    try {
        // --- Load Configuration from YAML ---
        console.log(`\nLoading configuration for "${EXAMPLE_SCRIPT_NAME}" from examples.yaml...`);
        const exampleConfigs = loadRegisterSchemaConfig(); // Use the specific loader

        if (!exampleConfigs || exampleConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // For this example, process the first config entry.
        // Could be extended to register multiple schemas in a loop.
        const config = exampleConfigs[0];
        console.log("Configuration loaded successfully:", config);
        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the schema registration data from config
        const schemaData: SchemaRegistrationData = {
            schema: config.schema,
            resolverAddress: config.resolverAddress, // Already defaulted in loader
            revocable: config.revocable, // Already defaulted in loader
        };

        // 3. Register the schema
        console.log("\nAttempting to register schema...");
        const newSchemaUID = await registerSchema(signer, schemaData);

        console.log(`\nExample script finished successfully. Schema UID: ${newSchemaUID}`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleRegisterSchema();
