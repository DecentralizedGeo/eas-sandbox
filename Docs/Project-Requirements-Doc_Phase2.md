# Project Requirements Document – Phase 2

**Project Title:**
EAS Geospatial Workflow Example Suite

**Author:**
Seth Docherty

**Date:**
2025-04-18

**Version:**
0.1

---

## Introduction

Phase 2 of the EAS Modular Playground project focuses on building real-world example workflows that demonstrate how the composable EAS modules (from Phase 1) can be used in geospatial business scenarios. These examples will showcase how to create, store, retrieve, and manage attestations that capture geospatial metadata, supporting a range of use cases such as impact monitoring, event check-ins, and geocaching.

---

## General Description

- **Purpose:**
To provide a suite of practical, well-documented example workflows that illustrate how EAS can be leveraged for geospatial business needs using the modular foundation from Phase 1.
- **Scope:**
    - Example scripts and documentation for 3–5 geospatial workflows.
    - Each example demonstrates EAS interactions: schema creation, attestation, retrieval, revocation, and off-chain storage.
    - All workflows use the composable, low-coupling modules from Phase 1.
- **Stakeholders:**
    - Developers and solution architects evaluating EAS for geospatial data management.
    - Business analysts exploring blockchain-backed geospatial workflows.
- **Technical Dependencies:**
    - Phase 1 composable EAS modules
    - Node.js, TypeScript, Yarn
    - Testnet wallet and RPC API key

---

## Functional Requirements

| ID | Requirement | Priority | Notes |
| :-- | :-- | :-- | :-- |
| FR1 | Provide example scripts for registering geospatial bounds as attestations | High | E.g., impact monitoring |
| FR2 | Provide example scripts for event check-in with geo-IP and digital ticket | High | E.g., event attendance |
| FR3 | Provide example scripts for geocaching activity with QR code and geospatial metadata | High |  |
| FR4 | Enable creation of new EAS schemas tailored to each workflow | High |  |
| FR5 | Validate attested data against the corresponding EAS schema before submission | High |  |
| FR6 | Demonstrate on-chain and off-chain attestation creation and retrieval in examples | High |  |
| FR7 | Demonstrate attestation revocation and explain scenarios for revocation | Medium |  |
| FR8 | Ensure all example workflows are flexible and leverage composable, low-coupling modules | High |  |
| FR9 | Provide clear, step-by-step documentation for each example, including expected inputs and outputs | High |  |
| FR10 | Allow users to chain multiple EAS interactions in a single workflow example | High | E.g., schema creation → attestation |

---

## Non-Functional Requirements

| ID | Requirement | Priority | Notes |
| :-- | :-- | :-- | :-- |
| NFR1 | Example scripts must be modular, readable, and maintainable | High |  |
| NFR2 | All scripts and documentation should be compatible with Copilot Agent mode for AI-assisted development | High |  |
| NFR3 | Scripts should include comments and logging for educational purposes | Medium |  |
| NFR4 | Example workflows should be easily extensible for additional geospatial use cases | Medium |  |

---

## Example Use Cases

1. **Impact Monitoring:**
Register the geospatial bounds of a conservation area, storing metadata on-chain as an attestation.
2. **Event Check-In:**
User checks into an event using a digital ticket; system records their geo-IP coordinates as part of the attestation.
3. **Geocaching Activity:**
User scans a QR code at a geocache location; the QR code contains geospatial metadata that is attested on-chain.

---

## User Stories Table

| User Story ID | Description | User Story | Expected Behavior/Outcome | Referenced Requirements |
| :-- | :-- | :-- | :-- | :-- |
| US001 | Register geospatial area | As a user, I want to register a geospatial area so that its bounds and metadata are verifiable on-chain. | The system creates a schema (if needed), validates input, and stores the attestation for the area. | FR1, FR4, FR5, FR6, FR9, FR10, NFR1, NFR2 |
| US002 | Event check-in with geo-IP | As a user, I want to check into an event and record my location so that my attendance is verifiable. | The system captures geo-IP, validates against schema, and stores the attestation. | FR2, FR4, FR5, FR6, FR9, FR10, NFR1, NFR2 |
| US003 | Geocaching QR code scan | As a user, I want to scan a QR code at a geocache so that my discovery is recorded with geospatial metadata. | The system decodes QR, validates metadata, and creates the attestation. | FR3, FR4, FR5, FR6, FR9, FR10, NFR1, NFR2 |
| US004 | Revoke invalid or outdated attestations | As a user, I want to revoke attestations that are no longer valid so that the blockchain reflects reality. | The system allows revocation of attestations and logs the action. | FR7, FR6, FR9, NFR1, NFR2 |
| US005 | Retrieve and view attestations | As a user, I want to retrieve and view attestations for a location or event so I can verify their details. | The system fetches attestations (on/off-chain) and displays them in a readable format. | FR6, FR9, NFR1, NFR2 |
| US006 | Chain multiple EAS interactions | As a user, I want to chain together multiple EAS actions so I can automate complex workflows. | The system supports flexible scripting and chaining of schema creation, attestation, retrieval, and revocation. | FR10, FR8, NFR1, NFR2 |

---

## Quality and Testing

- Each example script must be tested on at least one EVM testnet.
- Scripts should include input validation and error handling.
- Documentation must include instructions, sample inputs, and expected outputs.

---

## Glossary

- **Attestation:** A verifiable statement or claim stored via EAS.
- **Schema:** A data structure definition for attestations.
- **Geospatial Metadata:** Data describing a location (e.g., coordinates, area bounds).
- **Workflow Example:** A script demonstrating an end-to-end use case.

---

## Additional Notes

- Place this document in your project root or `/docs` for Copilot Agent context.
- Future phases may include UI integrations or more advanced geospatial analytics.

---
