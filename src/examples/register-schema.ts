import { getProviderSigner } from "../provider";
import { registerSchema, SchemaRegistrationData } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import loadFullConfig and BaseConfig

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "register-schema";

// Remove hardcoded configuration constants (already done)

async function runExampleRegisterSchema() {
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
        if (!config.schemaString || typeof config.schemaString !== 'string') {
            console.error(`Error: Invalid or missing 'schema' string in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }
        // Note: 'revocable' and 'resolverAddress' have defaults applied by loadFullConfig
        // ------------------------------------


        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the schema registration data from config
        const schemaData: SchemaRegistrationData = {
            schema: config.schemaString, // Validated above
            resolverAddress: config.resolverAddress!, // Default applied in loadFullConfig
            revocable: config.revocable!, // Default applied in loadFullConfig
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
