import { getProviderSigner } from "../provider";
import { registerSchema, SchemaRegistrationData } from "../eas-schema";
import { ethers } from "ethers";

// Example usage of the registerSchema function

// --- Configuration --- Define the schema you want to register
const newSchemaString = "uint256 voteId, bool isYesVote, string comment"; // Example schema - Replace or modify
const newSchemaResolver = ethers.ZeroAddress; // Optional: Replace with your resolver address if needed
const newSchemaRevocable = true;
// ---------------------

async function runExampleRegisterSchema() {
    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();
        console.log(`\nUsing signer: ${signer.address} to register schema.`);

        // 2. Define the schema registration data
        const schemaData: SchemaRegistrationData = {
            schema: newSchemaString,
            resolverAddress: newSchemaResolver,
            revocable: newSchemaRevocable,
        };

        // 3. Register the schema
        console.log(`\nAttempting to register schema: "${newSchemaString}"...`);
        const newSchemaUID = await registerSchema(signer, schemaData);

        console.log(`\nExample script finished successfully. New schema registered with UID: ${newSchemaUID}`);

    } catch (error) {
        console.error("\nError running example registerSchema script:", error);
        process.exit(1);
    }
}

runExampleRegisterSchema();
