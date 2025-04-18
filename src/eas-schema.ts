import { EAS, SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { ethers, Signer, Provider } from "ethers";
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

    console.log(`\nAttempting to register schema: "${schema}"...`);
    console.log(`Resolver: ${resolverAddress ?? ethers.ZeroAddress}`);
    console.log(`Revocable: ${revocable}`);

    const transaction = await schemaRegistry.register({
        schema: schema,
        resolverAddress: resolverAddress ?? ethers.ZeroAddress, // Use ZeroAddress if no resolver
        revocable: revocable,
    });

    console.log("Schema registration transaction submitted...");

    // Wait for transaction confirmation - Assuming wait() returns the UID string directly
    const newSchemaUID = await transaction.wait();

    if (!newSchemaUID || typeof newSchemaUID !== 'string' || !newSchemaUID.startsWith('0x')) {
        throw new Error(`Schema registration transaction failed or returned an invalid UID: ${newSchemaUID}`);
    }

    // Removed the log parsing logic as wait() is assumed to return the UID directly

    console.log("Schema registered successfully!");
    console.log("New Schema UID:", newSchemaUID);
    console.log(`View schema at: https://sepolia.easscan.org/schema/view/${newSchemaUID}`);

    return newSchemaUID;
}

/**
 * Fetches an existing schema record from the SchemaRegistry by its UID.
 * @param uid - The UID of the schema to fetch.
 * @returns {Promise<SchemaRecord | null>} The schema record object, or null if not found.
 */
export async function getSchema(uid: string): Promise<SchemaRecord | null> {
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
