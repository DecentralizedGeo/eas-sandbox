import { preparePrivateDataObject, prepareSchemaItem } from "../utils/eas-helpers";

// Example Usage (can be removed or adapted)
async function examplePrivateAttestationFlow() {
    const exampleSchema = "string location, uint256 timestamp, string notes";
    const exampleData = {
        location: "Building A",
        timestamp: Math.floor(Date.now() / 1000),
        notes: "This part should be private"
    };

    const exampleSchemaItem = prepareSchemaItem(exampleSchema, exampleData);

    const privateDataInstance = preparePrivateDataObject(exampleSchemaItem);

    if (privateDataInstance) {
        console.log("Private data root hash :", privateDataInstance.getFullTree().root);
        console.log("PrivateData Leaves (Hashed Values):");
        console.log(privateDataInstance.getFullTree().values);
    } else {
        console.log("Failed to create PrivateData object.");
    }
}

examplePrivateAttestationFlow();
