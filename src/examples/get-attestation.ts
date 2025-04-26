import { getAttestation } from "../eas-attestation";
import { loadGetAttestationConfig } from "../utils/config-helpers"; // Import the config loader

// Example script name
const EXAMPLE_SCRIPT_NAME = "get-attestation";

// Remove hardcoded configuration constants
// const attestationUID = "...";

function bin2string(array: any[]) {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += (String.fromCharCode(array[i]));
    }
    return result;
}

async function runExampleGetAttestation() {
    try {
        // --- Load Configuration from YAML ---
        console.log(`\nLoading configuration for "${EXAMPLE_SCRIPT_NAME}" from examples.yaml...`);
        const exampleConfigs = loadGetAttestationConfig(); // Use the specific loader

        if (!exampleConfigs || exampleConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // Process the first config entry.
        const config = exampleConfigs[0];
        console.log("Configuration loaded successfully:", config);
        // ------------------------------------

        console.log(`\nAttempting to fetch attestation with UID: ${config.attestationUid}...`);

        // Fetch the attestation using the UID from config
        const attestation = await getAttestation(config.attestationUid);

        if (attestation) {
            console.log("\nAttestation fetched successfully:");
            // Pretty print the attestation object, handling BigInts
            console.log(JSON.stringify(attestation, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2));
        } else {
            // The getAttestation function logs specific errors/not found messages
            console.log(`\nAttestation with UID ${config.attestationUid} could not be fetched or found.`);
        }

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleGetAttestation();
