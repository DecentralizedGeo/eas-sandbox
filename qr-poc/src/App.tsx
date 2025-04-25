/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import './App.css';

// Import helpers
import { SCHEMA_UID } from './lib/config';
import { createOnChainAttestation, OnChainAttestationData } from './lib/eas-attestation';

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

const MOCK_QR_DATA = '[28.3772, 81.5707]'

function App() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [attestationUID, setAttestationUID] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const connectAndAttest = async () => {
      setError(null);
      setLoading(true);
      setAttestationUID(null);
      setTransactionHash(null);

      if (typeof window.ethereum === 'undefined') {
        setError("MetaMask is not installed. Please install it to use this app.");
        setLoading(false);
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        if (!window.ethereum || !window.ethereum.isMetaMask) {
          throw new Error("MetaMask is not installed. Please install it to use this app.");
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (!accounts || accounts.length === 0) {
          throw new Error("MetaMask connection declined or no accounts found.");
        }
        const currentSigner = await provider.getSigner();
        setSigner(currentSigner);
        console.log("Connected account:", currentSigner.address);

        // Ensure connected to Sepolia (Chain ID 11155111)
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(11155111)) {
          setError("Please connect MetaMask to the Sepolia network.");
          setLoading(false);
          return; // Stop if not on Sepolia and not attempting/successful switch
        }

        // Prepare attestation data
        const time = new Date();
        const qrDataParsed = JSON.parse(MOCK_QR_DATA);

        // Create attestation data object following the OnChainAttestationData interface
        const attestationData: OnChainAttestationData = {
          recipient: currentSigner.address,
          expirationTime: NO_EXPIRATION,
          revocable: true,
          schemaUID: SCHEMA_UID,
          schemaString: "string lat, string long, string id, string timestamp",
          dataToEncode: [
            { name: "lat", value: qrDataParsed[0].toString(), type: "string" },
            { name: "long", value: qrDataParsed[1].toString(), type: "string" },
            { name: "id", value: (Math.random() * 1000).toString(), type: "string" },
            { name: "timestamp", value: time.toISOString(), type: "string" }
          ]
        };

        const newAttestationUID = await createOnChainAttestation(currentSigner, attestationData);

        setAttestationUID(newAttestationUID);
      } catch (err: any) {
        console.error("Error during attestation:", err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    connectAndAttest();
  }, []);
  
  return (
    <div className="root">
      <h1>EAS QR Attestation</h1>
      {loading && <p>Processing... Check MetaMask.</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {transactionHash && !attestationUID && <p>Transaction Sent: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">{transactionHash}</a> (Waiting for confirmation...)</p>}
      {attestationUID && (
        <div>
          <p>Attestation Successful!</p>
          <p>Attestation UID: {attestationUID}</p>
          <p>
            <a href={`https://sepolia.easscan.org/attestation/view/${attestationUID}`} target="_blank" rel="noopener noreferrer">
              View on EAS Scan
            </a>
          </p>
          <p>
            <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">
              View Transaction on Etherscan
            </a>
          </p>
        </div>
      )}
      {!loading && !attestationUID && !error && <p>Connecting to MetaMask and preparing attestation...</p>}
    </div>
  );
}

export default App;
