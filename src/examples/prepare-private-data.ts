import { preparePrivateDataObject } from "../utils/eas-helpers";

// Example Usage (can be removed or adapted)
async function examplePrivateAttestationFlow() {
    const exampleSchema = "string location, uint256 timestamp, string notes";
    const exampleData = {
        location: "Building A",
        timestamp: Math.floor(Date.now() / 1000),
        notes: "This part should be private"
    };
    const fieldsToKeepPrivate = ["notes"]; // Only 'notes' will be part of the Merkle tree

    const privateDataInstance = preparePrivateDataObject(exampleSchema, exampleData, fieldsToKeepPrivate);

    if (privateDataInstance) {
        // Now you can use the privateDataInstance
        const dataHash = privateDataInstance;
        console.log("Generated Private Data Hash:", dataHash);

        // You would typically use this hash and the privateDataInstance
        // when constructing the actual attestation transaction data.
        // The exact mechanism depends on how you call the EAS contract
        // for private attestations (e.g., using multiAttest or attest).

        // Example: Building a proof for a specific private field (if needed later for revealing)
        // const proof = privateDataInstance.buildProof('notes');
        // console.log("Proof for 'notes':", proof);
    } else {
        console.log("Failed to create PrivateData object.");
    }
}

// Uncomment to run the example when this file is executed directly or imported elsewhere
examplePrivateAttestationFlow();
