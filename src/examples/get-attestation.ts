import { getAttestation } from "../eas-attestation";
// import { loadGetAttestationConfig } from "../utils/config-helpers"; // Remove old loader import
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import loadFullConfig and BaseConfig

// Example script name
const EXAMPLE_SCRIPT_NAME = "get-attestation";

// Remove hardcoded configuration constants (already done)

function bin2string(array: any[]) {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += (String.fromCharCode(array[i]));
    }
    return result;
}

async function runExampleGetAttestation() {
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
        // ------------------------------------

        // 1. Fetch the attestation using the UID from the config
        console.log(`\nAttempting to fetch attestation with UID: ${config.attestationUid}...`);
        const attestation = await getAttestation(config.attestationUid); // Pass validated attestationUid

        if (attestation) {
            console.log("\nAttestation fetched successfully:");
            // // Convert BigInt values to strings for clean console output
            // const attestationStringified = {
            //     ...attestation,
            //     expirationTime: attestation.expirationTime.toString(),
            //     revocationTime: attestation.revocationTime.toString(),
            // };
            // console.log(JSON.stringify(attestationStringified, null, 2));
        } else {
            console.log(`\nAttestation with UID ${config.attestationUid} could not be fetched or was not found.`);
        }

        console.log(`\nExample script ${EXAMPLE_SCRIPT_NAME} finished.`);

    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runExampleGetAttestation();
