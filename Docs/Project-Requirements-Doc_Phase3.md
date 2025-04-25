<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Thank you for your help. With the requirements that you helped me put together, I've finished the second phase of building the foundation as composable functions. Phase 3 for this project is to extend the utility of the core EAS Sandbox modules with additional functionality. I would like to create a `Project Requirements Document` for Phase 3 so that it can be used in VSCode project and be used by Copilot in Agent mode. I've provided some details on the project below. Let me know if there is anything you would like me to clarify or expand on

# Project Summary

Phase 3 of this project is focused on extending the EAS Sandbox core modules with additional helper functions and new functionality. While there is new functionality requests, most of the work will likely be quality of life enhancements that make the core modules more composable.

At a high level, additional functionality includes:

1. The creation of a `utils` module that extends existing functions or auxiliary helper functions that would streamline common repetitive coding patterns.
2. Creating a chain of attestations. This would handle the case where one or more attestations would be made, referencing the origin attestation.
3. The introduction of what I'll call a `recipe manifest` to organize and manage setting properties for components in the workflow and example scripts.

- This `recipe manifest` is essentially a yaml file that would contain sections, representing each of the example or workflow scripts. Doing this offloads modifying the actual scripts to a single location that manages setting properties like:
a. The schema UID
b. Schema string that represents the field and datatype properties
c. Assign values to each field
d. Setting revocable property to true or false (defaults to true)
e. expiration time (defaults to `0n` for no expiration
f. Recipient address (defaults to ethers.ZeroAddress)
g. Optional reference UID
- Note that some but not all properties are required. Some scripts require fetching an attestation or schema to view.
- This format should be flexible to handle making multiple attestations for a single workflow or example script.

4. Add the ability to create private data attestations with the [PrivateData Class](https://docs.attest.org/docs/developer-tools/eas-sdk#using-the-privatedata-class).

In addition, it's likely a good time to do a code review and identify any inconsistencies, complexities that can be smoothed out and new functionality that could be built.

# Requirements:

- A user will need to create attestations from a data payload that may be split into multiple attestations with different schemas, where each reference an origin attestation.
- A user would like the option to know the estimated gas fee for an attestation they will be submitting.
- A user would like the option to see the total gas fee for the attestation that was just submitted.
- A user will need to know what the fields and datatypes are for given schema UID.
- A user will need to verify onchain or offchain attestations.
- As a user I would like to quickly update the schema properties for a given workflow or example script without update the script file itself.
- As a user, I would like to quickly update any other attestation properties for a given workflow or example script without update the script file itself.
- As a user, I need to ensure the data that's attested matches the specs of the referenced EAS schema before submitting. Submitting an invalid attestation will still burn gas, thus wasting my eth.
- Chaining together multiple EAS interactions should be flexible and composable, with coupling set to a minimum.
- As a user, I would like to view all referenced attestations from an origin attestation UID.
- As a user, I would like to create, prove and/or verify private data from an existing attestation.
- As a user, I would like to get a list of attestations by UID for a given wallet id.
- As a user, I would like to get a list of schemas created by UID for a given wallet id.
- 


# Stretch goal

The following are not required to be built in this phase.

- Code review of `src` code
- As a user, I would like to quickly create example workflows from a generated boilerplate script file.
- As a user, I would like to define workflows in an [ifttt](https://ifttt.com/) like approach as to to generate boilerplate scripts

New functionality around the pattern on [resolver contracts](https://docs.attest.org/docs/core--concepts/resolver-contracts).

- This unit of work might be too complicated for this phase. I'm not exactly sure how to implement these types of smart contracts for my particular use cases that would require running some kind of code to check against the attested data.
- Here are some examples that I have in mind that relate to this pattern but not how the EAS SDK does it technically.
    - In the case of the event check-in, a user would have their attestation, containing lat/long coordinates of where they are in at the time of checking in, verified against the lat long coordinates of the event.
        - Some kind of computation would need to be done that takes the lat/long coordinates from the user attestation and checks it against the lat/long coordinates of where the event is.
        - Another approach is that there's some kind of comparison done between two attestations; One representing the event host and the other representing the user checking in.
    - In the case of the impact monitoring analysis, ensuring the bounds defined in the attestation do not overlap with any existing monitoring zones.
- In each of these above mentioned cases, some kind of computation would need to be done.  I would guess that this could be done when an attestation is submitted with a schema containing a resolver contract, the resolving wallet address would have some kind of watch daemon looking for submissions. Once a submission is received, some kind of script would get kicked off, gathering the data from the attestation that would perform the computation. Once the result is received, a simple check would be performed for verification. It it passes, an attestation would be made on the behalf of the resolver wallet confirming the attestation is valid, otherwise the origin attestation would be revoked.

Here’s a comprehensive **Project Requirements Document for Phase 3** tailored for your VSCode project and Copilot Agent mode. If you need more detail or want to add specific helper functions or workflow scenarios, just let me know!

---

# Project Requirements Document – Phase 3

**Project Title:**
EAS Sandbox Utility \& Workflow Enhancement

**Author:**
[Your Name]

**Date:**
2025-04-18

**Version:**
0.1

---

## Introduction

Phase 3 of the EAS Sandbox project extends the composable core modules with auxiliary utilities, workflow orchestration features, and new attestation patterns. The goal is to improve developer experience, enable more advanced use cases, and streamline the creation and management of attestations, schemas, and workflows-especially for geospatial and private data scenarios.

---

## General Description

- **Purpose:**
Enhance the EAS Sandbox by adding helper utilities, workflow orchestration via a recipe manifest, support for chained and private data attestations, and quality-of-life improvements for script and workflow management.
- **Scope:**
    - `utils` module for helper and extension functions
    - Chained attestation creation and referencing
    - Recipe manifest (YAML) for workflow configuration
    - Private data attestation support
    - Gas estimation and reporting
    - Improved schema/attestation lookup, verification, and management
    - Stretch: Boilerplate workflow generation and initial exploration of resolver contract patterns
- **Stakeholders:**
    - Developers building on EAS
    - Solution architects designing attestation workflows
    - QA and code reviewers
- **Technical Dependencies:**
    - EAS Sandbox core modules (Phases 1 \& 2)
    - Node.js, TypeScript, Yarn
    - YAML parsing library (e.g., `js-yaml`)
    - EAS SDK with PrivateData class support

---

## Functional Requirements

| ID | Requirement | Priority | Notes |
| :-- | :-- | :-- | :-- |
| FR1 | Implement a `utils` module with helper functions for common EAS coding patterns | High | E.g., schema lookup, attestation validation |
| FR2 | Enable creation of chained attestations, referencing an origin attestation | High | E.g., multi-step workflows |
| FR3 | Support a YAML-based recipe manifest for configuring workflow/example script properties | High | See manifest property list below |
| FR4 | Allow updating schema and attestation properties via the manifest, not script code | High |  |
| FR5 | Enable flexible manifest structure to support multiple attestations per workflow | High |  |
| FR6 | Add gas estimation for attestations before submission | High |  |
| FR7 | Display total gas used after attestation submission | High |  |
| FR8 | Lookup and display schema fields and datatypes for a given schema UID | High |  |
| FR9 | Verify on-chain and off-chain attestations | High |  |
| FR10 | Validate attestation data against referenced EAS schema before submission | High | Prevents wasted gas on invalid submissions |
| FR11 | List attestations by UID for a given wallet address | Medium |  |
| FR12 | List schemas by UID for a given wallet address | Medium |  |
| FR13 | View all referenced attestations from an origin attestation UID | Medium |  |
| FR14 | Support creation, proof, and verification of private data attestations using EAS SDK’s PrivateData class | High |  |
| FR15 | Ensure all new features are modular, maintainable, and compatible with composable patterns | High |  |
| FR16 | Provide clear documentation and usage examples for each new utility and manifest feature | High |  |


---

### Recipe Manifest Properties

The YAML manifest should support the following (with sensible defaults):

- **schemaUid**: (required) The schema UID to use
- **schemaString**: (optional) The schema definition string
- **fields**: (required) Key-value pairs for each schema field
- **revocable**: (optional, default: true) Whether the attestation can be revoked
- **expirationTime**: (optional, default: `0n`) Expiration time in seconds since epoch
- **recipient**: (optional, default: `ethers.ZeroAddress`) Recipient address
- **referenceUid**: (optional) UID of referenced attestation
- **privateData**: (optional) Private data to be attested
- **multipleAttestations**: (optional) Array of attestation configs for batch workflows

---

## Non-Functional Requirements

| ID | Requirement | Priority | Notes |
| :-- | :-- | :-- | :-- |
| NFR1 | All new code must be modular, maintainable, and well-documented | High |  |
| NFR2 | Manifest and utils must be extensible for future workflow/attestation patterns | High |  |
| NFR3 | All scripts and modules must be compatible with Copilot Agent mode for AI-assisted development | High |  |
| NFR4 | Include robust error handling, especially for manifest parsing and attestation validation | High |  |
| NFR5 | Provide unit and integration tests for new utilities and manifest-driven workflows | High |  |


---

## User Stories Table

| User Story ID | Description | User Story | Expected Behavior/Outcome | Referenced Requirements |
| :-- | :-- | :-- | :-- | :-- |
| US001 | Streamline repetitive EAS coding patterns | As a developer, I want helper functions so I can avoid rewriting common EAS logic in every script. | The utils module exposes reusable helpers for schema lookup, validation, etc. | FR1, FR15, FR16, NFR1, NFR2 |
| US002 | Chain multiple attestations | As a user, I want to create a chain of attestations that reference an origin so I can model complex workflows. | The system allows chained attestation creation, referencing UIDs as needed. | FR2, FR5, FR13, NFR1, NFR2 |
| US003 | Manage workflow config centrally | As a user, I want to update schema and attestation properties in a manifest so I can avoid editing scripts. | The manifest drives script config; changes propagate without code edits. | FR3, FR4, FR5, FR16, NFR2, NFR3 |
| US004 | Estimate gas before submitting | As a user, I want to see the estimated gas fee for an attestation before I submit it. | The system displays a gas estimate for the attestation transaction. | FR6, NFR1, NFR4 |
| US005 | Report gas used after submission | As a user, I want to see the total gas fee for an attestation I just submitted. | The system displays the actual gas used after submission. | FR7, NFR1, NFR4 |
| US006 | Lookup schema fields and types | As a user, I want to know the fields and datatypes for a schema UID before creating an attestation. | The system fetches and displays schema details for the user. | FR8, NFR1, NFR4 |
| US007 | Validate attestation data | As a user, I want to ensure my attestation data matches the schema before submitting to avoid wasted gas. | The system validates data and blocks invalid submissions. | FR10, NFR1, NFR4 |
| US008 | Verify attestations | As a user, I want to verify on-chain or off-chain attestations to ensure authenticity. | The system provides verification utilities for attestations. | FR9, NFR1, NFR4 |
| US009 | List attestations and schemas by wallet | As a user, I want to see all my attestations and schemas by wallet address. | The system lists attestations and schemas for a given wallet. | FR11, FR12, NFR1, NFR4 |
| US010 | View referenced attestations | As a user, I want to view all attestations that reference an origin attestation UID. | The system fetches and displays all referencing attestations. | FR13, NFR1, NFR4 |
| US011 | Create and verify private data attestations | As a user, I want to create, prove, and verify private data in attestations for sensitive workflows. | The system supports EAS PrivateData class for private attestations. | FR14, NFR1, NFR4 |
| US012 | Batch/multi-attestation workflows | As a user, I want to create multiple attestations in a single workflow as defined in the manifest. | The system processes multiple attestation configs from the manifest in one run. | FR5, FR16, NFR1, NFR2 |
| US013 | Manifest-driven flexibility | As a user, I want the manifest to support optional and required properties, making it flexible for all scripts. | The manifest parser handles required/optional fields and applies sensible defaults. | FR3, FR4, FR5, NFR2, NFR4 |


---

## Stretch Goals

| Stretch ID | Description | Expected Outcome |
| :-- | :-- | :-- |
| SG1 | Code review and refactoring of `src` for consistency and maintainability | Codebase is more readable, modular, and easier to extend |
| SG2 | Generate example workflow boilerplate scripts from manifest or CLI | Users can scaffold new workflow scripts quickly |
| SG3 | Explore ifttt-like workflow definition and script generation | Users can define workflows visually or declaratively and generate scripts |
| SG4 | Initial exploration of resolver contract pattern for advanced on-chain validation | Prototype or design pattern for integrating resolver contracts with EAS workflows |


---

## Quality and Testing

- All new utilities and manifest features must include unit and integration tests.
- Manifest-driven workflows must be tested for required/optional property handling, error cases, and multi-attestation support.
- Documentation and usage examples must be updated for all new features.

---

## Glossary

- **Chained Attestation:** An attestation that references a previous (origin) attestation, forming a chain of verifiable claims.
- **Recipe Manifest:** A YAML configuration file that defines properties and parameters for workflow/example scripts.
- **Private Data Attestation:** An attestation where the data is encrypted or obfuscated, using the EAS SDK’s PrivateData class.
- **Resolver Contract:** A smart contract that validates or computes on attested data before confirming or revoking attestations.

---

## Additional Notes

- Place this document in your project root or `/docs` for Copilot Agent context.
- Future phases may expand on resolver contracts, UI integrations, or advanced workflow orchestration.

---

**Let me know if you want to expand on manifest structure, add specific helper utilities, or dive deeper into resolver contract patterns!**

