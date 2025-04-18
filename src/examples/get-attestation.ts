import { isBytesLike } from "ethers";
import { getAttestation } from "../eas-attestation";

// Example usage of the getAttestation function

// --- Configuration --- Replace with the UID of an attestation you want to fetch
// const attestationUID = "0xfff3d06905c2c75375ac465861313fd3fe6f670175617195a31501f376e699dd"; // Example UID - Replace this!
const attestationUID = "0x1f46ba63093ee98e5f67df5501b1de5350838487cbf42c980aa8f5598438a08d"; // Example UID - Replace this!
// ---------------------

function bin2string(array: any[]) {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += (String.fromCharCode(array[i]));
    }
    return result;
}


async function runExampleGetAttestation() {
    if (!attestationUID) {
        console.error("Error: Please replace the placeholder attestationUID in the script with a real one.");
        process.exit(1);
    }

    try {
        console.log(`\nAttempting to fetch attestation with UID: ${attestationUID}...`);

        // Fetch the attestation
        const attestation = await getAttestation(attestationUID);

        if (attestation) {
            console.log("\nAttestation fetched successfully:");

            // Print the keys from attestations which is a the response object
            console.log("Attestation UID:", attestation.uid);
            console.log("Schema UID:", attestation.schema);
            console.log("Recipient:", attestation.recipient);
            console.log("Expiration Time:", attestation.expirationTime.toString());
            console.log("Revocable:", attestation.revocable);
            console.log("Ref UID:", attestation.refUID);
            console.log("Data:", attestation.data);
            console.log("Time:", attestation.time.toString());


            // // Pretty print the attestation object, handling BigInts
            // console.log(JSON.stringify(attestation, (key, value) =>
            //     typeof value === 'bigint' ? value.toString() : value, 2));
        }
    } catch (error) {
        console.error("\nError running example getAttestation script:", error);
        process.exit(1);
    }
}

runExampleGetAttestation();
