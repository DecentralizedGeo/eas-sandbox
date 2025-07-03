# ProofMode EAS Integration

Connect [ProofMode iOS app](https://gitlab.com/guardianproject/proofmode/proofmode-ios/-/tree/2865bd9a1a4f3b4d757f6ed0cae45e75c1e6621f) with Ethereum Attestation Service (EAS) to create permanent blockchain attestations for location-verified media captures.

## 🎯 What This Integration Does

**[ProofMode](https://proofmode.org/)** generates cryptographic proofs when users capture photos/videos, including location data, device signatures, and timestamps. This integration adds blockchain permanence by creating **EAS attestations** that can be publicly verified.

**Key Benefits:**
- 🔗 **Permanent Records**: Location proofs stored on blockchain, not just device
- 🗄️ **Decentralized Storage**: Complete ProofMode packages uploaded to IPFS/Filecoin via Web3.Storage
- 🔍 **Public Verification**: Anyone can verify authenticity via EAS explorer and access original files via IPFS/Filecoin
- 📱 **Seamless Experience**: One-tap attestation creation from ProofMode share menu
- 🛡️ **Zero Breaking Changes**: All original ProofMode functionality preserved

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   # From eas-sandbox root directory
   yarn server:proofmode
   ```

2. **Use the iOS app:**
   - Capture media with ProofMode as usual
   - Tap share → "Create location attestation (EAS)"
   - View attestation on EAS blockchain explorer

## 🏗️ Architecture

The integration consists of two main components working together:

**iOS App Integration** → **HTTP Server** → **EAS Blockchain**

Built upon the original [`workflow-proofmode.ts`](../src/workflows/workflow-proofmode.ts), this system accepts ProofMode zip uploads via HTTP and returns structured attestation data.

### Workflow Overview

```mermaid
flowchart LR
    %% Column structure with vertical boxes and left-to-right flow between columns
    subgraph col1 ["ProofMode App"]
        direction TB
        A[📱 User captures media<br/>with ProofMode app]
        A --> B[📍 ProofMode generates<br/>cryptographic proofs]
        B --> C[📦 ProofMode creates<br/>zip file with proofs]
        C --> D(👤 User clicks<br/>'Create EAS attestation')
    end
    
    subgraph col2 ["HTTP & Server Processing"]
        direction TB
        E[📤 iOS sends HTTP POST<br/>to localhost:3000/upload]
        E --> F[🌐 Express server<br/>receives zip file]
        F --> G[📂 Server extracts<br/>zip to temp directory]
        G --> H[🔍 Parse .proof.json<br/>extract location data]
        H --> I[📤 Upload zip to<br/>IPFS/Filecoin via Web3.Storage]
    end
    
    subgraph col3 ["EAS Integration"]
        direction TB
        J[🔗 Check/Register<br/>ProofMode schema]
        J --> K[📝 Create attestation<br/>with location & IPFS CID]
        K --> L[⛓️ Submit on-chain<br/>attestation to EAS]
        L --> M[✅ Receive attestation<br/>UID from blockchain]
    end
    
    subgraph col4 ["Response & Actions"]
        direction TB
        N[📊 Server returns JSON<br/>with UID & EAS URL]
        N --> O[📱 iOS displays<br/>success alert]
        O --> P[👁️ View on EAS]
        O --> Q[📋 Copy UID]
        O --> R[🌐 Download Proof File]
    end
    
    %% Flow between columns (left to right connections)
    col1 --> col2
    col2 --> col3
    col3 --> col4
    
    %% Styling for columns
    style col1 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style col2 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style col3 fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    style col4 fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    
    classDef userAction fill:#e1f5fe,stroke:#01579b,stroke-width:1px
    classDef proofmode fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
    classDef integration fill:#fff3e0,stroke:#ef6c00,stroke-width:1px
    classDef server fill:#e8f5e8,stroke:#2e7d32,stroke-width:1px
    
    class A,B,C,D proofmode
    class E,F,G,H,I integration
    class J,K,L,M server
    class N,O,P,Q,R userAction
```

## 📁 Components

This integration has two main components:

### 📱 iOS Integration  
Modified ProofMode app with a new "Create location attestation (EAS)" button in the share menu. Zero breaking changes to original functionality.

**[→ iOS Implementation Details](ios/README.md)**

### 🌐 HTTP Server  
Express server that processes ProofMode zip files and creates EAS attestations. Provides RESTful API at `localhost:3000/upload`.

**[→ Server Implementation Details](server/README.md)**

## 🛠️ Technical Summary

**Data Flow:** ProofMode ZIP → HTTP API → IPFS/Filecoin Upload → EAS Blockchain → Response with attestation UID & IPFS CID  
**Storage:** Decentralized via Web3.Storage (IPFS/Filecoin)  
**Network:** Sepolia testnet (configurable)  
**Upstream Source:** [ProofMode iOS ActivityView.swift](https://gitlab.com/guardianproject/proofmode/proofmode-ios/-/blob/2865bd9a1a4f3b4d757f6ed0cae45e75c1e6621f/Proofmode/ActivityView.swift)