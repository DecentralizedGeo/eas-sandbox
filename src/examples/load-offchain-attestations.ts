import { loadOffChainAttestations, OffChainAttestationQuery } from "../offchain-storage";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "load-offchain-attestation";


async function runExampleLoadOffChain() {
    try {

        // --- Load Full Configuration from YAML ---
        console.log(`\nLoading full configuration from examples.yaml...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        // --- Get Config for this specific script ---
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

        // Since we can query offchain attestations based on the schemaUid, recipient, attestation UID or reference UID,
        // we'll need to check the config for these values and set them in the query object.
        const queryAttestationUid = config.attestationUid ? config.attestationUid : null;
        const querySchemaUid = config.schemaUid ? config.schemaUid : null;
        const queryRecipient = config.recipient ? config.recipient : null;
        const queryRefUid = config.referenceUid ? config.referenceUid : null;

        // Setting the query object based on the config values
        let query: OffChainAttestationQuery = {};

        if (queryAttestationUid) {
            query.uid = queryAttestationUid;
        }
        if (querySchemaUid) {
            query.schema = querySchemaUid;
        }
        if (queryRecipient) {
            query.recipient = queryRecipient;
        }
        if (queryRefUid) {
            query.referenceUid = queryRefUid;
        }

        // 1. Load attestations (optionally applying the filter)
        console.log("\nAttempting to load off-chain attestations...");
        const loadedAttestations = await loadOffChainAttestations(query);

        // 2. Display the results
        if (loadedAttestations.length === 0) {
            console.log("\nNo matching off-chain attestations found in storage.");
        } else {
            console.log(`\nFound ${loadedAttestations.length} matching off-chain attestation(s):`);
            // Pretty print the results, handling BigInts
            console.log(JSON.stringify(loadedAttestations, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2));
        }

        console.log("\nExample script finished successfully.");

    } catch (error) {
        console.error("\nError running example loadOffChainAttestations script:", error);
        process.exit(1);
    }
}

runExampleLoadOffChain();