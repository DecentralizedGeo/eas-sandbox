import { displaySchemaDetails } from "../utils/eas-helpers"; // New import for the renamed helper

// Example usage of the displaySchemaDetails helper function

// --- Configuration --- Replace with the UID of a schema you want to fetch
// const schemaUID = "REPLACE_WITH_SCHEMA_UID"; // Example UID - Replace this!
const schemaUID = "0xba4171c92572b1e4f241d044c32cdf083be9fd946b8766977558ca6378c824e2"; // Example UID - Replace this!
// ---------------------

async function runExampleFetchSchema() {
    if (!schemaUID || schemaUID.startsWith("REPLACE")) {
        console.error("Error: Please replace the placeholder schemaUID in the script with a real one.");
        process.exit(1);
    }

    try {
        console.log(`\nAttempting to fetch and display schema details using displaySchemaDetails helper for UID: ${schemaUID}...`);

        // Use the new renamed helper function
        await displaySchemaDetails(schemaUID);

        // The displaySchemaDetails function now handles the console output internally
        // console.log("\nSchema details displayed above.");

    } catch (error) {
        console.error("\nError running example fetch-schema script:", error);
        process.exit(1);
    }
}

runExampleFetchSchema();
