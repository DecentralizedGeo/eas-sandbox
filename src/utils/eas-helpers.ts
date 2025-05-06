import { SchemaEncoder, SchemaItem, PrivateData, MerkleValue, MerkleValueWithSalt, MerkleMultiProof } from "@ethereum-attestation-service/eas-sdk";
import { ethers, Provider, Signer, TransactionReceipt, ContractTransaction, formatEther, formatUnits, ZeroAddress } from "ethers";
import { fetchSchema } from "../eas-schema";
import { GRAPHQL_ENDPOINT } from "../config";

// Helper to convert BigInt arrays to string for JSON
export const bigIntReplacer = (key: string, value: any) =>
    typeof value === 'bigint'
        ? value.toString()
        : value;

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
 * Finds the indices of specified field names within a schema definition or Merkle value array.
 *
 * @param fieldsToFind An array of field names to locate.
 * @param definitionSource An array of SchemaItem objects, an array of schema field name strings, or an array of MerkleValue objects.
 * @returns An array of numbers representing the 0-based indices of the found fields in the definitionSource.
 *          Fields from fieldsToFind that are not present in definitionSource are ignored.
 * @throws If definitionSource is not a valid array type or contains unexpected element types.
 */
export function getFieldIndices(fieldsToFind: string[], definitionSource: SchemaItem[] | string[] | MerkleValueWithSalt[]): number[] {
    // Validate input type
    if (!Array.isArray(definitionSource)) {
        console.error("Invalid definitionSource: Expected an array of SchemaItem, string, or MerkleValue.");
        throw new Error("Invalid definitionSource type provided to getFieldIndices. Expected an array.");
    }

    const indices = fieldsToFind.map(field => {
        let index: number = -1; // Default to not found

        if (definitionSource.length > 0) {
            const firstElement = definitionSource[0];
            if (typeof firstElement === 'string') {
                // Handle array of strings
                index = (definitionSource as string[]).findIndex(schemaField => schemaField === field);
            } else if (typeof firstElement === 'object' && firstElement !== null && 'name' in firstElement && typeof firstElement.name === 'string') {
                // Handle array of objects with a 'name' property (SchemaItem[] or MerkleValue[])
                // Assumes MerkleValue also has a 'name' property of type string.
                index = (definitionSource as Array<{ name: string }>).findIndex(item => item.name === field);
            } else {
                // Handle unexpected element type or structure within the array
                const elementType = typeof firstElement;
                const details = elementType === 'object' ? (firstElement === null ? 'null' : 'object without string name property') : elementType;
                console.error(`Invalid element type in definitionSource array: Found ${details}. Expected string or object with a 'name' property.`);
                throw new Error(`Invalid element type in definitionSource array provided to getFieldIndices.`);
            }
        }
        // If definitionSource is empty, index remains -1 (field not found)

        if (index === -1) {
            // Log warning if the field wasn't found (and the source wasn't empty/invalid)
            console.warn(`Field "${field}" not found in the provided definition source.`);
        }
        return index;
    }).filter(index => index !== -1); // Filter out not found indexes (-1)

    return indices;
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
        // const dataToEncode = Object.entries(data).map(([name, value]) => ({
        //     name,
        //     value,
        //     type: schemaEncoder.schema.find(item => item.name === name)?.type ?? '' // Infer type from schema for encodeData
        // }));
        const schemaItem = prepareSchemaItem(schemaString, data); // Validate the schema items against the schema string
        const validSchema = SchemaEncoder.isSchemaValid(schemaString); // Validate the schema string itself
        if (!validSchema) {
            console.error("Invalid schema string provided.");
            return false;
        }

        schemaEncoder.encodeData(schemaItem);
        console.log("Data structure appears valid for the schema.");
        // TODO: Add more robust type checking if needed beyond SchemaEncoder's capabilities
        return true;
    } catch (error) {
        console.error("Data validation failed:", error);
        return false;
    }
}

/**
 * Checks if the provided value is a valid byte32 string.
 * @param value The value to check.
 * @returns True if the value is a valid byte32 string, false otherwise.
 */
