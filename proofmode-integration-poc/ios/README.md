# ProofMode iOS EAS Integration

iOS implementation details for the ProofMode EAS integration. This document covers the technical implementation, code changes, and usage instructions.

> **📋 For integration overview, see the [Main README](../README.md)**

## Implementation Overview

**File Modified:** [ProofMode iOS ActivityView.swift](https://gitlab.com/guardianproject/proofmode/proofmode-ios/-/blob/2865bd9a1a4f3b4d757f6ed0cae45e75c1e6621f/Proofmode/ActivityView.swift)

**Integration Approach:**
- **Zero Breaking Changes**: All original ProofMode functionality preserved
- **Purely Additive**: New EAS features added without modifying existing behavior
- **UI Consistency**: New elements follow existing ProofMode design patterns

## Prerequisites

- EAS server running at `localhost:3000` (see [Server Setup](../server/README.md))
- Modified ProofMode iOS app with EAS integration

## Implementation Details

#### 1. New Share Menu Option
```swift
// Added EAS attestation button to existing share menu
Button("Create location attestation (EAS)", action: {
    self.runWorkflow(zipUrl: url, items: shared.items)
})
```

#### 2. Core Integration Function
```swift
// New function to handle EAS workflow
private func runWorkflow(zipUrl: URL, items: [CameraItem]) {
    // HTTP request to localhost:3000/upload
    // Multipart form data with ProofMode zip
    // Success/error alert handling
}
```

#### 3. Alert Systems
```swift
// Success alert with blockchain explorer links
.alert("Attestation Created Successfully!", isPresented: $showSuccessAlert) {
    Button("View on EAS") { /* Opens EAS explorer */ }
    Button("Copy UID") { /* Copies attestation ID */ }
    Button("OK") { }
}

// Error alert for troubleshooting
.alert("Workflow Error", isPresented: $showErrorAlert) {
    Button("OK") { }
} message: {
    Text(errorMessage)
}
```

## Usage Guide

### User Workflow

1. **Capture Media** - Use ProofMode app normally to capture photos/videos with proofs
2. **Access Share Menu** - Navigate to activity view and select ProofMode item
3. **Create Attestation** - Tap "Create location attestation (EAS)" button
4. **View Results** - Success alert shows attestation UID with options to view on EAS or copy UID

### Error Handling

**Common Errors:**
- `Network error` - EAS server not running (start with `yarn server:proofmode`)
- `Server returned error: 500` - Server-side processing error (check server logs)
- `Failed to parse server response` - Server compatibility issue

**Debugging:** Check Xcode Console for detailed error messages and network logs

## Development Notes

**Testing:** Mock URLSession for unit tests, requires running EAS server for integration tests  
**Performance:** Asynchronous network requests with proper main thread UI updates  
**Security:** Local network only (localhost:3000), no credentials stored in iOS app
