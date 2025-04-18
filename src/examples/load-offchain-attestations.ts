import { loadOffChainAttestations, OffChainAttestationQuery } from "../offchain-storage";

// Example usage of the loadOffChainAttestations function

// --- Optional Query Configuration --- Uncomment and modify to filter results
const query: OffChainAttestationQuery = {
    // uid: "REPLACE_WITH_SPECIFIC_UID",
    // schema: "REPLACE_WITH_SCHEMA_UID",
    // recipient: "REPLACE_WITH_RECIPIENT_ADDRESS",
    // attester: "REPLACE_WITH_ATTESTER_ADDRESS",
};
// -----------------------------------

async function runExampleLoadOffChain() {
    try {
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