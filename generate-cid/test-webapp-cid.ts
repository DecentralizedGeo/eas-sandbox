/* eslint-disable no-console */

import { createHeliaHTTP } from "@helia/http";
import { unixfs } from "@helia/unixfs";
import { CID } from "multiformats/cid";

interface TestCase {
    cidVersion: 0 | 1;
    description: string;
}

async function testWebappCidVersions(): Promise<void> {
    const helia = await createHeliaHTTP();
    const fs = unixfs(helia);

    const testText = "Hello World";
    const encoder = new TextEncoder();
    const bytes = encoder.encode(testText);

    console.log("Testing CID versions for webapp functionality:");
    console.log("==============================================");

    // Test the exact same logic as our webapp server
    const testCases: TestCase[] = [
        { cidVersion: 0, description: "Version 0" },
        { cidVersion: 1, description: "Version 1" },
    ];

    for (const testCase of testCases) {
        console.log(`\nTesting ${testCase.description}:`);
        console.log(
            `cidVersion: ${testCase.cidVersion} (type: ${typeof testCase.cidVersion})`
        );

        try {
            let cid: CID;

            // Replicate the server logic exactly
            if (testCase.cidVersion === 0) {
                console.log("Using addFile for CID v0");
                cid = await fs.addFile(
                    {
                        content: bytes,
                        path: "text-content",
                    },
                    {
                        cidVersion: testCase.cidVersion,
                    }
                );
            } else {
                console.log("Using addBytes for CID v1");
                cid = await fs.addBytes(bytes, { cidVersion: testCase.cidVersion });
            }

            console.log(`Generated CID: ${cid.toString()}`);
            console.log(`Starts with 'Qm': ${cid.toString().startsWith("Qm")}`);
            console.log(`Starts with 'baf': ${cid.toString().startsWith("baf")}`);
            console.log(`Length: ${cid.toString().length}`);
        } catch (error) {
            console.log(`Error: ${(error as Error).message}`);
        }
    }

    await helia.stop();
}

testWebappCidVersions().catch(console.error);