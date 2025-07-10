/* eslint-disable no-console */

import express, { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import cors from "cors";
import { createHeliaHTTP } from "@helia/http";
import { unixfs, UnixFS } from "@helia/unixfs";
import { fixedSize, rabin } from "ipfs-unixfs-importer/chunker";
import { balanced, flat } from "ipfs-unixfs-importer/layout";
import { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";
import { CID } from "multiformats/cid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Type definitions
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

interface CidGenerationOptions {
    cidVersion?: 0 | 1;
    chunker?: ChunkerOptions;
    layout?: LayoutOptions;
}

interface FileRequest extends Request {
    file?: Express.Multer.File;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increased from default 100kb to 50MB
app.use(express.static(path.join(__dirname, "public")));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5000 * 1024 * 1024, // 5000MB limit
        fieldSize: 10 * 1024 * 1024, // 10MB field size limit
    },
});

// Initialize Helia
let helia: Awaited<ReturnType<typeof createHeliaHTTP>>;
let heliaFs: UnixFS;

async function initHelia(): Promise<void> {
    helia = await createHeliaHTTP();
    heliaFs = unixfs(helia);
    console.log("Helia initialized");
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

// API endpoint to generate CID from uploaded file
app.post("/api/cid/file", upload.single("file") as any, async (req: FileRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        console.log(
            `Processing file: ${req.file.originalname} (${(
                req.file.size /
                1024 /
                1024
            ).toFixed(2)} MB)`
        );

        const options: CidGenerationOptions = JSON.parse(req.body.options || "{}");

        const importOptions = {
            chunker: parseChunkerOptions(
                options.chunker?.type,
                options.chunker?.options
            ),
            layout: parseLayoutOptions(options.layout?.type, options.layout?.options),
            cidVersion: options.cidVersion as 0 | 1 | undefined,
        };

        let cid: CID;

        // Handle CID version 0 specially - it requires dag-pb format
        if (options.cidVersion === 0) {
            // For CID v0, use addFile to get dag-pb format
            cid = await heliaFs.addFile(
                {
                    content: req.file.buffer,
                    path: req.file.originalname,
                },
                importOptions
            );
        } else {
            // Convert buffer to stream for v1
            const stream = Readable.from(req.file.buffer);
            cid = await heliaFs.addByteStream(stream, importOptions);
        }

        console.log(`Generated CID: ${cid.toString()}`);

        res.json({
            cid: cid.toString(),
            filename: req.file.originalname,
            size: req.file.size,
            options: importOptions,
        });
    } catch (error) {
        console.error("Error generating CID from file:", error);
        res.status(500).json({ error: "Failed to generate CID" });
    }
});

// Error handling middleware for Multer errors
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({
                error: `File too large. Maximum file size is 5000MB. Your file is ${(
                    Number(req.headers["content-length"]) /
                    1024 /
                    1024
                ).toFixed(2)}MB.`,
            });
            return;
        }
        res.status(400).json({ error: `Upload error: ${error.message}` });
        return;
    }
    next(error);
});

// API endpoint to generate CID from URL
app.post("/api/cid/url", async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, options = {} }: { url?: string; options?: CidGenerationOptions } = req.body;

        if (!url) {
            res.status(400).json({ error: "URL is required" });
            return;
        }

        // Fetch content from URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const importOptions = {
            chunker: parseChunkerOptions(
                options.chunker?.type,
                options.chunker?.options
            ),
            layout: parseLayoutOptions(options.layout?.type, options.layout?.options),
            cidVersion: options.cidVersion as 0 | 1 | undefined,
        };

        let cid: CID;

        // Handle CID version 0 specially - it requires dag-pb format
        if (options.cidVersion === 0) {
            // For CID v0, get the content as bytes and use addFile
            const arrayBuffer = await response.arrayBuffer();
            const content = new Uint8Array(arrayBuffer);

            cid = await heliaFs.addFile(
                {
                    content: content,
                    path: "url-content",
                },
                importOptions
            );
        } else {
            // Convert response to stream for v1
            if (!response.body) {
                throw new Error("Response body is null");
            }
            const stream = Readable.fromWeb(response.body as any);
            cid = await heliaFs.addByteStream(stream, importOptions);
        }

        res.json({
            cid: cid.toString(),
            url: url,
            contentType: response.headers.get("content-type"),
            options: importOptions,
        });
    } catch (error) {
        console.error("Error generating CID from URL:", error);
        res.status(500).json({ error: `Failed to generate CID: ${(error as Error).message}` });
    }
});

// API endpoint to generate CID from text
app.post("/api/cid/text", async (req: Request, res: Response): Promise<void> => {
    try {
        const { text, options = {} }: { text?: string; options?: CidGenerationOptions } = req.body;

        if (!text) {
            res.status(400).json({ error: "Text is required" });
            return;
        }

        console.log("=== CID Generation Debug ===");
        console.log("Raw options received:", options);
        console.log(
            "CID Version:",
            options.cidVersion,
            "Type:",
            typeof options.cidVersion
        );

        const importOptions = {
            chunker: parseChunkerOptions(
                options.chunker?.type,
                options.chunker?.options
            ),
            layout: parseLayoutOptions(options.layout?.type, options.layout?.options),
            cidVersion: options.cidVersion as 0 | 1 | undefined,
        };

        console.log("Import options:", importOptions);

        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        let cid: CID;

        // Handle CID version 0 specially - it requires dag-pb format
        if (options.cidVersion === 0) {
            console.log("Using addFile for CID v0");
            // For CID v0, we need to use addFile instead of addBytes to get dag-pb format
            cid = await heliaFs.addFile(
                {
                    content: bytes,
                    path: "text-content",
                },
                importOptions
            );
        } else {
            console.log("Using addBytes for CID v1");
            cid = await heliaFs.addBytes(bytes, importOptions);
        }

        console.log("Generated CID:", cid.toString());
        console.log("CID starts with Qm:", cid.toString().startsWith("Qm"));
        console.log("=== End Debug ===");

        res.json({
            cid: cid.toString(),
            textLength: text.length,
            options: importOptions,
        });
    } catch (error) {
        console.error("Error generating CID from text:", error);
        res.status(500).json({ error: "Failed to generate CID" });
    }
});

// Start server
async function start(): Promise<void> {
    await initHelia();
    app.listen(PORT, () => {
        console.log(`CID Generator webapp running on http://localhost:${PORT}`);
    });
}

start().catch(console.error);