export function isBytes32Check(value: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Prepares the schema items for the attestation based on the provided schema string and config fields.
 * This function verifies that the fields in the config match the schema and filters out any extra fields.
 * It also ensures that the types are correctly set for the schema items.
 * If a `byte32` field value is not a valid `byte32` value, it encodes the value using `ethers.solidityPackedKeccak256`.
 * 
 * @param schemaString The schema definition string (e.g., "string name, uint256 value").
 * @param dataPayload A key/value data object (e.g., { name: "Test", value: 123 }).
 * @returns An array of SchemaItem objects ready for attestation.
 * @throws If there are missing required fields or if the schema is invalid.
 */
export function prepareSchemaItem(schemaString: string, dataPayload: Record<string, any>): SchemaItem[] {
    console.log("Verifying fields against schema...");
    const schemaEncoder = new SchemaEncoder(schemaString);
    const schemaItems = schemaEncoder.schema;
    const schemaFieldNames = schemaItems.map(item => item.name);
    const configFieldNames = Object.keys(dataPayload);

    // Check 1: Fields required by schema but missing in config
    const missingInConfig = schemaFieldNames.filter(field => !(field in dataPayload));
    if (missingInConfig.length > 0) {
        // Throw an error if required fields are missing
        throw new Error(`Error: The following fields required by the schema are missing in the provided configuration: ${missingInConfig.join(', ')}`);
    }

    // Check 2: Look for records that are not required by schema (extra fields)
    const extraInConfig = configFieldNames.filter(field => !schemaFieldNames.includes(field));
    if (extraInConfig.length > 0) {
        console.warn(`Warning: The following fields are present in the configuration but not in the schema (they will be ignored): ${extraInConfig.join(', ')}`);
    }

    // Remove the extra records
    const validatedFields: Record<string, any> = {};
    for (const schemaFieldName of schemaFieldNames) {
        validatedFields[schemaFieldName] = dataPayload[schemaFieldName];
    }

    // Create a SchemaItem array for the validated fields
    const validatedSchemaItems = schemaItems.map(item => {
        let value = validatedFields[item.name];

        // Check if the type is byte32 and if the value is not a valid byte32, encode it
        if (item.type === "bytes32" && !isBytes32Check(value)) {
            value = ethers.solidityPackedKeccak256(["string"], [value]);
        }

        return {
            name: item.name,
            type: item.type,
            value: value,
        };
    });

    console.log("Fields verified and filtered against schema successfully.");
    return validatedSchemaItems
}

/**
 * Prepares a PrivateData object for use in private attestations. (FR11 - Implied)
 * This function takes the schema, the full data object, and the names of fields
 * intended to be private, then formats them for the PrivateData constructor.
 *
 * @param data_payload The array of schema items [{ name, type, value }].
 * @returns A PrivateData instance ready for hashing and proof generation, or null if an error occurs.
 */
export function preparePrivateDataObject(
    data_payload: SchemaItem[] // Changed parameter type to accept the array directly
): PrivateData | null {

    const merklePayload: MerkleValue[] = data_payload.map(item => ({
        name: item.name,
        value: item.value,
        type: item.type,
    }));

    const privateData = new PrivateData(merklePayload);
    console.log("PrivateData object created successfully.");
    return privateData;
}

/**
 * Estimates the gas cost for a pre-populated transaction.
 * @param provider The provider to get fee data from.
 * @param signer The signer to use for gas estimation.
 * @param txData The populated transaction data (e.g., from contract.method.populateTransaction(...)).
 * @returns An object containing the estimated gas units (bigint) and the estimated cost in ETH (Number).
 * @throws If gas estimation fails or fee data cannot be retrieved.
 */
export async function estimateGasCost(
    provider: Provider, // Needed for fee data
    signer: Signer,     // Needed for estimation
    txData: ContractTransaction // Accept populated transaction data directly
): Promise<{ estimatedGas: bigint, estimatedCost: Number }> {
    try {
        const estimatedGas = await signer.estimateGas(txData);
        console.log("\n--- Estimated Gas Cost ---");
        console.log(`Estimated Gas Units: ${Number(estimatedGas.toString()).toLocaleString()}`);

        // 2. Estimate cost based on current gas price using the provided provider
        const feeData = await provider.getFeeData();
        let estimatedCost = 0; // Default value

        if (feeData?.gasPrice) {
            const estimatedCostWei = estimatedGas * feeData.gasPrice;
            estimatedCost = Number(formatUnits(estimatedCostWei, 'ether'));
            console.log(`Current Gas Price: ${Number(formatUnits(feeData.gasPrice, 'gwei')).toLocaleString()} Gwei`);
            console.log(`Estimated Transaction Cost: ${Number(estimatedCost).toLocaleString(undefined, { maximumFractionDigits: 8 })} ETH`);
        } else {
            console.warn("Could not retrieve gas price for estimation.");
            // Decide if this should throw or return default cost
            throw new Error("Failed to retrieve gas price for cost estimation.");
        }
        console.log("----------------------------");
        return { estimatedGas, estimatedCost };

    } catch (error) {
        console.error("Gas estimation failed:", error);
        // Log the txData for debugging if needed (be careful with sensitive data)
        // console.error("Transaction Data:", JSON.stringify(txData));
        throw new Error("Failed to estimate gas for the transaction.");
    }
}

/**
 * Reports the actual gas cost based on a transaction receipt.
 * @param receipt The transaction receipt object.
 */
export function reportActualGasCost(receipt: TransactionReceipt): void {
    console.log("\n--- Actual Gas Cost Report ---");
    const gasUsed = receipt.gasUsed;
    // Use gasPrice from receipt (it should reflect the actual price paid, including priority fee post-EIP-1559)
    const effectiveGasPrice = receipt.gasPrice;

    if (gasUsed && effectiveGasPrice) {
        const actualCostWei = gasUsed * effectiveGasPrice;
        const actualCostEth = formatUnits(actualCostWei, 'ether');
        console.log(`Actual Gas Units Used: ${Number(gasUsed.toString()).toLocaleString()}`);
        console.log(`Effective Gas Price: ${Number(formatUnits(effectiveGasPrice, 'gwei')).toLocaleString()} Gwei`);
        console.log(`Actual Transaction Cost: ${Number(actualCostEth).toLocaleString(undefined, { maximumFractionDigits: 8 })} ETH`);
    } else {
        console.warn("Could not determine actual gas cost from receipt (missing gasUsed or gasPrice).");
        console.log("Receipt details:", receipt); // Log receipt for debugging
    }
    console.log("----------------------------");
}


/**
 * Executes a GraphQL query against the EAS GraphQL endpoint.
 * @param query The GraphQL query string.
 * @param variables The variables to be used in the query.
 * @returns The parsed JSON response from the GraphQL endpoint.
 * @throws If the request fails or if the response is not valid JSON.
 */
async function executeGraphQLQuery(query: string, variables: Record<string, any>): Promise<any> {
    let response: Response | null = null; // Define response variable here
    try {
        response = await fetch(GRAPHQL_ENDPOINT, { // Assign to response
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables,
            }),
        });

        if (!response.ok) {
            // Log raw text for non-OK responses as well
            const errorText = await response.text();
            console.error("GraphQL request failed with non-OK status:", response.status, response.statusText);
            console.error("Raw response text:", errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Try to parse JSON, log raw text if it fails
        const responseText = await response.text(); // Get text first
        try {
            const result = JSON.parse(responseText); // Try parsing
            if (result.errors) {
                console.error("GraphQL Errors:", result.errors);
                throw new Error(`GraphQL query failed: ${result.errors.map((e: any) => e.message).join(', ')}`);
            }
            return result.data;
        } catch (parseError) {
            console.error("Failed to parse GraphQL response as JSON:", parseError);
            console.error("Raw response text:", responseText); // Log the problematic text
            throw new Error("Received non-JSON response from GraphQL endpoint.");
        }

    } catch (error) {
        // Catch fetch errors or errors thrown above
        console.error("Error during GraphQL query execution:", error);
        // Re-throw the error to be caught by the calling function
        throw error;
    }
}


/**
 * Lists attestations associated with a given wallet address using GraphQL. (FR11)
 * @param address The wallet address to query attestations for.
 * @param filterBy Specifies whether to filter by 'attester', 'recipient', or 'either'. Defaults to 'either'.
 * @param limit Max number of attestations to return. Defaults to 10.
 */
export async function listAttestationsForAddress(
    address: string,
    filterBy: 'attester' | 'recipient' | 'either' = 'either',
    limit: number = 10
): Promise<void> {
    console.log(`\nListing attestations for address: ${address} (Filter: ${filterBy}, Limit: ${limit}) via GraphQL`);

    // Construct the 'where' clause based on the filter
    let whereClause: any = {};
    if (filterBy === 'attester') {
        whereClause = { attester: { equals: address } };
    } else if (filterBy === 'recipient') {
        whereClause = { recipient: { equals: address } };
    } else { // 'either'
        whereClause = {
            OR: [
                { attester: { equals: address } },
                { recipient: { equals: address } }
            ]
        };
    }

    const query = `
        query AttestationsByAddress($where: AttestationWhereInput, $take: Int) {
            attestations(where: $where, take: $take, orderBy: { timeCreated: desc }) {
                id
                attester
                recipient
                refUID
                revocable
                timeCreated
                expirationTime
                schemaId
                decodedDataJson # Request decoded data
                # Add other fields if needed: revocationTime, txid, etc.
            }
        }
    `;

    try {
        const variables = { where: whereClause, take: limit };
        const data = await executeGraphQLQuery(query, variables);
        const attestations = data?.attestations || [];

        if (attestations.length === 0) {
            console.log("No attestations found for this address with the specified filter.");
            return;
        }

        console.log("\n--- Found Attestations ---");
        attestations.forEach((att: any, index: number) => {
            console.log(`  Attestation ${index + 1}:`);
            console.log(`    UID: ${att.id}`);
            console.log(`    Schema ID: ${att.schemaId}`);
            console.log(`    Attester: ${att.attester}`);
            console.log(`    Recipient: ${att.recipient}`);
            console.log(`    Time Created: ${new Date(Number(att.timeCreated) * 1000).toLocaleString()}`); // Convert seconds to ms
            console.log(`    Expiration Time: ${att.expirationTime === 0n ? 'Never' : new Date(Number(att.expirationTime) * 1000).toLocaleString()}`);
            console.log(`    Revocable: ${att.revocable}`);
            console.log(`    Reference UID: ${att.refUID !== ZeroAddress ? att.refUID : 'None'}`);
            try {
                // Attempt to parse and display decoded data
                const decodedData = JSON.parse(att.decodedDataJson);
                console.log("    Decoded Data:");
                decodedData.forEach((item: { name: string, type: string, value: any }) => {
                    // Display nested values if they exist (like decoded value)
                    const displayValue = typeof item.value === 'object' && item.value !== null && 'value' in item.value
                        ? item.value.value
                        : item.value;
                    console.log(`      - ${item.name} (${item.type}): ${JSON.stringify(displayValue)}`);
                });
            } catch (e) {
                console.log(`    Decoded Data: (Error parsing JSON: ${att.decodedDataJson})`);
            }
            console.log("    ---");
        });
        console.log("--------------------------");

    } catch (error) {
        console.error(`Error listing attestations for address ${address}:`, error);
    }
}

/**
 * Lists schemas registered by a given wallet address using GraphQL. (FR12)
 * @param address The wallet address of the schema creator.
 * @param limit Max number of schemas to return. Defaults to 10.
 */
export async function listSchemasForAddress(address: string, limit: number = 10): Promise<void> {
    console.log(`\nListing schemas registered by address: ${address} (Limit: ${limit}) via GraphQL`);

    const query = `
        query SchemasByCreator($where: SchemaWhereInput, $take: Int) {
            schemata(where: $where, take: $take, orderBy: { time: desc }) {
                id
                schema
                creator
                resolver
                revocable
                time
                index
                schemaNames{name}
            }
        }
    `;

    const variables = {
        where: { creator: { equals: address } },
        take: limit
    };

    try {
        const data = await executeGraphQLQuery(query, variables);
        const schemas = data?.schemata || [];

        if (schemas.length === 0) {
            console.log("No schemas found registered by this address.");
            return;
        }

        console.log("\n--- Found Schemas ---");
        schemas.forEach((schema: any, index: number) => {
            console.log(`  Schema ${index + 1}:`);
            console.log(`    UID: ${schema.id}`);
            console.log(`    Creator: ${schema.creator}`);
            console.log(`    Schema Definition: ${schema.schema}`);
            console.log(`    Resolver: ${schema.resolver !== ZeroAddress ? schema.resolver : 'None'}`);
            console.log(`    Revocable: ${schema.revocable}`);
            console.log(`    Time Created: ${new Date(Number(schema.time) * 1000).toLocaleString()}`);
            console.log(`    Index: ${schema.index}`);
            console.log(`    Schema Names:`);
            schema.schemaNames.forEach((name: any) => {
                console.log(`      - ${name.name}`);
            });
            console.log("    ---");
        });
        console.log("---------------------");

    } catch (error) {
        console.error(`Error listing schemas for address ${address}:`, error);
        // print the search query as a curl statement to help debug the issue
        console.error(`curl -X POST ${GRAPHQL_ENDPOINT} -H "Content-Type: application/json" -d '{"query": "${query}", "variables": ${JSON.stringify(variables)}}'`);
    }
}

/**
 * Lists attestations that reference a specific origin attestation UID using GraphQL. (FR13)
 * @param refUID The UID of the attestation being referenced.
 * @param limit Max number of attestations to return. Defaults to 10.
 */
export async function listReferencingAttestations(refUID: string, limit: number = 10): Promise<void> {
    console.log(`\nListing attestations referencing UID: ${refUID} (Limit: ${limit}) via GraphQL`);
    if (!refUID || refUID === ethers.ZeroHash || refUID === ZeroAddress) {
        console.log("Invalid or zero refUID provided.");
        return;
    }

    const query = `
        query AttestationsByRefUID($where: AttestationWhereInput, $take: Int) {
            attestations(where: $where, take: $take, orderBy: { timeCreated: desc }) {
                id
                attester
                recipient
                refUID # Included for confirmation, should match input
                revocable
                timeCreated
                expirationTime
                schemaId
                decodedDataJson
            }
        }
    `;

    try {
        const variables = {
            where: { refUID: { equals: refUID } },
            take: limit
        };
        const data = await executeGraphQLQuery(query, variables);
        const referencingAttestations = data?.attestations || [];

        if (referencingAttestations.length === 0) {
            console.log("No attestations found referencing this UID.");
            return;
        }

        console.log("\n--- Referencing Attestations ---");
        referencingAttestations.forEach((att: any, index: number) => {
            console.log(`  Attestation ${index + 1}:`);
            console.log(`    UID: ${att.id}`);
            console.log(`    Schema ID: ${att.schemaId}`);
            console.log(`    Attester: ${att.attester}`);
            console.log(`    Recipient: ${att.recipient}`);
            console.log(`    Time Created: ${new Date(Number(att.timeCreated) * 1000).toLocaleString()}`);
            console.log(`    Expiration Time: ${att.expirationTime === 0n ? 'Never' : new Date(Number(att.expirationTime) * 1000).toLocaleString()}`);
            console.log(`    Revocable: ${att.revocable}`);
            try {
                // Attempt to parse and display decoded data
                const decodedData = JSON.parse(att.decodedDataJson);
                console.log("    Decoded Data:");
                decodedData.forEach((item: { name: string, type: string, value: any }) => {
                    // Display nested values if they exist (like decoded value)
                    const displayValue = typeof item.value === 'object' && item.value !== null && 'value' in item.value
                        ? item.value.value
                        : item.value;
                    console.log(`      - ${item.name} (${item.type}): ${JSON.stringify(displayValue)}`);
                });
            } catch (e) {
                console.log(`    Decoded Data: (Error parsing JSON: ${att.decodedDataJson})`);
            }
            console.log("    ---");
        });
        console.log("------------------------------");

    } catch (error) {
        console.error(`Error listing referencing attestations for UID ${refUID}:`, error);
    }
}

/**
 * Generates a Merkle multi-proof for private data, allowing selective disclosure of fields.
 *    NOTE: The proof object is verified against the full Merkle Tree to ensure its validity.
 * @param privateDataPayload The PrivateData object containing the data to be attested.
 * @param fieldsToDisclose An array of field names to be disclosed in the proof. If not provided, no fields will be disclosed.
 * @returns An object containing the proof object and its JSON representation, or null if an error occurs.
 * @throws If the proof generation fails or if the private data payload is invalid.
 * */
export function generatePrivateDataProof(
    privateDataPayload: PrivateData, // Expects data already formatted
    fieldsToDisclose?: string[] | null// Changed type to string[]
): { proofObject: MerkleMultiProof, proofJson: string } | null { // Changed proof type
    console.log("\n--- Generating Private Data Proof ---");

    try {
        let fieldsToDiscloseIndex: number[] = []; // Default to empty array if no fields to disclose are provided

        if (!fieldsToDisclose) {
            console.warn("No fields specified for disclosure. Proof can still be used to verify the attestation.");
        } else {
            console.log(`The proof will reveal the following fields: ${fieldsToDisclose.join(', ')}`);
            fieldsToDiscloseIndex = getFieldIndices(fieldsToDisclose, privateDataPayload.getFullTree().values);
        }

        const proofObject = privateDataPayload.generateMultiProof(fieldsToDiscloseIndex);

        // As a sanity check, validate the proof object against the privateDataPayload Merkle Tree
        const fullTree = privateDataPayload.getFullTree();
        const calculatedRoot = PrivateData.verifyFullTree(fullTree);
        if (calculatedRoot !== fullTree.root) {
            console.error("Calculated root does not match the full tree root. Proof may be invalid.");
            return null;
        }
        const isValid = PrivateData.verifyMultiProof(fullTree.root, proofObject);
        if (!isValid) {
            console.error("Generated proof is invalid. Please check the input data and rerun proof generation.");
            return null;
        }

        // If we got this far, the proof is valid
        console.log("Proof object generated successfully and verified against the full tree.");

        // Create a JSON representation of the proof object
        const proofJson = JSON.stringify(proofObject, bigIntReplacer, 2);

        return { proofObject, proofJson };

    } catch (error) {
        console.error("Error generating Merkle proof:", error);
        return null;
    }
}

/**
 * Extracts coordinates from a GeoJSON Feature or FeatureCollection and scales them to the int40 range.
 * Supports Polygon geometries, processing only the outer ring.
 *
 * @param geojson A GeoJSON Feature or FeatureCollection object.
 * @returns For a FeatureCollection: An array of coordinate arrays (bigint[][][]), where each inner array represents a feature's outer ring.
 *          For a Feature: A single coordinate array (bigint[][]) representing the outer ring.
 *          Returns null if input is invalid, has unsupported geometry, or an error occurs.
 *          Output format: `bigint[longitude, latitude][]` for a single feature, `bigint[longitude, latitude][][]` for multiple features.
 */
export function extractAndScaleCoordinates(geojson: any): bigint[][] | bigint[][][] | null {
    // Define int40 range using BigInt
    const MAX_INT40 = (1n << 39n) - 1n; // 2^39 - 1 = 549,755,813,887
    const MIN_INT40 = -(1n << 39n);    // -2^39 = -549,755,813,888
    const PRECISION_FACTOR = 10n ** 9n; // Scale by 1e9 to preserve 9 decimal places

    /**
     * Scales a single coordinate value by multiplying by the precision factor and clamping to int40 range.
     */
    function scaleCoordinateToInt40(coord: number): bigint {
        // Multiply by precision factor, round to nearest integer, convert to BigInt
        const scaledValue = BigInt(Math.round(coord * Number(PRECISION_FACTOR)));

        // Clamp the final value to the target int40 range
        if (scaledValue < MIN_INT40) {
            console.warn(`Coordinate ${coord} scaled to ${scaledValue}, clamping to MIN_INT40 ${MIN_INT40}`);
            return MIN_INT40;
        }
        if (scaledValue > MAX_INT40) {
            console.warn(`Coordinate ${coord} scaled to ${scaledValue}, clamping to MAX_INT40 ${MAX_INT40}`);
            return MAX_INT40;
        }
        return scaledValue;
    }

    /**
     * Processes an array of coordinate pairs (e.g., a Polygon ring), scaling each pair.
     */
    function processCoordinatesArray(coords: number[][]): bigint[][] {
        return coords.map(pair => {
            // Validate coordinate pair structure
            if (pair.length !== 2 || typeof pair[0] !== 'number' || typeof pair[1] !== 'number') {
                console.error("Invalid coordinate pair format:", pair);
                throw new Error('Invalid coordinate pair found. Expected [longitude, latitude].');
            }
            const lon = pair[0];
            const lat = pair[1];

            // Validate longitude and latitude ranges before scaling
            if (lon < -180 || lon > 180) {
                throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180.`);
            }
            if (lat < -90 || lat > 90) {
                throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
            }

            // Scale longitude and latitude using direct multiplication and clamping
            const scaledLon = scaleCoordinateToInt40(lon);
            const scaledLat = scaleCoordinateToInt40(lat);
            return [scaledLon, scaledLat]; // Return scaled pair [longitude, latitude]
        });
    }

    try {
        // ... existing code for handling FeatureCollection and Feature ...
        // (No changes needed in the try-catch block structure itself)
        // Basic validation of the input GeoJSON object
        if (!geojson || typeof geojson !== 'object') {
            throw new Error('Invalid GeoJSON input: Input is null or not an object.');
        }

        // Handle FeatureCollection
        if (geojson.type === 'FeatureCollection') {
            if (!Array.isArray(geojson.features)) {
                throw new Error('Invalid FeatureCollection: Missing or invalid "features" array.');
            }
            const multiFeatureCoords: bigint[][][] = [];
            // Iterate through each feature in the collection
            for (const feature of geojson.features) {
                if (feature.type !== 'Feature' || !feature.geometry) {
                    console.warn('Skipping invalid feature in FeatureCollection (must be type "Feature" with a "geometry"):', feature);
                    continue; // Skip features that are not valid Features or lack geometry
                }
                // Currently supports only Polygon geometry based on requirements
                if (feature.geometry.type === 'Polygon' && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length > 0) {
                    // Process only the outer ring (first element of coordinates array)
                    const outerRing = feature.geometry.coordinates[0];
                    if (Array.isArray(outerRing) && outerRing.length > 0) {
                        try {
                            // Attempt to process the coordinates for this feature
                            multiFeatureCoords.push(processCoordinatesArray(outerRing));
                        } catch (featureError: any) {
                            // Catch errors from processing a specific feature's coordinates
                            // Log the error and continue to the next feature
                            console.warn(`Skipping feature due to error during coordinate processing: ${featureError.message}`, feature);
                        }
                    } else {
                        console.warn('Skipping feature with invalid Polygon coordinates (outer ring is missing or empty):', feature);
                    }
                } else {
                    // Log warning for unsupported or invalid geometries within the collection
                    console.warn(`Skipping feature: Unsupported geometry type "${feature.geometry?.type}" or invalid/missing coordinates. Only Polygons are currently processed.`);
                }
            }

            // Check how many valid features were processed
            if (multiFeatureCoords.length === 1) {
                // If exactly one valid feature was found, return its coordinates directly (bigint[][])
                console.log("FeatureCollection contained exactly one valid Polygon feature. Returning single feature coordinates.");
                return multiFeatureCoords[0];
            } else if (multiFeatureCoords.length === 0) {
                // If no valid features were found, return an empty array (consistent with multi-feature type)
                console.log("FeatureCollection contained no valid Polygon features to process.");
                return multiFeatureCoords; // Returns bigint[][][] (empty)
            } else {
                // If multiple valid features were found, return the array of coordinate arrays (bigint[][][])
                console.log(`FeatureCollection contained ${multiFeatureCoords.length} valid Polygon features. Returning multi-feature coordinates.`);
                return multiFeatureCoords;
            }

            // Handle single Feature
        } else if (geojson.type === 'Feature') {
            if (!geojson.geometry) {
                throw new Error('Invalid Feature: Missing "geometry".');
            }
            // Currently supports only Polygon geometry based on requirements
            if (geojson.geometry.type === 'Polygon' && Array.isArray(geojson.geometry.coordinates) && geojson.geometry.coordinates.length > 0) {
                // Process only the outer ring
                const outerRing = geojson.geometry.coordinates[0];
                if (Array.isArray(outerRing) && outerRing.length > 0) {
                    // Return a single coordinate array for the feature
                    return processCoordinatesArray(outerRing);
                } else {
                    throw new Error('Invalid Polygon coordinates: Outer ring is missing or empty.');
                }
            } else {
                // Throw error for unsupported geometry type in single Feature mode
                throw new Error(`Unsupported geometry type "${geojson.geometry?.type}" or invalid/missing coordinates. Only Polygons are currently processed.`);
            }
            // Handle unsupported top-level GeoJSON types
        } else {
            throw new Error(`Unsupported GeoJSON type: "${geojson.type}". Expected Feature or FeatureCollection.`);
        }
    } catch (error: any) {
        // Log any errors encountered during processing
        console.error("Error processing GeoJSON coordinates:", error.message);
        return null; // Return null to indicate failure
    }
}