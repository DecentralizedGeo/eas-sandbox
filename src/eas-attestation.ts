import { EAS, SchemaEncoder, OffchainAttestationParams, SignedOffchainAttestation, Attestation } from "@ethereum-attestation-service/eas-sdk"; // Added Attestation type
import { ethers, Signer } from "ethers";
import { EASContractAddress } from "./config";
import { getProviderSigner } from "./provider";
import { estimateGasCost, reportActualGasCost } from "./utils/eas-helpers";

// Base interface for attestation data (shared fields)
export interface BaseAttestationData {
    recipient: string;
    expirationTime: bigint;
    revocable: boolean;
    schemaUID: string;
    schemaString: string;
    dataToEncode: { name: string; value: any; type: string }[];
    refUID?: string; // Optional: For referencing another attestation
}

// On-chain attestation data (no extra fields)
export interface OnChainAttestationData extends BaseAttestationData {
    value?: bigint; // Optional: Value in wei (default is 0n)
}

// Off-chain attestation data (adds optional time)
export interface OffChainAttestationData extends BaseAttestationData {
    time?: bigint; // Optional: Specific time for the attestation (defaults to current time if not provided)
    // nonce?: number; // Optional: Nonce for the attestation (defaults to 0 if not provided)
}

// Define the interface for revoking an on-chain attestation
export interface RevocationData {
    schemaUID: string;
    uid: string; // The UID of the attestation to revoke
}

// Since the EAS SDK does not map the attestation property names to the return values. We must define
// the list of property names that we expect and manually map them to the return values.
// See the `Attestation` interface in the EAS SDK for the full list of properties.

export const attestationProps = [
    "uid",
    "schema",
    "refUID",
    "time",
    "expirationTime",
    "revocationTime",
    "recipient",
    "revocable",
    "attester",
    "data"
];

/**
 * Creates an on-chain attestation using the provided data.
 * Includes gas estimation before sending and reports gas used after confirmation.
 * @param signer - An ethers Signer instance.
 * @param attestationData - The data for the attestation.
 * @returns {Promise<string>} The UID of the new attestation.
 */
