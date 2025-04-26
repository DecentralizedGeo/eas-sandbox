import { getProviderSigner } from "../provider";
import { revokeOnChainAttestation, RevocationData } from "../eas-attestation";
import { loadRevokeAttestationConfig } from "../utils/config-helpers"; // Import the config loader

// Example script name
const EXAMPLE_SCRIPT_NAME = "revoke-attestation";

// Remove hardcoded configuration constants
// const schemaUID = "...";
// const attestationUID = "...";

async function runExampleRevokeAttestation() {
    try {
        // --- Load Configuration from YAML ---
        console.log(`\nLoading configuration for "${EXAMPLE_SCRIPT_NAME}" from examples.yaml...`);
        const exampleConfigs = loadRevokeAttestationConfig(); // Use the specific loader

        if (!exampleConfigs || exampleConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // Process the first config entry.
        const config = exampleConfigs[0];
        console.log("Configuration loaded successfully:", config);
        // ------------------------------------

        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the revocation data from config
        const revocationData: RevocationData = {
            schemaUID: config.schemaUid,
            uid: config.attestationUid,
        };

        // 3. Revoke the attestation
        console.log(`\nAttempting to revoke attestation with UID: ${config.attestationUid}...`);
        await revokeOnChainAttestation(signer, revocationData);

        console.log(`\nExample script finished successfully. Attestation ${config.attestationUid} revocation transaction sent.`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleRevokeAttestation();
