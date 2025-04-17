import { getProviderSigner } from "../provider";
import { revokeOnChainAttestation, RevocationData } from "../eas-attestation";

// Example usage of the revokeOnChainAttestation function

// --- Configuration --- Replace with the details of the attestation you want to revoke
const schemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Example Schema UID - Replace with the correct schema UID
// const attestationUID = "REPLACE_WITH_ATTESTATION_UID_TO_REVOKE"; // Example Attestation UID - Replace this!
const attestationUID = "0xa7dd07622f1bd742617a2311bc6b59108fe0e511859362d62da5d5e1cfdfb307"; // Example Attestation UID - Replace this!
// ---------------------

async function runExampleRevokeAttestation() {
    if (!schemaUID || schemaUID.startsWith("REPLACE")) {
        console.error("Error: Please replace the placeholder schemaUID in the script.");
        process.exit(1);
    }
    if (!attestationUID || attestationUID.startsWith("REPLACE")) {
        console.error("Error: Please replace the placeholder attestationUID in the script with the one you want to revoke.");
        process.exit(1);
    }

    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();
        console.log(`\nUsing signer: ${signer.address} to revoke attestation.`);

        // 2. Define the revocation data
        const revocationData: RevocationData = {
            schemaUID: schemaUID,
            uid: attestationUID,
        };

        // 3. Revoke the on-chain attestation
        console.log(`\nAttempting to revoke attestation with UID: ${attestationUID}...`);
        await revokeOnChainAttestation(signer, revocationData);

        console.log(`\nExample script finished successfully. Attestation ${attestationUID} should now be revoked.`);
        console.log(`Verify revocation status at: https://sepolia.easscan.org/attestation/view/${attestationUID}`);


    } catch (error) {
        console.error("\nError running example revokeAttestation script:", error);
        process.exit(1);
    }
}

runExampleRevokeAttestation();
