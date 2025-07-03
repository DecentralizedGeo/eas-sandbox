# ProofMode EAS Integration Server

HTTP server implementation that processes ProofMode zip files and creates blockchain attestations using the Ethereum Attestation Service (EAS).

> **📋 For integration overview, see the [Main README](../README.md)**

## Implementation

**Components:**
- **Express HTTP server** ([`server.ts`](server.ts)) - Handles multipart file uploads and CORS
- **ProofMode workflow processor** ([`workflow-proofmode-server.ts`](workflow-proofmode-server.ts)) - Extracts and processes proof data  
- **Web3.Storage integration** - Uploads complete ProofMode packages to IPFS/Filecoin for decentralized storage
- **EAS integration** - Creates blockchain attestations using existing EAS SDK

## Configuration

**EAS Schema:**
```typescript
schemaString: "string srs, string locationType, string location, uint8 specVersion, uint64 eventTimestamp, string memo, string recipeType, string[] recipePayload, string mediaData, string mediaType"
```

**Network:** Sepolia testnet (configurable via environment variables)  
**File Storage:** Temporary uploads in system temp directory, permanent storage on IPFS/Filecoin via Web3.Storage  
**Dependencies:** Uses existing EAS Sandbox project dependencies

## Prerequisites

- Node.js (v18.20.5 or later)
- Yarn package manager  
- Ethereum Attestation Service configuration (configured in `.env` file)
- **Web3.Storage credentials** (required for IPFS/Filecoin uploads):
  - `WEB3STORAGE_TOKEN`: Your Web3.Storage token for authentication
  - `WEB3STORAGE_PROOF`: Your Web3.Storage space delegation proof

## Installation & Running

The server uses the existing dependencies from the EAS Sandbox project. No additional installation is required beyond the base project setup.

```bash
# Start the ProofMode web server
yarn server:proofmode
```

The server will start at http://localhost:3000 by default.

## API Usage

### HTTP Endpoint
- **URL**: `POST /upload`
- **Content-Type**: `multipart/form-data`
- **Field name**: `proofmodeFile`
- **File type**: ProofMode ZIP files

### Example Response
```json
{
  "success": true,
  "message": "ProofMode data processed successfully",
  "attestationUID": "0x2bc01261...",
  "location": "40.7589,-73.9851",
  "timestamp": 1699123456,
  "easUrl": "https://sepolia.easscan.org/attestation/view/0x2bc01261..."
}
```

### Testing with cURL
```bash
curl -X POST http://localhost:3000/upload -F "proofmodeFile=@path/to/proofmode.zip"
```

## Troubleshooting

**Common Issues:**
- **Location data missing** - Ensure ProofMode ZIP contains proper `.proof.json` files with `Location.Latitude` and `Location.Longitude`
- **EAS configuration** - Check EAS configuration in `.env` file  
- **Gas issues** - Verify sufficient gas for on-chain attestation creation
- **File upload** - Check multipart form data uses field name `proofmodeFile`
