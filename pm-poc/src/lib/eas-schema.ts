/* eslint-disable @typescript-eslint/no-explicit-any */
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { ethers, Signer, isError } from "ethers";
// Import the specific Schema Registry address
import { EASSchemaRegistryAddress } from "./config";
import { getProviderSigner } from "./provider"; // To get provider for read operations

// Interface for schema registration data
export interface SchemaRegistrationData {
    schema: string; // The schema definition string (e.g., "uint256 eventId, bool vote")
    resolverAddress?: string; // Optional: Address of a resolver contract
    revocable: boolean; // Whether attestations using this schema are revocable by default
}

// Interface matching the SDK's SchemaRecord structure for clarity
export interface SchemaRecord {
    uid: string;
    schema: string;
    resolver: string;
    revocable: boolean;
}


/**
 * Checks if a schema is already registered in the SchemaRegistry by calculating its potential UID.
 * 
 * @param schema The schema definition string (e.g., "uint256 eventId, bool vote").
 * @param resolverAddress Optional: Address of a resolver contract.
 * @param revocable Whether attestations using this schema are revocable by default.
 * @returns The UID if the schema exists, otherwise null.
 */
export async function checkExistingSchema(schema: string, resolverAddress: string | undefined, revocable: boolean): Promise<string | null> {
    // Calculate the potential UID for the schema.
    const potentialUID = ethers.solidityPackedKeccak256(
        ['string', 'address', 'bool'],
        [schema, resolverAddress ?? ethers.ZeroAddress, revocable]
    );

    console.log(`\nChecking for existing schema with potential UID: ${potentialUID}...`);

    // Instantiate SchemaRegistry for read operation.
    const schemaRegistry = new SchemaRegistry(EASSchemaRegistryAddress);
    const { provider } = getProviderSigner(); // Need provider for read operations
    schemaRegistry.connect(provider);

    try {
        // Attempt to fetch the schema record using the calculated UID.
        const schemaRecord = await schemaRegistry.getSchema({ uid: potentialUID });

        // Check if the schema record is empty (indicates not found).
        if (schemaRecord.uid === ethers.ZeroHash || schemaRecord.schema === "") {
            console.log('Schema not registered yet.');
            return null;
        } else {
            // Schema exists
            console.log(`Schema already exists with UID: ${schemaRecord.uid}`);
            console.log(`View schema at: https://sepolia.easscan.org/schema/view/${schemaRecord.uid}`);
            return schemaRecord.uid; // Return the existing UID
        }
    } catch (error) {
        // Handle cases where getSchema might fail unexpectedly.
        // Check if it's the specific 'Schema not found' error from the SDK.
        if (error instanceof Error && error.message === 'Schema not found') {
            // Log a simpler message without the stack trace for this specific case.
            console.error("Error checking existing schema: Error: Schema not found");
        } else {
            // Log other unexpected errors with more details.
            console.error("Unexpected error checking existing schema:", error);
        }
        // Decide on error handling: return null or re-throw. Returning null aligns with "not found".
        return null; 
    }
}


/**
 * Registers a new schema on the EAS SchemaRegistry.
 * Assumes transaction.wait() directly returns the schema UID string.
 * @param signer - An ethers Signer instance.
 * @param schemaData - The data for the schema to register.
 * @returns {Promise<string>} The UID of the newly registered schema.
 */
