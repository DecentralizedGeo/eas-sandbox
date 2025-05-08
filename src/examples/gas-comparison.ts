import { EAS, SchemaEncoder, OffchainAttestationParams, SignedOffchainAttestation, Attestation } from "@ethereum-attestation-service/eas-sdk"; // Added Attestation type

import { getProviderSigner } from "../provider";
import { prepareSchemaItem, estimateGasCost, extractAndScaleCoordinates, bigIntReplacer } from "../utils/eas-helpers";
import { EASContractAddress } from "../config"
import { checkExistingSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers"; // Import loadFullConfig and BaseConfig

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "gas-cost-comparison";


// --- IMPORTANT: Replace with Actual Registered Schema UIDs ---
// You must register these schemas on the target network (e.g., Sepolia) first.
// Use the register-schema.ts script or the EAS website/tools.
// Schema 1: "string coordinates"
const STRING_SCHEMA = "string coordinates"; // <-- Update this if necessary
const INT_SCHEMA_SINGLE = "int40[2][] coordinates"; // <-- Update this if necessary
const INT_SCHEMA_MULTI = "int40[2][][] coordinates"; // <-- Update this if necessary

const STRING_SCHEMA_UID = "0x04a2530a09a090418d6ed5162b95c27147250febd8aa3bdeee0d80afcb67a303"; // <-- Replace this if corresponding schemaString above changes
const INT_SCHEMA_SINGLE_UID = "0xf51739bab26a7d1b8f8b1c81b4f345608575d1b02abf9eb185ceb3c5b8aaa18d"; // <-- Replace this if corresponding schemaString above changes
const INT_SCHEMA_MULTI_UID = "0xed410a64d72edd35d1d47b177fe7fc37426b9ca76fdc04fc53e3d0b192f8d5a8"; // <-- Replace this if corresponding schemaString above changes


async function checkCustomSchema() {
    // --- Check if placeholder UIDs have been replaced ---

    // check if schema UIDs exists
    // First, check if the schema already exists as to get the UID
    const existingSchemaUID = await checkExistingSchema(STRING_SCHEMA, undefined, true);
    if (!existingSchemaUID) {
        console.log(`schema does not exist for: ${STRING_SCHEMA}. Take a peek at the UID in the print statement above`);
        process.exit(1);
    }
    const existingIntSchemaUID = await checkExistingSchema(INT_SCHEMA_SINGLE, undefined, true);
    if (!existingIntSchemaUID) {
        console.log(`schema does not exist for ${INT_SCHEMA_SINGLE}. Take a peek at the UID in the print statement above`);
        process.exit(1);
    }
    const existingIntSchemaMultiUID = await checkExistingSchema(INT_SCHEMA_MULTI, undefined, true);
    if (!existingIntSchemaMultiUID) {
        console.log(`schema does not exist for ${INT_SCHEMA_MULTI}. Take a peek at the UID in the print statement above.`);
        process.exit(1);
    }
}


async function runGasComparison() {
    try {

        // --- Load Full Configuration from YAML ---
        console.log(`\nLoading full configuration from examples.yaml...`);
        const fullConfig = loadFullConfig();
        if (!fullConfig) {
            console.error("Failed to load configuration.");
            process.exit(1);
        }

        // --- Get Config for this specific script ---
        const scriptConfigs = fullConfig[EXAMPLE_SCRIPT_NAME];
        if (!scriptConfigs || scriptConfigs.length === 0) {
            console.error(`Configuration for "${EXAMPLE_SCRIPT_NAME}" not found or is empty in examples.yaml.`);
            process.exit(1);
        }

        // For this example, we use the first config entry.
        const config: BaseConfig = scriptConfigs[0];
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);

        if (!config.fields || typeof config.fields !== 'object' || Object.keys(config.fields).length === 0) {
            console.error(`Error: Invalid or missing 'fields' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        // Sanity check out custom schemas to ensure they are registered
        // If they are not, the gas estimation will fail.
        await checkCustomSchema()
        // ------------------------------------



        // --- Schema String Validation Step (using config) ---
        console.log("\n--- Testing Coordinate Scaling & Gas Estimation ---\n");
        // Extract the coordinates string from the config
        let coordinatesString = config.fields.coordinates as string;
        // Remove trailing commas before parsing. Otherwise, JSON.parse will throw an error 
        // since it expects expects strict JSON syntax.
        // console.log("Removing any trailing commas from the geojson object...");
        coordinatesString = coordinatesString.replace(/,\s*([\]}])/g, '$1');

        let geoJsonObject: any; // Variable to hold the parsed JSON object
        try {
            // Parse the string value into a JavaScript object using JSON.parse()
            geoJsonObject = JSON.parse(coordinatesString);
        } catch (parseError) {
            console.error("Failed to parse coordinates string from YAML into JSON:", parseError);
            console.error("Raw string was:", coordinatesString); // Log the raw string for debugging
            process.exit(1);
        }

        // ----------------------------------------------------------

        const scaledCoordinates = extractAndScaleCoordinates(geoJsonObject);

        if (!scaledCoordinates) {
            console.error("\nCoordinate scaling failed. Cannot estimate gas.");
            return;
        }

        // Determine if single or multi-feature based on the 

        const isMultiFeature = Array.isArray(scaledCoordinates[0]?.[0]); // Check if the first element's first element is an array
        const intSchemaString = isMultiFeature ? INT_SCHEMA_MULTI : INT_SCHEMA_SINGLE;
        const intSchemaUID = isMultiFeature ? INT_SCHEMA_MULTI_UID : INT_SCHEMA_SINGLE_UID;
        const intType = isMultiFeature ? "int40[2][][]" : "int40[2][]";

        console.log(`\nDetected ${isMultiFeature ? 'Multi-Feature' : 'Single-Feature'} output.`);
        console.log(`Using String Schema: "${STRING_SCHEMA}" (UID: ${STRING_SCHEMA_UID})`);
        console.log(`Using Int Schema: "${intSchemaString}" (UID: ${intSchemaUID})`);

        // Set up variables for gas estimates
        let gasEstimateString: { estimatedGas: bigint, estimatedCost: Number } | null = null;
        let gasEstimateInt: { estimatedGas: bigint, estimatedCost: Number } | null = null;

        // --- Get the provider and signer ---
        const { signer } = getProviderSigner();
        if (!signer.provider) {
            throw new Error("Signer must be connected to a provider for gas estimation.");
        }
        const provider = signer.provider; // Get provider from signer

        const eas = new EAS(EASContractAddress);
        const easConnected = eas.connect(signer as any);
        console.log("\n----------------------------\n");
        // ------------------------------------

        // --- Estimate Gas for String Schema ---
        console.log("\nEstimating gas for STRING schema...");

        // Prepare schema for the strings first
        // Use the validated fields directly from the config object
        let stringCoords = JSON.stringify(geoJsonObject, bigIntReplacer, 2);
        const stringData = { coordinates: stringCoords }; // Use the correct data structure for the schema encoder
        const dataToEncode = prepareSchemaItem(STRING_SCHEMA, stringData); // Use the validated schema string and fields from config
        const schemaEncoder = new SchemaEncoder(STRING_SCHEMA); // Use the schema string from the config
        const encodedData = schemaEncoder.encodeData(dataToEncode);

        // Prepare the attestation parameters
        const attestationParams = {
            schema: STRING_SCHEMA_UID,
            data: {
                recipient: config.recipient!,
                expirationTime: config.expirationTime!,
                revocable: config.revocable!,
                data: encodedData,
                refUID: config.referenceUid!,
                value: 0n // This represents the transaction value (in wei). Assuming no ETH value is sent with the attestation.
            },
        };

        const txData = await easConnected.contract.attest.populateTransaction(attestationParams);
        gasEstimateString = await estimateGasCost(provider!, signer, txData)

        // ------------------------------------

        // --- Estimate Gas for Int Schema ---
        console.log("\nEstimating gas for INT schema...");

        // Prepare schema for the integers first
        const intData = { coordinates: scaledCoordinates }; // Use the correct data structure for the schema encoder
        const intDataToEncode = prepareSchemaItem(intSchemaString, intData); // Use the validated schema string and fields from config
        const intSchemaEncoder = new SchemaEncoder(intSchemaString); // Use the schema string from the config

        const intEncodedData = intSchemaEncoder.encodeData(intDataToEncode);
        // Prepare the attestation parameters
        const intAttestationParams = {
            schema: intSchemaUID,
            data: {
                recipient: config.recipient!,
                expirationTime: config.expirationTime!,
                revocable: config.revocable!,
                data: intEncodedData,
                refUID: config.referenceUid!,
                value: 0n // This represents the transaction value (in wei). Assuming no ETH value is sent with the attestation.
            },
        };
        const intTxData = await easConnected.contract.attest.populateTransaction(intAttestationParams);
        gasEstimateInt = await estimateGasCost(provider!, signer, intTxData)
        // ------------------------------------

        // --- Display the gas estimates Results ---
        console.log("\n--- Gas Estimation Results ---");
        if (gasEstimateString) {
            console.log(`String Schema Estimated Gas: ${Number(gasEstimateString.estimatedGas).toLocaleString()} units`);
            console.log(`String Schema Estimated Cost: ${gasEstimateString.estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 8 })} ETH`);
        } else {
            console.log("String Schema Estimation Failed.");
        }
        if (gasEstimateInt) {
            console.log(`Int40 Array Schema Estimated Gas: ${Number(gasEstimateInt.estimatedGas).toLocaleString()} units`);
            console.log(`Int40 Array Schema Estimated Cost: ${gasEstimateInt.estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 8 })} ETH`);
        } else {
            console.log("Int40 Array Schema Estimation Failed.");
        }

        if (gasEstimateString && gasEstimateInt) {
            const difference = gasEstimateString.estimatedGas - gasEstimateInt.estimatedGas;
            const costDifference = Number(gasEstimateString.estimatedCost) - Number(gasEstimateInt.estimatedCost);
            console.log(`\nGas Difference (String - Int): ${Number(difference).toLocaleString()} units`);
            if (difference > 0) {
                console.log(`Attesting as int40 array is potentially cheaper by ${Number(difference).toLocaleString()} gas units.`);
                console.log(`Attesting as int40 array is potentially cheaper by ${Number(costDifference).toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH.`);
            } else if (difference < 0) {
                console.log(`Attesting as string is potentially cheaper by ${Number(-difference).toLocaleString()} gas units.`);
                console.log(`Attesting as string is potentially cheaper by ${Number(-costDifference).toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH.`);
            } else {
                console.log("Estimated gas cost is the same for both methods.");
            }
        }

        console.log("\n--- Coordinate Scaling & Gas Test Complete ---");


    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

runGasComparison()
