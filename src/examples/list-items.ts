import { listAttestationsForAddress, listSchemasForAddress, listReferencingAttestations } from "../utils/eas-helpers";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";


// Example script name
const EXAMPLE_SCRIPT_NAME = "list-items";

const exampleLimit = 5; // Optional: Limit the number of results per query

async function main() {
    console.log("--- Running Listing Examples ---");

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

    // Example 1: List attestations for the address (attester or recipient)
    await listAttestationsForAddress(config.recipient!, 'either', exampleLimit);

    // Example 2: List schemas created by the address
    await listSchemasForAddress(config.recipient!, exampleLimit);

    // Example 3: List attestations referencing the specific UID
    await listReferencingAttestations(config.referenceUid!, exampleLimit);

    console.log("\n--- Listing Examples Complete ---");
}

main().catch((error) => {
    console.error("Error running listing examples:", error);
    process.exit(1);
});