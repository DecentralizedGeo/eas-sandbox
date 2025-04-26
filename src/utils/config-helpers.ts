import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { ethers } from 'ethers'; // Import ethers for default values

// Interface for a single attestation configuration within an example/workflow
export interface AttestationConfig {
    schemaUid: string;
    schemaString?: string; // Optional, but useful for validation
    fields: Record<string, any>; // Key-value pairs for schema fields
    revocable?: boolean; // Default: true
    expirationTime?: bigint //| number | string; // Allow various inputs, convert later
    recipient?: string; // Default: ethers.ZeroAddress
    referenceUid?: string; // Optional
    privateData?: any; // Placeholder for private data structure
    // Add other common fields as needed
}

// New Interface for RegisterSchema
export interface RegisterSchemaConfig {
    schema: string;
    resolverAddress?: string;
    revocable: boolean; // Make required for clarity in config
}

// New Interface for FetchSchema
export interface FetchSchemaConfig {
    schemaUid: string;
}

// New Interface for GetAttestation
export interface GetAttestationConfig {
    attestationUid: string;
}

// New Interface for RevokeAttestation
export interface RevokeAttestationConfig {
    schemaUid: string;
    attestationUid: string;
}

// Interface for the entire examples config file structure
// Keys are example script names (e.g., "create-onchain-attestation")
export interface ExamplesConfig {
    [exampleName: string]: any[];
}

/** Default values for attestation config */
const DEFAULT_REVOCABLE = true;
const DEFAULT_EXPIRATION_TIME = 0n; // Use BigInt for consistency
const DEFAULT_RECIPIENT = ethers.ZeroAddress;
const DEFAULT_REF_UID = ethers.ZeroHash;
const DEFAULT_RESOLVER = ethers.ZeroAddress; // Default for schema registration

/**
 * Loads and parses the examples YAML configuration file.
 * @param configFilename The name of the config file (e.g., "examples.yaml") in the 'config' directory.
 * @returns The parsed examples configuration object, or null if an error occurs.
 */
function loadFullConfig(configFilename: string): ExamplesConfig | null {
    const configDir = path.resolve(__dirname, '../../config'); // Updated directory name
    const filePath = path.join(configDir, configFilename);

    console.log(`Attempting to load configuration from: ${filePath}`);

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Error: Config file not found at ${filePath}`);
            return null;
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContents);

        // Basic validation (can be expanded)
        if (typeof data !== 'object' || data === null) {
            console.error(`Error: Invalid config structure in ${configFilename}. Expected a top-level object.`);
            return null;
        }

        console.log(`Successfully loaded and parsed config file: ${configFilename}`);
        // TODO: Add more robust validation/parsing for specific fields (e.g., BigInt conversion for expirationTime)
        return data as ExamplesConfig;

    } catch (error) {
        console.error(`Error loading or parsing config file ${configFilename}:`, error);
        return null;
    }
}

/**
 * Loads the configuration for a specific example script from the examples.yaml file.
 * Applies default values for optional fields.
 * @param exampleScriptName The name of the script (e.g., "create-onchain-attestation").
 * @returns An array of AttestationConfig objects for the specified script, or null if not found or error.
 */
export function loadExampleConfig(exampleScriptName: string): AttestationConfig[] | null {
    const fullConfig = loadFullConfig("examples.yaml");

    if (!fullConfig || !(exampleScriptName in fullConfig)) {
        console.error(`Error: Configuration for example "${exampleScriptName}" not found in examples.yaml.`);
        return null;
    }

    const configs = fullConfig[exampleScriptName];

    // Apply defaults and perform basic type conversions/validations
    return configs.map((config, index) => {
        // Basic validation
        if (!config.schemaUid || typeof config.schemaUid !== 'string') {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'schemaUid'.`);
        }
        if (!config.fields || typeof config.fields !== 'object') {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'fields'.`);
        }

        // Convert expirationTime to BigInt
        let expirationTimeBigInt: bigint;
        if (config.expirationTime === undefined || config.expirationTime === null) {
            expirationTimeBigInt = DEFAULT_EXPIRATION_TIME;
        } else {
            try {
                expirationTimeBigInt = BigInt(config.expirationTime);
            } catch (e) {
                throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Invalid 'expirationTime' value: ${config.expirationTime}. Must be convertible to BigInt.`);
            }
        }

        return {
            ...config, // Keep original fields
            revocable: config.revocable ?? DEFAULT_REVOCABLE,
            expirationTime: expirationTimeBigInt,
            recipient: config.recipient ?? DEFAULT_RECIPIENT,
            referenceUid: config.referenceUid ?? DEFAULT_REF_UID,
            // Ensure fields is present (already checked above)
            fields: config.fields,
        };
    });
}

