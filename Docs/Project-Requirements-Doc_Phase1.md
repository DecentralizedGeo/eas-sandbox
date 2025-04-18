# Project Requirements Document

**Project Title:**  
Modular EAS SDK Sandbox

**Author:**  
Seth Docherty

**Date:**  
2025-04-17

**Version:**  
0.1

---

## Introduction

This document defines the requirements for a modular TypeScript package designed to facilitate rapid experimentation with the [Ethereum Attestation Service (EAS)](https://docs.attest.org/docs/welcome) SDK. The package aims to provide developers with flexible, composable functions for interacting with EAS, allowing for quick prototyping and testing of attestation workflows. The intended environment is a VSCode workspace, with support for Copilot Agent mode to enable AI-assisted development and automation[7][10].

---

## General Description

- **Purpose:**  
  Provide a developer-friendly, modular toolkit for interacting with EAS, enabling easy creation, referencing, and management of attestations and schemas, both on-chain and off-chain.

- **Scope:**  
  - TypeScript package, managed with `yarn`
  - Designed for EVM-compatible testnets (e.g., Sepolia)
  - Focus on developer experience and composability

- **Stakeholders:**  
  - Primary: Developers exploring EAS capabilities
  - Secondary: Project maintainers, open-source contributors

- **Technical Dependencies:**  
  - Node.js and TypeScript
  - `@ethereum-attestation-service/eas-sdk`[6]
  - Ethers.js or similar for wallet and provider management
  - Yarn for dependency management

- **Constraints:**  
  - Requires user wallet address with test ether
  - Requires RPC API key for blockchain access

---

## Functional Requirements

| ID   | Requirement                                                                                               | Priority | Notes                                      |
|------|----------------------------------------------------------------------------------------------------------|----------|---------------------------------------------|
| FR1  | Provide composable functions for creating new attestations                                               | High     | Both on-chain and off-chain support         |
| FR2  | Enable referencing and modifying existing attestations                                                   | High     |                                            |
| FR3  | Support creation of new schemas and referencing/modifying existing schemas                               | High     |                                            |
| FR4  | Allow storage and retrieval of off-chain attestations                                                    | Medium   |                                            |
| FR5  | Expose functions with minimal coupling for maximum flexibility                                           | High     | Each function should be independently usable|
| FR6  | Enable users to write simple example scripts using one or more composable functions                      | High     | Example: create attestation, then reference |
| FR7  | Provide clear error handling and feedback for blockchain interactions                                    | Medium   |                                            |
| FR8  | Document each function with usage examples and expected inputs/outputs                                   | High     |                                            |

---

## Non-Functional Requirements

| ID   | Requirement                                                                                               | Priority | Notes                                      |
|------|----------------------------------------------------------------------------------------------------------|----------|---------------------------------------------|
| NFR1 | Codebase must be modular and maintainable                                                                | High     |                                            |
| NFR2 | Functions should be well-documented and typed                                                            | High     | Leverage TypeScript interfaces/types        |
| NFR3 | Package should be easily extensible for additional EAS features                                          | Medium   |                                            |
| NFR4 | Should be compatible with Copilot Agent mode for AI-driven code generation and editing in VSCode         | High     | Place this document in project root or `/docs` for context[7][10] |

---

## Assumptions

- Users have a funded wallet address and access to a testnet (e.g., Sepolia)[9].
- Users possess an RPC API key for the relevant network.
- Users have basic familiarity with TypeScript, Node.js, and blockchain concepts.

---

## Example Use Cases

- Create a new schema, then make an attestation against it.
- Reference an existing attestation and update or revoke it.
- Store an attestation off-chain and retrieve it later.
- Combine multiple functions in a script to demonstrate a typical attestation workflow.

## User Stories Table

| User Story ID | Description | User Story | Expected Behavior/Outcome | Referenced Requirements |
| :-- | :-- | :-- | :-- | :-- |
| US001 | Create a new attestation | As a user, I want to create a new attestation so that I can record a verifiable claim on the blockchain. | The system allows the user to input attestation data, signs and submits it, and returns the attestation ID. | FR1, FR5, FR7, FR8, NFR1, NFR2 |
| US002 | Reference existing attestation | As a user, I want to reference an existing attestation so that I can build upon or verify previous claims. | The system retrieves and displays attestation details given an attestation ID. | FR2, FR5, FR7, FR8, NFR1, NFR2 |
| US003 | Create a new schema | As a user, I want to create a new schema so that I can define the structure for future attestations. | The system allows the user to define schema fields and deploys the schema to the blockchain, returning its ID. | FR3, FR5, FR7, FR8, NFR1, NFR2 |
| US004 | Modify an existing schema | As a user, I want to modify an existing schema so that I can update data structures as my requirements change. | The system enables schema updates and propagates changes, ensuring backward compatibility where possible. | FR3, FR5, FR7, FR8, NFR1, NFR2 |
| US005 | Store attestation off-chain | As a user, I want to store an attestation off-chain so that I can save costs and preserve privacy. | The system saves the attestation data in a secure off-chain storage and provides a reference or proof. | FR4, FR5, FR8, NFR1, NFR2 |
| US006 | Retrieve off-chain attestation | As a user, I want to retrieve an off-chain attestation so that I can verify or use its data. | The system fetches the off-chain attestation using a reference and displays its contents. | FR4, FR5, FR8, NFR1, NFR2 |
| US007 | Compose workflows using multiple functions | As a user, I want to compose workflows using multiple functions so that I can automate complex EAS tasks. | The system allows chaining of modular functions, enabling users to script multi-step attestation processes. | FR5, FR6, FR8, NFR1, NFR2 |
| US008 | Handle errors and provide feedback | As a user, I want clear error messages and feedback so that I can quickly resolve issues during operations. | The system displays descriptive errors for failed actions and suggests possible resolutions. | FR7, FR8, NFR1, NFR2 |
| US009 | Use example scripts for onboarding | As a user, I want example scripts so that I can quickly learn how to use the package’s core features. | The system provides ready-to-run scripts demonstrating typical use cases with documentation. | FR6, FR8, NFR1, NFR2 |
| US010 | Integrate with Copilot Agent mode | As a user, I want the package to be compatible with Copilot Agent mode so that I can leverage AI assistance. | The system ensures documentation and code structure are optimized for Copilot Agent context extraction. | NFR4, NFR1, NFR2 |

---

## Quality and Testing

- Each function must include unit tests covering expected and edge-case behaviors.
- Example scripts should be provided and verified to work on at least one EVM testnet.
- Error messages must be descriptive and actionable.

---

## Additional Notes

- Place this document in the project root or `/docs` folder to maximize Copilot Agent mode context[7][10].
- Future enhancements may include UI components or integration with other EAS ecosystem tools.

---

## Glossary

- **Attestation:** A verifiable statement or claim recorded on-chain or off-chain via EAS.
- **Schema:** A template defining the data structure for attestations.
- **Composable Function:** A function designed to be combined with others to form complex workflows with minimal dependencies.

---

Let me know if you would like to clarify or expand on any section, such as specific workflows, supported networks, or error handling expectations.

Citations:
[1] https://www.epicflow.com/blog/how-to-compile-a-project-requirements-document/
[2] https://www.smartsheet.com/content/project-requirements
[3] https://www.brightwork.com/blog/project-requirements
[4] https://www.atlassian.com/agile/product-management/requirements
[5] https://formlabs.com/blog/product-requirements-document-prd-with-template/
[6] https://github.com/ethereum-attestation-service/eas-sdk
[7] https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode
[8] https://asana.com/resources/business-requirements-document-template
[9] https://classic.yarnpkg.com/en/package/@ethereum-attestation-service/eas-contracts
[10] https://www.youtube.com/watch?v=XnC6cF1v5OY
[11] https://qracorp.com/guides_checklists/use-the-most-common-requirements-documents/
[12] https://www.youtube.com/watch?v=EsGOvBIo-Mo
[13] https://www.youtube.com/watch?v=pUK7MRzoTDc
[14] https://www.projectmanager.com/blog/great-project-documentation
[15] https://community.flutterflow.io/ask-the-community/post/how-to-use-a-sdk-that-is-written-in-typescript-javascript-in-flutterflow-LeXKQpGgVp2ClrL
[16] https://code.visualstudio.com/blogs/2025/02/24/introducing-copilot-agent-mode
[17] https://clickup.com/blog/project-requirements/
[18] https://github.com/ethereum-attestation-service
[19] https://www.youtube.com/watch?v=pXSCfpnC1hQ
[20] https://www.reddit.com/r/ProductManagement/comments/16isvyp/how_to_write_a_proper_plain_requirements/
[21] https://docs.attest.org/docs/category/tutorials
[22] https://docs.attest.org/docs/developer-tools/eas-sdk

---
Answer from Perplexity: pplx.ai/share