export async function createOnChainAttestation(
    signer: Signer,
    attestationData: OnChainAttestationData // Use specific interface
): Promise<string> {
    if (!signer.provider) {
        throw new Error("Signer must be connected to a provider for gas estimation.");
    }
    const provider = signer.provider; // Get provider from signer

    const eas = new EAS(EASContractAddress);
    // Ensure EAS is connected with the signer
    // Type assertion needed as EAS SDK connect might expect Provider | Signer
    const easConnected = eas.connect(signer as any);

    const { recipient, expirationTime, revocable, schemaUID, schemaString, dataToEncode, refUID } = attestationData;

    console.log(`\nPreparing on-chain attestation with schema: ${schemaUID}`);
    console.log(`Recipient: ${recipient}`);

    const schemaEncoder = new SchemaEncoder(schemaString);
    const encodedData = schemaEncoder.encodeData(dataToEncode);

    console.log("Encoded Schema Data:", encodedData);

    // Prepare the attestation parameters
    const attestationParams = {
        schema: schemaUID,
        data: {
            recipient: recipient,
            expirationTime: expirationTime,
            revocable: revocable,
            data: encodedData,
            refUID: refUID ?? ethers.ZeroHash,
            value: 0n, // This represents the transaction value (in wei). Assuming no ETH value is sent with the attestation.
        },
    };

    // --- Gas Estimation (FR6) ---
    try {
        // Prepare the transaction data without sending by accessing the underlying contract method
        // The wrapper easConnected.attest doesn't have populateTransaction, but the contract method does.
        const txData = await easConnected.contract.attest.populateTransaction(attestationParams);
        const _estimate = estimateGasCost(provider, signer, txData)
    } catch (error) {
        // Log the txData for debugging if needed (be careful with sensitive data)
        // console.error("Transaction Data:", JSON.stringify(txData));
        throw new Error("Failed to estimate gas for the transaction.");
    }

    console.log("\nSubmitting attestation transaction...");
    const tx = await easConnected.attest(attestationParams);

    // Ensure tx.wait() returns a non-null receipt
    const receipt = await tx.wait();
    // console.log(`Attestation UID: ${receipt}`);

    if (!receipt) {
        throw new Error(`Transaction ${tx.receipt?.hash} failed: No receipt received.`);
    }

    if (tx.receipt?.status === 0) {
        console.error("Transaction failed on-chain. Receipt:", receipt);
        throw new Error(`Transaction ${tx.receipt?.hash} reverted by the EVM.`);
    }

    console.log("\nTransaction submitted and confirmed!");

    // --- Actual Gas Reporting (FR7) ---
    reportActualGasCost(tx.receipt!); // Pass the receipt directly


    // Extract the attestation UID from the logs (assuming standard EAS event)
    // This part might need adjustment based on the exact event signature and logs structure
    const logs = tx.receipt?.logs!;
    let newAttestationUID = "";
    // Get the interface from the connected contract instance
    const easInterface = easConnected.contract.interface;

    for (const log of logs) {
        try {
            const parsedLog = easInterface.parseLog(log);
            if (parsedLog && parsedLog.name === "Attested") {
                // Assuming the UID is the third indexed topic or a data field
                // Check EAS SDK or Etherscan for exact event signature if needed
                // Example: Accessing event arguments (adjust based on actual event)
                if (parsedLog.args && parsedLog.args.uid) {
                    newAttestationUID = parsedLog.args.uid;
                    break;
                }
                // Fallback/Alternative: Check topics if UID is indexed
                // if (parsedLog.topic === ethers.id("Attested(address,address,bytes32,bytes32)") && log.topics.length > 3) {
                //     newAttestationUID = log.topics[3]; // Example: If UID is the 3rd indexed topic
                //     break;
                // }
            }
        } catch (e) {
            // Ignore logs that don't match the EAS interface
        }
    }


    if (!newAttestationUID || newAttestationUID === ethers.ZeroHash) {
        console.warn("Could not automatically extract attestation UID from transaction logs. Please check the transaction on a block explorer.");
        console.warn(`Transaction Hash: ${tx.receipt?.hash}`);
        // Attempt to use the old method as a fallback, though it's less reliable
        try {
            const fallbackUID = await tx.wait(); // This might return the UID directly in some SDK versions/configurations
            if (typeof fallbackUID === 'string' && fallbackUID.startsWith('0x')) {
                newAttestationUID = fallbackUID;
                console.log("Used fallback method to get UID:", newAttestationUID);
            } else {
                throw new Error("Failed to extract UID using primary and fallback methods.");
            }
        } catch (fallbackError) {
            console.error("Fallback UID extraction also failed:", fallbackError);
            throw new Error("Failed to extract attestation UID from transaction logs or fallback.");
        }

    }

    console.log("Attestation UID:", newAttestationUID);
    console.log(`\nView your attestation at: https://sepolia.easscan.org/attestation/view/${newAttestationUID}`);

    return newAttestationUID;
}

/**
 * Creates and signs an off-chain attestation using the EAS SDK.
 * Handles data encoding internally.
 * @param signer - An ethers Signer instance.
 * @param attestationData - The data for the off-chain attestation.
 * @returns {Promise<SignedOffchainAttestation>} The signed off-chain attestation object.
 */
export async function createOffChainAttestation(
    signer: Signer,
    attestationData: OffChainAttestationData // Use specific interface
): Promise<SignedOffchainAttestation> {
    const eas = new EAS(EASContractAddress);
    eas.connect(signer as any);

    const { recipient, expirationTime, revocable, schemaUID, schemaString, dataToEncode, refUID, time } = attestationData;

    console.log(`Creating off-chain attestation with schema: ${schemaUID}`);
    console.log(`Recipient: ${recipient}`);

    // Encode the data using SchemaEncoder
    const schemaEncoder = new SchemaEncoder(schemaString);
    const encodedData = schemaEncoder.encodeData(dataToEncode);

    console.log("\nEncoded Schema Data for Off-Chain:", encodedData);

    // Prepare parameters for signOffchainAttestation
    const params: OffchainAttestationParams = {
        recipient: recipient,
        expirationTime: expirationTime,
        revocable: revocable,
        schema: schemaUID,
        refUID: refUID ?? ethers.ZeroHash, // Use ZeroHash if refUID is not provided
        data: encodedData, // Use the encoded data
        time: time ?? BigInt(Math.floor(Date.now() / 1000)), // Use provided time or current time
        // nonce: nonce ?? 0, // Use provided nonce or 0
    };

    console.log("\nSigning off-chain attestation with params:", params);

    // Sign the off-chain attestation
    // Note: The signer must be connected to the EAS contract
    const offchain = await eas.getOffchain();
    const offchainAttestation = await offchain.signOffchainAttestation(params, signer as any);

    console.log("\nOff-chain attestation signed successfully!");
    console.log("Signed Attestation:", offchainAttestation);

    return offchainAttestation;
}