/**
 * Loads the configuration for the register-schema example script.
 * @param exampleScriptName The name of the script ("register-schema").
 * @returns An array of RegisterSchemaConfig objects, or null if not found or error.
 */
export function loadRegisterSchemaConfig(exampleScriptName: string = "register-schema"): RegisterSchemaConfig[] | null {
    const fullConfig = loadFullConfig("examples.yaml");
    if (!fullConfig || !(exampleScriptName in fullConfig)) {
        console.error(`Error: Configuration for example "${exampleScriptName}" not found in examples.yaml.`);
        return null;
    }
    const configs = fullConfig[exampleScriptName];

    return configs.map((config: any, index: number) => {
        if (!config.schema || typeof config.schema !== 'string') {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'schema'.`);
        }
        if (typeof config.revocable !== 'boolean') {
            console.warn(`Validation Warning in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'revocable', defaulting to ${DEFAULT_REVOCABLE}.`);
        }

        return {
            schema: config.schema,
            revocable: config.revocable ?? DEFAULT_REVOCABLE,
            resolverAddress: config.resolverAddress ?? DEFAULT_RESOLVER,
        };
    });
}

/**
 * Loads the configuration for the fetch-schema example script.
 * @param exampleScriptName The name of the script ("fetch-schema").
 * @returns An array of FetchSchemaConfig objects, or null if not found or error.
 */
export function loadFetchSchemaConfig(exampleScriptName: string = "fetch-schema"): FetchSchemaConfig[] | null {
    const fullConfig = loadFullConfig("examples.yaml");
    if (!fullConfig || !(exampleScriptName in fullConfig)) {
        console.error(`Error: Configuration for example "${exampleScriptName}" not found in examples.yaml.`);
        return null;
    }
    const configs = fullConfig[exampleScriptName];

    return configs.map((config: any, index: number) => {
        if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'schemaUid'.`);
        }
        return {
            schemaUid: config.schemaUid,
        };
    });
}

/**
 * Loads the configuration for the get-attestation example script.
 * @param exampleScriptName The name of the script ("get-attestation").
 * @returns An array of GetAttestationConfig objects, or null if not found or error.
 */
export function loadGetAttestationConfig(exampleScriptName: string = "get-attestation"): GetAttestationConfig[] | null {
    const fullConfig = loadFullConfig("examples.yaml");
    if (!fullConfig || !(exampleScriptName in fullConfig)) {
        console.error(`Error: Configuration for example "${exampleScriptName}" not found in examples.yaml.`);
        return null;
    }
    const configs = fullConfig[exampleScriptName];

    return configs.map((config: any, index: number) => {
        if (!config.attestationUid || typeof config.attestationUid !== 'string' || !config.attestationUid.startsWith('0x') || config.attestationUid === ethers.ZeroHash) {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'attestationUid'. Please replace the placeholder value.`);
        }
        return {
            attestationUid: config.attestationUid,
        };
    });
}

/**
 * Loads the configuration for the revoke-attestation example script.
 * @param exampleScriptName The name of the script ("revoke-attestation").
 * @returns An array of RevokeAttestationConfig objects, or null if not found or error.
 */
export function loadRevokeAttestationConfig(exampleScriptName: string = "revoke-attestation"): RevokeAttestationConfig[] | null {
    const fullConfig = loadFullConfig("examples.yaml");
    if (!fullConfig || !(exampleScriptName in fullConfig)) {
        console.error(`Error: Configuration for example "${exampleScriptName}" not found in examples.yaml.`);
        return null;
    }
    const configs = fullConfig[exampleScriptName];

    return configs.map((config: any, index: number) => {
        if (!config.schemaUid || typeof config.schemaUid !== 'string' || !config.schemaUid.startsWith('0x')) {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'schemaUid'.`);
        }
        if (!config.attestationUid || typeof config.attestationUid !== 'string' || !config.attestationUid.startsWith('0x') || config.attestationUid === ethers.ZeroHash) {
            throw new Error(`Validation Error in examples.yaml for ${exampleScriptName}[${index}]: Missing or invalid 'attestationUid'. Please replace the placeholder value.`);
        }
        return {
            schemaUid: config.schemaUid,
            attestationUid: config.attestationUid,
        };
    });
}
