# ProofMode EAS Integration Server

This server provides an HTTP API for processing ProofMode zip files and creating on-chain attestations with location and timestamp data using the Ethereum Attestation Service (EAS). Designed specifically for iOS ProofMode app integration.

## Features

- **HTTP API endpoint** for ProofMode ZIP file processing
- **iOS ProofMode app integration** with direct upload support
- Extracts location coordinates and timestamp data from ProofMode proof files
- Creates on-chain attestations with the extracted data
- Returns structured attestation data (UID, location, timestamp)

## Architecture Overview

This server builds upon the original [`workflow-proofmode.ts`](../../../src/workflows/workflow-proofmode.ts) standalone script to provide a real-time API for ProofMode processing. It accepts ProofMode zip uploads via HTTP and returns structured attestation data for seamless iOS app integration.

## Getting Started

### Prerequisites

- Node.js (v18.20.5 or later)
- Yarn package manager
- Ethereum Attestation Service configuration (configured in `.env` file)

### Installation

The server uses the existing dependencies from the EAS Sandbox project. No additional installation is required beyond the base project setup.

### Running the Server

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
  "timestamp": 1699123456789,
  "easUrl": "https://sepolia.easscan.org/attestation/view/0x2bc01261..."
}
```

## Integration Examples

### iOS ProofMode App
The server is designed to integrate directly with the ProofMode iOS app:
1. User captures content with location data
2. App creates ProofMode zip file
3. App sends HTTP POST to `/upload` endpoint
4. Server processes and returns attestation UID
5. App displays success with EAS verification link

### cURL Testing
For manual API testing:
```bash
curl -X POST http://localhost:3000/upload -F "proofmodeFile=@path/to/proofmode.zip"
```

## How It Works

1. **File Upload**: The server receives ProofMode ZIP files via HTTP using Multer middleware
2. **Extraction**: ZIP files are extracted to temporary directories for processing
3. **Data Processing**: Server parses `.proof.json` files to extract location and timestamp data
4. **Schema Registration**: Ensures the ProofMode schema is registered with EAS
5. **Attestation Creation**: Creates on-chain attestations with the extracted ProofMode data
6. **Cleanup**: Automatically removes temporary files after processing
7. **Response**: Returns attestation details (UID, location, timestamp) to the client

## File Structure

```
src/server/
├── server.ts                    # Express server with upload endpoint
├── workflow-proofmode-server.ts # Adapted workflow logic
└── README.md                    # This documentation
```

## Configuration

The server uses the following configuration:

- **ProofMode Schema**: 
  ```typescript
  schemaString: "string location, string locationType, uint64 timestamp, string[] proofs"
  ```
- **EAS Configuration**: From environment variables (`.env` file)
- **Network**: Sepolia testnet (configurable)
- **File Storage**: Temporary uploads in system temp directory

## Troubleshooting

- **Location data missing**: Ensure the ProofMode ZIP file contains proper `.proof.json` files with `Location.Latitude` and `Location.Longitude`
- **EAS configuration**: Check that your EAS configuration is correctly set up in the `.env` file
- **Gas issues**: Verify that you have sufficient gas for on-chain attestation creation
- **File upload**: Check that multipart form data uses field name `proofmodeFile`
