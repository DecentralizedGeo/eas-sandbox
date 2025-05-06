import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { ethers } from 'ethers';

// --- Unified Base Configuration Interface ---
// Includes all possible fields used across different example scripts.
export interface BaseConfig {
    // Schema related
    schemaUid?: string | null;       // For attestations, fetch, revoke
    schemaString?: string | null;    // Optional validation hint

    // Attestation data
    fields?: Record<string, any> | null; // For attestations
    recipient?: string | null;       // For attestations
    revocable?: boolean;             // For attestations, register-schema
    expirationTime?: bigint;         // For attestations (always converted to BigInt)
    referenceUid?: string | null;    // For attestations
    privateData?: any | null;        // For private attestations

    // Other identifiers
    attestationUid?: string | null;  // For get, revoke
    resolverAddress?: string | null; // For register-schema
    createPrivateData?: boolean; // Specify if attestation should be a private data object
    fieldsToDisclose?: string[] | null; // Specify which fields to disclose in the proof
}

// --- Default Values --- (Using more specific names to avoid conflicts)
const DEFAULT_CONFIG_SCHEMA_UID: string | null = null;
const DEFAULT_CONFIG_SCHEMA_STRING: string | null = null;
const DEFAULT_CONFIG_FIELDS: Record<string, any> | null = null;
const DEFAULT_CONFIG_RECIPIENT: string = ethers.ZeroAddress;
const DEFAULT_CONFIG_REVOCABLE: boolean = true;
const DEFAULT_CONFIG_EXPIRATION_TIME: bigint = 0n;
const DEFAULT_CONFIG_REF_UID: string = ethers.ZeroHash;
const DEFAULT_CONFIG_PRIVATE_DATA: any | null = null;
const DEFAULT_CONFIG_ATTESTATION_UID: string | null = null;
const DEFAULT_CONFIG_RESOLVER: string = ethers.ZeroAddress;
const DEFAULT_CONFIG_CREATE_PRIVATE_DATA: boolean = false; // Default to false for public attestations
const DEFAULT_CONFIG_FIELDS_TO_DISCLOSE: string[] | null = null; // Default to null for no fields to disclose

// --- Interface for the entire examples config file structure ---
// Values are now arrays of BaseConfig after processing.
export interface ExamplesConfig {
    [exampleName: string]: BaseConfig[];
}

/**
 * Loads and parses the specified YAML configuration file, applying default values.
 * @param configFilename The name of the config file (e.g., "examples.yaml") in the 'config' directory.
 * @returns The parsed and processed examples configuration object, or null if an error occurs.
 */
export function loadFullConfig(configFilename: string = "examples.yaml"): ExamplesConfig | null {
    const configDir = path.resolve(__dirname, '../../config');
    const filePath = path.join(configDir, configFilename);

    console.log(`Attempting to load configuration from: ${filePath}`);

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Error: Config file not found at ${filePath}`);
            return null;
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        // Load raw data from YAML
        const rawData = yaml.load(fileContents);

        if (typeof rawData !== 'object' || rawData === null) {
            console.error(`Error: Invalid config structure in ${configFilename}. Expected a top-level object.`);
            return null;
        }

        console.log(`Successfully loaded raw config file: ${configFilename}`);

        const processedConfig: ExamplesConfig = {};

        for (const scriptName in rawData) {
            if (!Object.prototype.hasOwnProperty.call(rawData, scriptName)) continue;
            const rawConfigsArray = (rawData as any)[scriptName];
            if (!Array.isArray(rawConfigsArray)) continue;

            processedConfig[scriptName] = rawConfigsArray.map((rawConfig: any) => {
                // If this config has an 'attestations' array, process each attestation
                if (Array.isArray(rawConfig.attestations)) {
                    return {
                        ...rawConfig,
                        attestations: rawConfig.attestations.map((att: any) => ({
                            schemaUid: att.schemaUid ?? DEFAULT_CONFIG_SCHEMA_UID,
                            schemaString: att.schemaString ?? DEFAULT_CONFIG_SCHEMA_STRING,
                            fields: att.fields ?? DEFAULT_CONFIG_FIELDS,
                            recipient: att.recipient ?? DEFAULT_CONFIG_RECIPIENT,
                            revocable: att.revocable ?? DEFAULT_CONFIG_REVOCABLE,
                            expirationTime: att.expirationTime !== undefined ? BigInt(att.expirationTime) : DEFAULT_CONFIG_EXPIRATION_TIME,
                            referenceUid: att.referenceUid ?? DEFAULT_CONFIG_REF_UID,
                            privateData: att.privateData ?? DEFAULT_CONFIG_PRIVATE_DATA,
                            attestationUid: att.attestationUid ?? DEFAULT_CONFIG_ATTESTATION_UID,
                            resolverAddress: att.resolverAddress ?? DEFAULT_CONFIG_RESOLVER,
                            createPrivateData: att.createPrivateData ?? DEFAULT_CONFIG_CREATE_PRIVATE_DATA,
                            fieldsToDisclose: att.fieldsToDisclose ?? DEFAULT_CONFIG_FIELDS_TO_DISCLOSE,
                        }))
                    };
                } else {
                    // Single attestation config (legacy/other scripts)
                    return {
                        schemaUid: rawConfig.schemaUid ?? DEFAULT_CONFIG_SCHEMA_UID,
                        schemaString: rawConfig.schemaString ?? DEFAULT_CONFIG_SCHEMA_STRING,
                        fields: rawConfig.fields ?? DEFAULT_CONFIG_FIELDS,
                        recipient: rawConfig.recipient ?? DEFAULT_CONFIG_RECIPIENT,
                        revocable: rawConfig.revocable ?? DEFAULT_CONFIG_REVOCABLE,
                        expirationTime: rawConfig.expirationTime !== undefined ? BigInt(rawConfig.expirationTime) : DEFAULT_CONFIG_EXPIRATION_TIME,
                        referenceUid: rawConfig.referenceUid ?? DEFAULT_CONFIG_REF_UID,
                        privateData: rawConfig.privateData ?? DEFAULT_CONFIG_PRIVATE_DATA,
                        attestationUid: rawConfig.attestationUid ?? DEFAULT_CONFIG_ATTESTATION_UID,
                        resolverAddress: rawConfig.resolverAddress ?? DEFAULT_CONFIG_RESOLVER,
                        createPrivateData: rawConfig.createPrivateData ?? DEFAULT_CONFIG_CREATE_PRIVATE_DATA,
                        fieldsToDisclose: rawConfig.fieldsToDisclose ?? DEFAULT_CONFIG_FIELDS_TO_DISCLOSE,
                    };
                }
            });
        }

        return processedConfig;

    } catch (error) {
        console.error(`Error loading or processing config file ${configFilename}:`, error);
        return null;
    }
}
