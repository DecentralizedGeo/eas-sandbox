import { ethers } from 'ethers';
import { EAS, SchemaEncoder, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { EASContractAddress, EASSchemaRegistryAddress, SCHEMA_UID } from '../src/config';
import { getAttestation } from '../src/eas-attestation'
import CryptoJS from "crypto-js";

// constants
const schemaUID = SCHEMA_UID;
const SECRET = "hello";

async function main() {
  console.log(`Starting attestation monitor for schema: ${schemaUID}`);
  
  // Connect to Sepolia network
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/4c5626750cf84a7ead5a8efa84311307');
  
  // Initialize EAS SDK
  const eas = new EAS(EASContractAddress);
  eas.connect(provider);
  
  // Create a schema encoder to decode the data later
  const schemaRegistry = new SchemaRegistry(EASSchemaRegistryAddress);
  schemaRegistry.connect(provider);
  
  const schema = await schemaRegistry.getSchema({ uid: SCHEMA_UID });
  const schemaDefinition = schema.schema;
  const schemaEncoder = new SchemaEncoder(schemaDefinition);

  // Setup attestation event listener
  const filter = eas.contract.filters.Attested(undefined, undefined, undefined, schemaUID);

  console.log("Monitoring for new attestations...");

  // Listen for attestation events
  eas.contract.on(filter, async (recipient, attester, uid, schemaId, event) => {
    try {
      console.log("\n--- New Attestation Detected ---");
      console.log(`Timestamp: ${new Date().toISOString()}`);
      
      // @ts-ignore
      const attestationUid = recipient.log.data
      const attestation = await getAttestation(attestationUid);
      
      if (attestation) {
        const decodedData = schemaEncoder.decodeData(attestation.data);
        console.log("Decoded payload:", decodedData[5].value.value);

        // @ts-ignore
        const encryptedData: any = decodedData[5].value.value[0];
        const encryptedBytes = ethers.getBytes(encryptedData);
        const base64String = new TextDecoder().decode(Uint8Array.from(encryptedBytes));

        const decryptedData = CryptoJS.AES.decrypt(base64String, SECRET).toString(CryptoJS.enc.Utf8);
        console.log("Decrypted payload:", decryptedData);
      } else {
        console.log("No attestation data found.");
      }
      console.log("--------------------------------");
    } catch (error) {
      console.error("Error processing attestation:", error);
    }
  });
  
  // Keep the process running
  process.stdin.resume();
  
  console.log("Monitoring active. Press Ctrl+C to exit.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
