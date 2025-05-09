# Diagrams and Flowcharts

## Private Data Proofs On-Chain

### Sequence Diagram Script Execution

This sequence diagram illustrates the sequence execution of the `private-data-proofs-onchain.ts` script, detailing how it interacts with various components to generate and submit private data proofs on-chain.

```mermaid
sequenceDiagram
    participant User as User/Script Runner
    participant Script as private-data-proofs-onchain.ts
    participant ConfigLoader as config-helpers.ts
    participant EASHelper as eas-helpers.ts
    participant EASSchema as eas-schema.ts
    participant Ethers as ethers.js/Provider
    participant EASSDK as EAS SDK
    participant Blockchain as Ethereum Blockchain

    User->>Script: Run script (e.g., yarn example:private-data-proofs-onchain)
    Script->>ConfigLoader: loadFullConfig("examples.yaml")
    ConfigLoader-->>Script: Return fullConfig
    Script->>Script: Get config for "generate-onchain-private-data-proofs"
    Note over Script: Validate required config fields (fields, schemaUid/schemaString)

    alt Schema UID provided but Schema String is missing
        Script->>EASSchema: fetchSchema(config.schemaUid)
        EASSchema-->>Script: Return schemaRecord
        Script->>EASHelper: prepareSchemaItem(schemaRecord.schema, config.fields)
        EASHelper-->>Script: Return schemaItem (or error)
        Script->>Script: Update config.schemaString with fetched schema
    else Schema String provided
        Script->>EASHelper: prepareSchemaItem(config.schemaString, config.fields)
        EASHelper-->>Script: Return schemaItem (or error)
    end

    Script->>Ethers: getProviderSigner()
    Ethers-->>Script: Return signer

    Script->>EASHelper: preparePrivateDataObject(schemaItem)
    activate EASHelper
    EASHelper-->>Script: Return privateData object (EAS SDK PrivateData instance)
    deactivate EASHelper

    Script->>EASSDK: privateData.getFullTree().root
    EASSDK-->>Script: Return merkleRoot

    Script->>EASHelper: prepareSchemaItem(PRIVATE_DATA_SCHEMA_STRING, {privateData: merkleRoot})
    EASHelper-->>Script: Return privateDataSchemaItemForAttestation

    %%let attData = {schemaUID: PRIVATE_DATA_SCHEMA_UID, ..., dataToEncode: privateDataSchemaItemForAttestation}
    Script->>EASSDK: createOnChainAttestation(signer, attData)
    activate EASSDK
    EASSDK->>Blockchain: Submit attestation transaction
    Blockchain-->>EASSDK: Transaction receipt (includes newAttestationUID)
    EASSDK-->>Script: Return newAttestationUID
    deactivate EASSDK
    Note over Script: Log newAttestationUID

    Script->>EASHelper: generatePrivateDataProof(privateData, config.fieldsToDisclose)
    activate EASHelper
    EASHelper-->>Script: Return {proofObject, proofJson}
    deactivate EASHelper
    Note over Script: Log proofJson

    Script-->>User: Display results (UID, proof) or error
```

## Data journey Flowchart

This flowchart outlines the data journey from the user's input to the final on-chain attestation and proof generation. It highlights the key steps involved in processing the private data and creating the necessary attestations.

```mermaid
graph TD
    A[Start: User Initiates Script] --> B(Load Configuration);
    B --> C{Schema: UID or String?};
    C -- UID Provided --> D[Fetch Schema String];
    D --> E[Prepare SchemaItem with User Data];
    C -- String Provided --> E;
    E --> F[Prepare PrivateData Object];
    F --> G[Calculate Merkle Root from PrivateData];
    G --> H[Prepare SchemaItem for On-Chain Attestation using Merkle Root];
    H --> I[Create On-Chain Attestation with Merkle Root];
    I --> J[Generate Proof for Original PrivateData];
    J --> K[Display Attestation UID & Proof JSON];
    K --> L[End: User can verify Attestation on EAS scan using the Proof];
```