export async function registerSchema(
    signer: Signer,
    schemaData: SchemaRegistrationData
): Promise<string> {
    // Instantiate SchemaRegistry directly with its address
    const schemaRegistry = new SchemaRegistry(EASSchemaRegistryAddress);
    // Connect the signer to the SchemaRegistry instance
    schemaRegistry.connect(signer as any);

    const { schema, resolverAddress, revocable } = schemaData;

    // First, check if the schema already exists to avoid unnecessary transaction
    const existingSchemaUID = await checkExistingSchema(schema, resolverAddress, revocable);
    if (existingSchemaUID) {
        return existingSchemaUID; // Return the existing UID if found
    }

    console.log(`\nAttempting to register schema: "${schema}"...`);
    console.log(`Resolver: ${resolverAddress ?? ethers.ZeroAddress}`);
    console.log(`Revocable: ${revocable}`);

    // Wrap the transaction in a try-catch block to handle errors gracefully
    // This can help identify issues, especially when the transaction hangs or fails
    try {

        // Setting up the transaction overrides. This is optional and can be adjusted.
        // If you're experiencing hangs with the transaction, it might help to adjust
        // the gas limit or other parameters. The default gas limit is usually sufficient,
        // but you can specify it explicitly if needed.

        // Uncomment the following line to set an explicit gas limit if needed and other overrides
        // the default gas limit is 21000 for simple transactions, but it can vary based on the complexity of the transaction.
        // const overrides = {
        //     gasLimit: 5000000
        // };

        const overrides = {}
        console.log(`Using overrides: ${JSON.stringify(overrides)}`);

        const transaction = await schemaRegistry.register({
            schema: schema,
            resolverAddress: resolverAddress ?? ethers.ZeroAddress, // Use ZeroAddress if no resolver
            revocable: revocable,
        }, overrides); // Pass overrides here

        console.log("Waiting for transaction confirmation...");
        const receipt = await transaction.wait(); // Wait for the receipt instead
        console.log("Transaction confirmation received.");


        // Ensure receipt is valid and transaction succeeded
        if (!receipt || transaction.receipt?.status === 0) {
            console.error("Transaction failed on-chain. Receipt:", receipt);
            throw new Error(`Schema registration transaction failed on-chain (status ${transaction.receipt?.status}). Hash: ${transaction.receipt?.hash}`);
        }

        // We are sure registeredEvent is not null here and corresponds to the Registered event
        const SchemaUID = receipt

        if (!SchemaUID || typeof SchemaUID !== 'string' || !SchemaUID.startsWith('0x')) {
            console.error("Extracted UID is invalid:", SchemaUID);
            throw new Error(`Schema registration transaction succeeded but returned an invalid UID: ${SchemaUID}`);
        }

        console.log("Schema registered successfully!");
        console.log("New Schema UID:", SchemaUID);
        console.log(`View schema at: https://sepolia.easscan.org/schema/view/${SchemaUID}`);

        return SchemaUID;

    } catch (error) {
        console.error("\n--- Error during schema registration --- ");

        const errorMessage = "Schema registration failed";

        if (error instanceof Error) {
            // Check if isError 
            if (isError(error, "CALL_EXCEPTION")) {
                console.error(`Type: ${error.code} (Transaction Reverted)`);
                console.error("Action:", error.action);
                console.error("Reason:", error.reason);
                console.error("Transaction:", error.transaction);

                if (error.action === "estimateGas") {
                    console.error("Transaction might have run out of gas. Consider increasing the gas.");
                    console.error("Note: Any unused gas will be refunded. See EIP-1559 for details.");
                }
            }
            else {
                console.error(`Type: ${error}`);
                if ('action' in error) console.error("Action:", error.action);
                if ('reason' in error) console.error("Reason:", error.reason);
                if ('transaction' in error) console.error("Transaction:", error.transaction);
            }

            // Log the full error object for detailed inspection
            console.error("Full Error Object:", JSON.stringify(error, null, 2));
        }

        throw new Error(errorMessage); // Re-throw a more informative error
    }
}

/**
 * Fetches an existing schema record from the SchemaRegistry by its UID.
 * @param uid - The UID of the schema to fetch.
 * @returns {Promise<SchemaRecord | null>} The schema record object, or null if not found.
 */
export async function fetchSchema(uid: string): Promise<SchemaRecord | null> {
    // Instantiate SchemaRegistry directly with its address
    const schemaRegistry = new SchemaRegistry(EASSchemaRegistryAddress);
    const { provider } = getProviderSigner(); // Need provider for read operations
    // Connect the provider to the SchemaRegistry instance
    schemaRegistry.connect(provider);

    console.log(`\nFetching schema with UID: ${uid}...`);
    try {
        // Use the schemaRegistry instance to call getSchema
        const schemaRecord = await schemaRegistry.getSchema({ uid });

        // Check if the schema record is empty (indicates not found)
        if (schemaRecord.uid === ethers.ZeroHash || schemaRecord.schema === "") {
            console.warn(`Schema with UID ${uid} not found.`);
            return null;
        }

        console.log("Schema found:", schemaRecord);
        return schemaRecord;
    } catch (error) {
        console.error(`Error fetching schema ${uid}:`, error);
        // Consider more specific error handling if needed
        throw error;
    }
}

