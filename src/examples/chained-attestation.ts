import { createOnChainAttestation } from "../eas-attestation";
import { getProviderSigner } from "../provider";
import { fetchSchema } from "../eas-schema";
import { loadFullConfig, BaseConfig } from "../utils/config-helpers";
import { validateAttestationData, prepareSchemaItem } from "../utils/eas-helpers";


const EXAMPLE_SCRIPT_NAME = "chained-attestation";

async function runBatchChainedAttestation() {
    const fullConfig = loadFullConfig();
    if (!fullConfig) throw new Error("Config load failed.");

    const scriptConfigs = fullConfig[EXAMPLE_SCRIPT_NAME];
    if (!scriptConfigs || scriptConfigs.length === 0) throw new Error("No config found.");

    interface AttestationBatchConfig {
        attestations: BaseConfig[];
    }
    const batch = scriptConfigs[0] as AttestationBatchConfig;
    if (!Array.isArray(batch.attestations) || batch.attestations.length === 0) {
        throw new Error("No attestations found in batch.");
    }

    const { signer } = getProviderSigner();

    for (const [i, att] of batch.attestations.entries()) {

        if (!att.schemaUid || typeof att.schemaUid !== "string" || !att.schemaUid.startsWith("0x")) {
            throw new Error(`Attestation #${i}: Invalid or missing schemaUid`);
        }
        if (!att.fields || typeof att.fields !== "object" || Object.keys(att.fields).length === 0) {
            throw new Error(`Attestation #${i}: Invalid or missing fields`);
        }

        // Fetch schema and validate data
        const schemaRecord = await fetchSchema(att.schemaUid);
        if (!schemaRecord) throw new Error(`Attestation #${i}: Schema not found`);

        if (!validateAttestationData(schemaRecord.schema, att.fields)) {
            throw new Error(`Attestation #${i}: Data validation failed`);
        }

        const dataToEncode = prepareSchemaItem(schemaRecord.schema, att.fields);

        const attestationData = {
            recipient: att.recipient!,
            expirationTime: att.expirationTime!,
            revocable: att.revocable!,
            schemaUID: att.schemaUid!,
            schemaString: schemaRecord.schema,
            refUID: att.referenceUid!,
            dataToEncode,
        };

        const newAttestationUID = await createOnChainAttestation(signer, attestationData);
        console.log(`Attestation #${i} created. UID: ${newAttestationUID}`);
    }
}

runBatchChainedAttestation();
