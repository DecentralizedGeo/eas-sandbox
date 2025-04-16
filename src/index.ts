import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";

const eas = new EAS(EASContractAddress);
eas.connect(signer);

// Initialize SchemaEncoder with the schema string
const schemaEncoder = new SchemaEncoder("uint256 eventId, uint8 voteIndex");
const encodedData = schemaEncoder.encodeData([
    { name: "eventId", value: 1, type: "uint256" },
    { name: "voteIndex", value: 1, type: "uint8" },
]);

const schemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995";

const tx = await eas.attest({
    schema: schemaUID,
    data: {
        recipient: "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165",
        expirationTime: 0,
        revocable: true, // Be aware that if your schema is not revocable, this MUST be false
        data: encodedData,
    },
});

const newAttestationUID = await tx.wait();

console.log("New attestation UID:", newAttestationUID);

// import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
// import { ethers } from "ethers";
// import easConfig from "./EAS.config";

// const rpcUrl = `<your rpc url + api key here>`;

// // Instantiate EAS with the appropriate provider
// const provider = new ethers.providers.JsonRpcProvider(rpcUrl); // Replace with your RPC URL
// const eas = new EAS(easConfig.chains["42161"].easContractAddress);
// eas.connect(provider);

// // Initialize SchemaEncoder with the raw schema string
// const schemaRawString = easConfig.schema.rawString;
// const schemaEncoder = new SchemaEncoder(schemaRawString);

// // Dynamic values are:
// const longitude = "-9.3539"; // decimal degrees, formatted as strings
// const latitude = "51.4747";
// const mediaLink = "<IPFS CID, or a URL>";
// const memo = "Your memo";

// // Define encodeData function to structure the data for attestation
// const encodedData = schemaEncoder.encodeData([
//     { name: "eventTimestamp", value: Math.floor(Date.now() / 1000), type: "uint256" },
//     { name: "srs", value: "EPSG:4326", type: "string" },
//     { name: "locationType", value: "DecimalDegrees<string>", type: "string" },
//     { name: "location", value: `${longitude}, ${latitude}`, type: "string" },
//     { name: "recipeType", value: ["Type1", "Type2"], type: "string[]" },
//     { name: "recipePayload", value: [ethers.toUtf8Bytes("Payload1")], type: "bytes[]" },
//     { name: "mediaType", value: ["image/jpeg"], type: "string[]" },
//     { name: "mediaData", value: ["CID1", "CID2"], type: "string[]" },
//     { name: "memo", value: "Test memo", type: "string" },
// ]);

// // Attest using EAS
// const schemaUID = easConfig.chains["42161"].schemaUID; // Adjust for your chain ID
// const attestationTx = await eas.attest({
//     schema: schemaUID,
//     data: {
//         recipient: "0xRecipientAddress", // Replace with recipient address
//         expirationTime: 0n, // No expiration
//         revocable: true,
//         data: encodedData,
//     },
// });

// const attestationResult = await attestationTx.wait();
// console.log(`Attestation complete with UID: ${attestationResult.attestationUID}`);