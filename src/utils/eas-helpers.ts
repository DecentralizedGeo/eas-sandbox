import { EAS, SchemaEncoder, SchemaRegistry, SchemaRecord } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { getProviderSigner } from "../provider";
import { EASContractAddress, EASSchemaRegistryAddress } from "../config";
import { fetchSchema } from "../eas-schema"; // Import fetchSchema

// Removed the redundant getSchemaRecord function

/**
 * Looks up and displays schema details for a given schema UID. (FR8)
 * @param schemaUID The UID of the schema to look up.
 */
export async function displaySchemaDetails(schemaUID: string): Promise<void> {
    console.log(`Looking up schema details for UID: ${schemaUID}`);
    // Now uses fetchSchema internally
    const schemaRecord = await fetchSchema(schemaUID);
    if (!schemaRecord) {
        // Error/not found message already logged by fetchSchema or its caller
        console.log(`Could not display details for schema UID: ${schemaUID} (not found or error fetching).`);
        return;
    }

    console.log("\n--- Schema Record ---");
    console.log(`UID: ${schemaRecord.uid}`);
    console.log(`Resolver: ${schemaRecord.resolver}`);
    console.log(`Revocable: ${schemaRecord.revocable}`);
    console.log(`Schema Definition: ${schemaRecord.schema}`);
    console.log("\n--- Schema Fields ---");

    // Parse and display schema fields with explicit types
    const schemaFields = schemaRecord.schema.split(',').map((field: string) => field.trim());
    if (schemaFields.length === 1 && schemaFields[0] === '') {
        console.log("(No fields defined in schema string)");
    } else {
        schemaFields.forEach((field: string, index: number) => {
            const parts = field.split(' ');
            const type = parts[0];
            const name = parts.slice(1).join(' ');
            console.log(`  Field ${index + 1}: Name='${name}', Type='${type}'`);
        });
    }
    console.log("---------------------");
}

/**
 * Validates attestation data against a given schema definition string. (FR10)
 * @param schemaString The schema definition (e.g., "string name, uint256 value").
 * @param data The data object to validate (e.g., { name: "Test", value: 123 }).
 * @returns True if data is valid, false otherwise.
 */
export function validateAttestationData(schemaString: string, data: Record<string, any>): boolean {
    console.log(`Validating data against schema: ${schemaString}`);
    try {
        const schemaEncoder = new SchemaEncoder(schemaString);
        // The encodeData method implicitly validates types during encoding attempt
        // Map data object to the array format expected by encodeData
        const dataToEncode = Object.entries(data).map(([name, value]) => ({
            name,
            value,
            type: schemaEncoder.schema.find(item => item.name === name)?.type ?? '' // Infer type from schema for encodeData
        }));
        schemaEncoder.encodeData(dataToEncode);
        console.log("Data structure appears valid for the schema.");
        // TODO: Add more robust type checking if needed beyond SchemaEncoder's capabilities
        return true;
    } catch (error) {
        console.error("Data validation failed:", error);
        return false;
    }
}

// Add other common EAS utility functions here as needed
