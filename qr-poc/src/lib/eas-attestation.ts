/* eslint-disable @typescript-eslint/no-explicit-any */
import { EAS, SchemaEncoder, OffchainAttestationParams, SignedOffchainAttestation, Attestation } from "@ethereum-attestation-service/eas-sdk"; // Added Attestation type
import { ethers, Signer } from "ethers";
import { EASContractAddress } from "./config";
import { getProviderSigner } from "./provider";

// Define the interface for ON-chain attestation data
export interface OnChainAttestationData {
    recipient: string;
    expirationTime: bigint;
    revocable: boolean;
    schemaUID: string;
    schemaString: string;
    dataToEncode: { name: string; value: any; type: string }[];
    refUID?: string; // Optional: For referencing another attestation
}

// Define the interface for OFF-chain attestation data
export interface OffChainAttestationData {
    recipient: string;
    expirationTime: bigint;
    revocable: boolean;
    schemaUID: string;
    schemaString: string;
    dataToEncode: { name: string; value: any; type: string }[];
    refUID?: string; // Optional: For referencing another attestation
    time?: bigint; // Optional: Specific time for the attestation (defaults to current time if not provided)
    // nonce?: number; // Optional: Nonce for the attestation (defaults to 0 if not provided)
}

// Define the interface for revoking an on-chain attestation
export interface RevocationData {
    schemaUID: string;
    uid: string; // The UID of the attestation to revoke
}

/**
 * Creates an on-chain attestation using the EAS SDK.
 * @param signer - An ethers Signer instance.
 * @param attestationData - The data for the on-chain attestation.
 * @returns {Promise<string>} The UID of the new attestation.
 */
export async function createOnChainAttestation(
    signer: Signer,
    attestationData: OnChainAttestationData // Use specific interface
): Promise<string> {
    const eas = new EAS(EASContractAddress);
    eas.connect(signer as any);

    const { recipient, expirationTime, revocable, schemaUID, schemaString, dataToEncode, refUID } = attestationData;

    console.log(`Creating on-chain attestation with schema: ${schemaUID}`);
    console.log(`Recipient: ${recipient}`);

    const schemaEncoder = new SchemaEncoder(schemaString);
    const encodedData = schemaEncoder.encodeData(dataToEncode);

    console.log("\nEncoded Schema Data:", encodedData);

    const tx = await eas.attest({
        schema: schemaUID,
        data: {
            recipient: recipient,
            expirationTime: expirationTime,
            revocable: revocable,
            data: encodedData,
            refUID: refUID ?? ethers.ZeroHash, // Use ZeroHash if refUID is not provided
        },
    });

    console.log("\nSubmitting attestation transaction...");
    const newAttestationUID = await tx.wait();

    console.log("\nTransaction submitted and confirmed!");
    console.log("New attestation UID:", newAttestationUID);
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
        console.log("Attestation found:", attestation);
        return attestation;
    } catch (error: any) {
        // Handle cases where the attestation might not exist or other errors
        if (error.message.includes("invalid attestation uid")) { // Example error check, adjust as needed
            console.warn(`Attestation with UID ${uid} not found or invalid.`);
            return null;
        } else {
            console.error(`Error fetching attestation ${uid}:`, error);
            throw error; // Re-throw other errors
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
