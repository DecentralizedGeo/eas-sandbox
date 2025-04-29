import { EAS, SchemaEncoder, SchemaRegistry, SchemaRecord, PrivateData } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { getProviderSigner } from "../provider";
import { EASContractAddress, EASSchemaRegistryAddress } from "../config";
import { fetchSchema } from "../eas-schema"; // Import fetchSchema
import { MerkleValue } from "@ethereum-attestation-service/eas-sdk"; // Import MerkleValue

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


/**
 * Prepares a PrivateData object for use in private attestations. (FR11 - Implied)
 * This function takes the schema, the full data object, and the names of fields
 * intended to be private, then formats them for the PrivateData constructor.
 *
 * @param schemaString The schema definition string.
 * @param data The full data object for the attestation.
 * @param privateFieldNames An array of field names from the data object that should be kept private.
 * @returns A PrivateData instance ready for hashing and proof generation, or null if an error occurs.
 */
export function preparePrivateDataObject(
    schemaString: string,
    data: Record<string, any>,
    privateFieldNames: string[]
): PrivateData | null {
    console.log("Preparing PrivateData object for fields:", privateFieldNames);
    try {
        const schemaEncoder = new SchemaEncoder(schemaString);
        const schemaItems = schemaEncoder.schema; // Get the parsed schema items [{ name, type }]

        // Map the full data into the structure expected by EAS, including type information
        const allDataFormatted = schemaItems.map(item => {
            if (!(item.name in data)) {
                throw new Error(`Field "${item.name}" from schema not found in provided data.`);
            }
            return {
                name: item.name,
                value: data[item.name],
                type: item.type
            };
        });

        // Filter the formatted data to include only the fields designated as private
        const privateDataFormatted: MerkleValue[] = allDataFormatted
            .filter(item => privateFieldNames.includes(item.name))
            // Ensure the structure matches MerkleValue (which is likely { name, value, type })
            // If MerkleValue requires a different structure, adjust this mapping.
            .map(item => ({
                name: item.name,
                value: item.value,
                type: item.type,
            }));

        if (privateDataFormatted.length !== privateFieldNames.length) {
            console.warn("Some specified private field names were not found in the schema or data.");
        }

        if (privateDataFormatted.length === 0) {
            console.log("No private fields identified or provided. Returning null PrivateData object.");
            // Depending on EAS requirements, you might return an empty PrivateData
            // or handle this case differently. Returning null for clarity here.
            return null; // Or potentially: return new PrivateData([]);
        }

        // Create the PrivateData object using the correctly formatted array
        const privateData = new PrivateData(privateDataFormatted);
        console.log("PrivateData object created successfully.");
        return privateData;

    } catch (error) {
        console.error("Error preparing PrivateData object:", error);
        return null;
    }
}
