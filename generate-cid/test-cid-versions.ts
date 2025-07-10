/* eslint-disable no-console */

import { createHeliaHTTP } from "@helia/http";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";

async function testCidVersions(): Promise<void> {
    const helia = await createHeliaHTTP();
    const fs = unixfs(helia);

    const testText = "Hello, CID version test!";
    const encoder = new TextEncoder();
    const bytes = encoder.encode(testText);

    console.log("Testing CID versions with text:", testText);
    console.log("=====================================");

    // Test CID version 0 using addFile (proper way)
    try {
        const cidV0: CID = await fs.addFile(
            {
                content: bytes,
                path: "test-content",
            },
            {
                cidVersion: 0 as const,
            }
        );
        console.log("CID v0 (using addFile):", cidV0.toString());
        console.log("CID v0 starts with 'Qm':", cidV0.toString().startsWith("Qm"));
        console.log("CID v0 length:", cidV0.toString().length);
    } catch (error) {
        console.log("CID v0 error:", (error as Error).message);
    }

    // Test CID version 0 using addBytes (problematic way)
    try {
        const cidV0Raw: CID = await fs.addBytes(bytes, { cidVersion: 0 as const });
        console.log("CID v0 (using addBytes):", cidV0Raw.toString());
        console.log(
            "CID v0 raw starts with 'Qm':",
            cidV0Raw.toString().startsWith("Qm")
        );
    } catch (error) {
        console.log("CID v0 raw error:", (error as Error).message);
    }

    // Test CID version 1
    try {
        const cidV1: CID = await fs.addBytes(bytes, { cidVersion: 1 as const });
        console.log("CID v1:", cidV1.toString());
        console.log(
            "CID v1 starts with 'baf':",
            cidV1.toString().startsWith("baf")
        );
    } catch (error) {
        console.log("CID v1 error:", (error as Error).message);
    }

    await helia.stop();
}

testCidVersions().catch(console.error);