/**
 * Fetches an existing on-chain attestation by its UID.
 * @param uid - The UID of the attestation to fetch.
 * @returns {Promise<Attestation | null>} The attestation object, or null if not found.
 */
export async function getAttestation(uid: string): Promise<Attestation | null> {
    const eas = new EAS(EASContractAddress);
    // No signer needed for read operations, but connecting provider is good practice if not done globally
    // const { provider } = getProviderSigner(); // Assuming getProviderSigner exists and returns provider
    // eas.connect(provider);

    console.log(`\nFetching attestation with UID: ${uid}...`);
    try {
        // Need to connect a provider to make read calls
        const { provider } = getProviderSigner();
        eas.connect(provider);

        const attestation = await eas.getAttestation(uid);
        // Pretty print attestation details
        if (attestation) {

            // Create a dictionary object that maps property names to their values
            const attestationDetails: { [key: string]: any } = {};
            attestationProps.forEach((prop) => {
                const value = (attestation as any)[prop];
                attestationDetails[prop] = value;
            }
            );

            // Print the details in a readable format
            console.log("\nAttestation found:");
            console.log(`${JSON.stringify(attestationDetails, bigIntReplacer, 2)}`); // Use the custom replacer for BigInt
        } else {
            console.log("Attestation not found.");
        }
        return attestation;
    } catch (error: any) {
        // Handle cases where the attestation might not exist or other errors
        if (error.message.includes("invalid attestation uid")) {
            console.warn(`Attestation with UID ${uid} not found or invalid.`);
            return null;
        } else {
            console.error(`Error fetching attestation ${uid}:`, error);
            throw error;
        }
    }
}

/**
 * Revokes an existing on-chain attestation.
 * @param signer - An ethers Signer instance.
 * @param revocationData - The data needed for revocation (schemaUID and attestation UID).
 * @returns {Promise<void>} Resolves when the revocation transaction is confirmed.
 */
export async function revokeOnChainAttestation(
    signer: Signer,
    revocationData: RevocationData
): Promise<void> {
    const eas = new EAS(EASContractAddress);
    eas.connect(signer as any);

    const { schemaUID, uid } = revocationData;

    console.log(`\nAttempting to revoke attestation with UID: ${uid} using schema: ${schemaUID}...`);

    const tx = await eas.revoke({
        schema: schemaUID,
        data: { uid: uid },
    });

    console.log("Revocation transaction submitted...");
    await tx.wait();
    console.log("Attestation revoked successfully!");
}

/**
 * Timestamps an off-chain attestation UID on-chain using the EAS SDK.
 * @param signer - An ethers Signer instance.
 * @param uid - The UID (string) of the off-chain attestation to timestamp.
 * @returns {Promise<string>} The transaction hash of the timestamping transaction.
 */
export async function timestampOffchainAttestation(
    signer: Signer,
    uid: string
): Promise<string> {
    const eas = new EAS(EASContractAddress);
    eas.connect(signer as any);

    console.log(`Timestamping off-chain attestation UID: ${uid}`);
    const transaction = await eas.timestamp(uid);

    console.log("Waiting for transaction confirmation...");
    const receipt = await transaction.wait(); // Wait for the receipt instead
    console.log("Transaction confirmation received.");


    // Ensure receipt is valid and transaction succeeded
    if (!receipt || transaction.receipt?.status === 0) { // Check receipt status directly
        console.error("Transaction failed on-chain. Receipt:", receipt);
        // Use receipt.hash if available, otherwise transaction.hash
        const txHash = transaction.receipt?.hash;
        throw new Error(`Timestamping transaction failed on-chain (status ${transaction.receipt?.status}). Hash: ${txHash}`);
    }

    // Print transaction details as no errors were encountered
    console.log("Transaction successful! Hash:", transaction.receipt?.hash); // Use receipt.hash
    console.log("Transaction log details:", transaction.receipt?.logs); // Use receipt.logs
    return transaction.receipt?.hash as string; // Return the transaction hash from the receipt

}
