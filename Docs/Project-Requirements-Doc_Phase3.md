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
Enhance the EAS Sandbox by adding helper utilities, workflow orchestration via a Configuration manifest, support for chained and private data attestations, and quality-of-life improvements for script and workflow management.
- **Scope:**
  - `utils` module for helper and extension functions
  - Chained attestation creation and referencing
  - Configuration manifest (YAML) for workflow configuration
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
| FR3 | Support a YAML-based Configuration manifest for configuring workflow/example script properties | High | See manifest property list below |
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

### Configuration Manifest Properties

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
- **Configuration Manifest:** A YAML configuration file that defines properties and parameters for workflow/example scripts.
- **Private Data Attestation:** An attestation where the data is encrypted or obfuscated, using the EAS SDK’s PrivateData class.
- **Resolver Contract:** A smart contract that validates or computes on attested data before confirming or revoking attestations.

---

## Additional Notes

- Place this document in your project root or `/docs` for Copilot Agent context.
- Future phases may expand on resolver contracts, UI integrations, or advanced workflow orchestration.

---

**Let me know if you want to expand on manifest structure, add specific helper utilities, or dive deeper into resolver contract patterns!**
