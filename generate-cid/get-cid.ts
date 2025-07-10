import { createHeliaHTTP } from "@helia/http";
import { unixfs } from "@helia/unixfs";
import { fixedSize, rabin } from "ipfs-unixfs-importer/chunker";
import { balanced, flat } from "ipfs-unixfs-importer/layout";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

interface ChunkerOptions {
    type: string;
    options?: {
        chunkSize?: number;
        avgChunkSize?: number;
        minChunkSize?: number;
        maxChunkSize?: number;
    };
}

interface LayoutOptions {
    type: string;
    options?: {
        maxChildrenPerNode?: number;
    };
}

// Parse chunker options
function parseChunkerOptions(type?: string, options: ChunkerOptions['options'] = {}) {
    switch (type) {
        case "fixed":
            return fixedSize({
                chunkSize: options.chunkSize || 1048576, // 1MB default
            });
        case "rabin":
            return rabin({
                avgChunkSize: options.avgChunkSize || 1048576,
                minChunkSize: options.minChunkSize || 524288,
                maxChunkSize: options.maxChunkSize || 2097152,
            });
        default:
            return fixedSize({ chunkSize: 1048576 });
    }
}

// Parse layout options
function parseLayoutOptions(type?: string, options: LayoutOptions['options'] = {}) {
    switch (type) {
        case "balanced":
            return balanced({
                maxChildrenPerNode: options.maxChildrenPerNode || 1024,
            });
        case "flat":
            return flat();
        default:
            return balanced({ maxChildrenPerNode: 1024 });
    }
}

// Function to generate a CID for a file or text content and returns the CID as a string.
// Expected input can be a file path, or text content in a string format.
// The function will default to CID version 1 for all inputs. A user can also manually specify how the content should be hashed by passing in a dictionary of options.
export async function getCID(
    content: string | Buffer,
    options: {
        chunker?: "fixed" | "rabin";
        chunkSize?: number;
        layout?: "balanced" | "flat";
    } = {}
): Promise<string> {
    const helia = await createHeliaHTTP();
    const fs = unixfs(helia);

    // Parse chunker and layout options
    const chunker = parseChunkerOptions(options.chunker, {
        chunkSize: options.chunkSize,
    });
    const layout = parseLayoutOptions(options.layout);

    const importOptions = {
        chunker,
        layout
    }
    const contentStream = Buffer.isBuffer(content)
        ? Readable.from(content)
        : Readable.from([content]);
    const cid = await fs.addByteStream(contentStream, importOptions);
    await helia.stop();
    return cid.toString();
}

// CLI functionality
interface CLIOptions {
    chunker?: "fixed" | "rabin";
    chunkSize?: number;
    avgChunkSize?: number;
    minChunkSize?: number;
    maxChunkSize?: number;
    layout?: "balanced" | "flat";
    maxChildrenPerNode?: number;
    help?: boolean;
}

function printHelp() {
    console.log(`
Usage: npm run get-cid [options] <input>

Arguments:
  <input>                   File path or text content to generate CID for

Options:
  --chunker <type>          Chunker type: "fixed" or "rabin" (default: fixed)
  --chunk-size <size>       Chunk size in bytes for fixed chunker (default: 1048576)
  --avg-chunk-size <size>   Average chunk size for rabin chunker (default: 1048576)
  --min-chunk-size <size>   Minimum chunk size for rabin chunker (default: 524288)
  --max-chunk-size <size>   Maximum chunk size for rabin chunker (default: 2097152)
  --layout <type>           Layout type: "balanced" or "flat" (default: balanced)
  --max-children <num>      Max children per node for balanced layout (default: 1024)
  --help, -h                Show this help message

Examples:
  npm run get-cid "Hello, world!"
  npm run get-cid ./path/to/file.txt
  npm run get-cid --chunker rabin --avg-chunk-size 512000 "Large content"
  npm run get-cid --layout flat ./image.jpg
`);
}

function parseArguments(args: string[]): { input: string; options: CLIOptions } {
    const options: CLIOptions = {};
    let input = "";

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--help":
            case "-h":
                options.help = true;
                break;
            case "--chunker":
                options.chunker = args[++i] as "fixed" | "rabin";
                break;
            case "--chunk-size":
                options.chunkSize = parseInt(args[++i]);
                break;
            case "--avg-chunk-size":
                options.avgChunkSize = parseInt(args[++i]);
                break;
            case "--min-chunk-size":
                options.minChunkSize = parseInt(args[++i]);
                break;
            case "--max-chunk-size":
                options.maxChunkSize = parseInt(args[++i]);
                break;
            case "--layout":
                options.layout = args[++i] as "balanced" | "flat";
                break;
            case "--max-children":
                options.maxChildrenPerNode = parseInt(args[++i]);
                break;
            default:
                if (!arg.startsWith("--") && !input) {
                    input = arg;
                }
                break;
        }
    }

    return { input, options };
}

async function getCIDFromFile(filePath: string, options: CLIOptions): Promise<string> {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    console.log(`Processing file: ${fileName}`);
    console.log(`File size: ${fileContent.length} bytes`);

    return getCID(fileContent, {
        chunker: options.chunker,
        chunkSize: options.chunkSize || options.avgChunkSize,
        layout: options.layout
    });
}

async function main() {
    const args = process.argv.slice(2);
    const { input, options } = parseArguments(args);

    if (options.help || !input) {
        printHelp();
        process.exit(options.help ? 0 : 1);
    }

    try {
        let cid: string;

        // Check if input is a file path or text content
        if (fs.existsSync(input)) {
            cid = await getCIDFromFile(input, options);
        } else {
            console.log(`Processing text content (${input.length} characters)`);
            cid = await getCID(input, {
                chunker: options.chunker,
                chunkSize: options.chunkSize || options.avgChunkSize,
                layout: options.layout
            });
        }

        console.log(`\nGenerated CID: ${cid}`);

        // Display options used
        console.log("\nOptions used:");
        console.log(`  Chunker: ${options.chunker || "fixed"}`);
        if (options.chunker === "rabin") {
            console.log(`  Avg chunk size: ${options.avgChunkSize || 1048576} bytes`);
            console.log(`  Min chunk size: ${options.minChunkSize || 524288} bytes`);
            console.log(`  Max chunk size: ${options.maxChunkSize || 2097152} bytes`);
        } else {
            console.log(`  Chunk size: ${options.chunkSize || 1048576} bytes`);
        }
        console.log(`  Layout: ${options.layout || "balanced"}`);

    } catch (error) {
        console.error("Error generating CID:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Run CLI if this file is executed directly
// Fix for Windows path handling
const isMainModule = () => {
    if (typeof import.meta.url === 'undefined') return false;

    const currentFile = import.meta.url;
    const mainFile = `file://${process.argv[1].replace(/\\/g, '/')}`;

    // Also check if this file is being run directly
    return currentFile === mainFile || process.argv[1].includes('get-cid.ts');
};

if (isMainModule()) {
    console.log('Starting CID generation...');
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
