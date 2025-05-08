import { SchemaItem } from "@ethereum-attestation-service/eas-sdk";
import { getProviderSigner } from "../provider";
import { preparePrivateDataObject, prepareSchemaItem, generatePrivateDataProof } from "../utils/eas-helpers"; // Added verifyPrivateDataProof
import { fetchSchema } from "../eas-schema";
import { PRIVATE_DATA_SCHEMA_STRING, PRIVATE_DATA_SCHEMA_UID } from "../config";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";

// Example script name, used as key in examples.yaml
const EXAMPLE_SCRIPT_NAME = "generate-onchain-private-data-proofs";

async function runPrivateDataWorkflow() {
    try {
        console.log("\n--- Starting Onchain Private Data workflow ---");

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
        const config: BaseConfig = scriptConfigs[0]; // Use the first config entry
        console.log(`Using configuration for "${EXAMPLE_SCRIPT_NAME}":`, config);
        // ------------------------------------

        // --- Script-Specific Validation ---
        if (!config.fields || typeof config.fields !== 'object' || Object.keys(config.fields).length === 0) {
            console.error(`Error: Invalid or missing 'fields' in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        // check if config.schemaString or config.schemaUid is provided
        if (!config.schemaUid && !config.schemaString) {
            console.error(`Error: Neither 'schemaUid' nor 'schemaString' provided in config for ${EXAMPLE_SCRIPT_NAME}.`);
            process.exit(1);
        }

        // Declaring schemaItem here to avoid re-declaration in the if-else block
        // and to ensure it's accessible later in the code.
        let schemaItem: SchemaItem[] | null = null;

        if (!config.schemaString && config.schemaUid) {
            console.log(`\nLooks like the schema string is missing but the schema UID is provided.`);
            console.log(`Fetching schema string for UID: ${config.schemaUid}...`);
            const schemaRecord = await fetchSchema(config.schemaUid); // Pass validated schemaUid
            if (!schemaRecord) {
                console.error("Failed to fetch schema record. Aborting creation.");
                process.exit(1);
            }

            // now we'll need to validate the config.fields against the schemaString that we just fetched
            schemaItem = prepareSchemaItem(schemaRecord.schema, config.fields);
            // if (!schemaItem) {
            //     console.error(`Failed to validate the fields set in config against the schema ${schemaRecord.schema}.`);
            //     process.exit(1);
            // }
            config.schemaString = schemaRecord.schema; // Set the schemaString in the config
        }

        else if (config.schemaString) {
            console.log(`\nLooks like the schema string is provided in the config.`);
            console.log(`Validating the fields set in config against the schema ${config.schemaString}...`);
            try {
                schemaItem = prepareSchemaItem(config.schemaString, config.fields); // Pass validated schemaString
            } catch (error: any) {
                console.error(error.message);
                process.exit(1);
            }
        }

        if (!schemaItem) {
            console.log("invalid schemaItem, exiting...");
            process.exit(1);
        }

        // ------------------------------------

        // 1. Get Provider and Signer
        const { signer } = getProviderSigner();
        const signerAddress = await signer.getAddress();

        // 3. Create PrivateData Object
        console.log("\n--- 1. PrivateData Object Creation ---");
        let privateData = preparePrivateDataObject(schemaItem);
        if (!privateData) {
            console.error("Failed to prepare PrivateData object. Aborting.");
            process.exit(1);
        }

        // 4. Calculate Merkle Root
        const merkleRoot = privateData.getFullTree().root;
        console.log(`Calculated Merkle Root: ${merkleRoot}`);

        // Optionally log leaves (hashed private data) - Be cautious in production
        console.log("PrivateData Leaves (Hashed Values):");
        console.log(privateData.getFullTree().values);

        // 5. Create onchain attestation with private data object

        // prepare private data schema item for onchain attestation
        const privateDataSchemaItem = prepareSchemaItem(PRIVATE_DATA_SCHEMA_STRING, {
            privateData: merkleRoot,
        });

        const attestationData: OnChainAttestationData = {
            recipient: config.recipient!, // Default applied in loadFullConfig
            expirationTime: config.expirationTime!, // Default applied & converted in loadFullConfig
            revocable: config.revocable!, // Default applied in loadFullConfig
            schemaUID: PRIVATE_DATA_SCHEMA_UID, // Validated above
            schemaString: PRIVATE_DATA_SCHEMA_STRING, // Use the validated on-chain schema string
            refUID: config.referenceUid!, // Default applied in loadFullConfig
            dataToEncode: privateDataSchemaItem,
        };


        const newAttestationUID = await createOnChainAttestation(signer, attestationData);

        console.log("\n--- 2. Proof Generation ---");
        const resultantProof = generatePrivateDataProof(privateData, config.fieldsToDisclose);
        // const resultantProof = generatePrivateDataProof(privateData);
        if (!resultantProof) {
            console.error("Failed to generate proof. Aborting.");
            process.exit(1);
        }
        const { proofObject, proofJson } = resultantProof;

        console.log("\nIf this privateData object is submitted as an attestation, you can verify it by pasting the following proof into the UI:");
        console.log(`${proofJson}`);

        console.log("\n--- Private Data Workflow Completed ---");
    } catch (error) {
        console.error(`\nError running example ${EXAMPLE_SCRIPT_NAME} script:`, error);
        process.exit(1);
    }
}

// Execute the workflow
runPrivateDataWorkflow().catch(error => {
    console.error("Workflow failed with error:", error);
    process.exit(1);
});
