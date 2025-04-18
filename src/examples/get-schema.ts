import { getSchema } from "../eas-schema";

// Example usage of the getSchema function

// --- Configuration --- Replace with the UID of a schema you want to fetch
// const schemaUID = "REPLACE_WITH_SCHEMA_UID"; // Example UID - Replace this!
const schemaUID = "0xba4171c92572b1e4f241d044c32cdf083be9fd946b8766977558ca6378c824e2"; // Example UID - Replace this!
// ---------------------

async function runExampleGetSchema() {
    if (!schemaUID || schemaUID.startsWith("REPLACE")) {
        console.error("Error: Please replace the placeholder schemaUID in the script with a real one.");
        process.exit(1);
    }

    try {
        console.log(`\nAttempting to fetch schema with UID: ${schemaUID}...`);

        // Fetch the schema
        const schemaRecord = await getSchema(schemaUID);

        if (schemaRecord) {
            console.log("\nSchema fetched successfully:");
            // Pretty print the schema record object, handling BigInts if any were present (though unlikely in SchemaRecord)
            console.log(JSON.stringify(schemaRecord, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2));
        } else {
            console.log(`\nSchema with UID ${schemaUID} could not be found.`);
        }

    } catch (error) {
        console.error("\nError running example getSchema script:", error);
        process.exit(1);
    }
}

runExampleGetSchema();
