/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { EAS, SchemaEncoder, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import './App.css';

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

const SCHEMA_UID = "0x1893a6a17c2621355f1912a37fc3918057e41e8534b3fa56963ceafffdce49bf"
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


        // 2. Initialize EAS
        const eas = new EAS("0xC2679fBD37d54388Ce493F1DB75320D236e1815e");
        eas.connect(currentSigner);

        // 3. Prepare Attestation Data
        const time = new Date();
        const qrDataParsed = JSON.parse(MOCK_QR_DATA); // Use actual QR data here

        const schemaEncoder = new SchemaEncoder("string lat, string long, string id, string timestamp");
        const encodedData = schemaEncoder.encodeData([
          { name: "lat", value: qrDataParsed[0].toString(), type: "string" },
          { name: "long", value: qrDataParsed[1].toString(), type: "string" },
          { name: "id", value: (Math.random() * 1000).toString(), type: "string" },
          { name: "timestamp", value: time.toISOString(), type: "string" } // Use ISO string for consistency
        ]);

        console.log(
          `Creating attestation with schema UID: ${SCHEMA_UID}, data: ${encodedData}`
        );

        // 4. Create Attestation (MetaMask will prompt for signature)
        const tx = await eas.attest({
          schema: SCHEMA_UID,
          data: {
            recipient: currentSigner.address, // Attest to self or specify recipient
            expirationTime: NO_EXPIRATION,
            revocable: true,
            data: encodedData,
          }
        });

        console.log("Transaction sent:", tx.receipt?.hash);
        setTransactionHash(tx.receipt?.hash || null);

        // 5. Wait for Transaction Confirmation
        const newAttestationUID = await tx.wait();
        console.log("Attestation created with UID:", newAttestationUID);
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
