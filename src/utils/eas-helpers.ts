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


/**
 * Estimates the gas cost for a pre-populated transaction.
 * @param provider The provider to get fee data from.
 * @param signer The signer to use for gas estimation.
 * @param txData The populated transaction data (e.g., from contract.method.populateTransaction(...)).
 * @returns An object containing the estimated gas units (bigint) and the estimated cost in ETH (string).
 * @throws If gas estimation fails or fee data cannot be retrieved.
 */
export async function estimateGasCost(
    provider: Provider, // Needed for fee data
    signer: Signer,     // Needed for estimation
    txData: ContractTransaction // Accept populated transaction data directly
): Promise<{ estimatedGas: bigint, estimatedCost: string }> {
    try {
        // 1. Estimate gas using the provided signer and the populated transaction data
        const estimatedGas = await signer.estimateGas(txData);
        console.log("\n--- Estimated Gas Cost ---");
        console.log(`Estimated Gas Units: ${estimatedGas.toString()}`);

        // 2. Estimate cost based on current gas price using the provided provider
        const feeData = await provider.getFeeData();
        let estimatedCost = "N/A"; // Default value

        if (feeData?.gasPrice) {
            const estimatedCostWei = estimatedGas * feeData.gasPrice;
            estimatedCost = formatUnits(estimatedCostWei, 'ether');
            console.log(`Current Gas Price (Wei): ${feeData.gasPrice.toString()}`);
            console.log(`Estimated Transaction Cost (ETH): ${estimatedCost}`);
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
        console.log(`Actual Gas Used: ${gasUsed.toString()}`);
        console.log(`Effective Gas Price (Wei): ${effectiveGasPrice.toString()}`);
        console.log(`Actual Transaction Cost (ETH): ${formatEther(actualCostWei)}`);
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


