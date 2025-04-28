import { getProviderSigner } from "../provider";
import { revokeOnChainAttestation, RevocationData } from "../eas-attestation";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import loadFullConfig and BaseConfig

// Example script name
const EXAMPLE_SCRIPT_NAME = "revoke-attestation";

// Remove hardcoded configuration constants (already done)

async function runExampleRevokeAttestation() {
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
        if (!config.attestationUid || typeof config.attestationUid !== 'string' || !config.attestationUid.startsWith('0x')) {
            console.error(`Error: Invalid or missing 'attestationUid' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        if (!config.schemaUid || typeof config.schemaUid !== 'string') {
            console.error(`Error: Invalid or missing 'attestationUid' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the revocation data from config
        const revocationData: RevocationData = {
            schemaUID: config.schemaUid,
            uid: config.attestationUid,
        };

        // 3. Revoke the attestation using the UID from the config
        console.log(`\nAttempting to revoke attestation with UID: ${config.attestationUid}...`);
        await revokeOnChainAttestation(signer, revocationData); // Pass validated attestationUid

        console.log(`\nExample script ${EXAMPLE_SCRIPT_NAME} finished successfully.`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleRevokeAttestation();
