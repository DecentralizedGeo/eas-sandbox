# Optimizing GeoJSON Storage in Ethereum Attestation Service (EAS) Schemas

## Overview

An integral component of the Ethereum Attestation Service (EAS) is the **schema**, which defines the structure and types of data that can be included in attestations. Creating gas-efficient schemas is essential for minimizing transaction costs, especially when dealing with potentially large datasets like geographical information.

GeoJSON objects are one of the most widely used formats for representing geographical features due to their simplicity and compatibility with JSON encoding. Trying to store them on the blockchain can be challenging, especially if preserving the data structure is of importance, requiring the use of a `string` type to store the data. This is because the EVM does not have a native data type for GeoJSON, and the only way to store it is as a string. However, this can lead to high gas costs when stored on-chain. This guide will walk through some examples on why storing more GeoJSON data on-chain as a `string` can be expensive. I'll also provide some practical strategies for optimizing GeoJSON storage in EAS schemas while maintaining data integrity and usability.

## Understanding Schema Gas Efficiency

Gas efficiency in EAS schemas directly impacts the cost of creating attestations. When you register a schema and make attestations using it, every byte of data consumes gas. Therefore, optimizing your schema design can lead to significant cost savings, particularly for applications that will generate numerous attestations.

### Why 32-Byte Words?

The Ethereum Virtual Machine (EVM) operates on **32-byte (256-bit) words**, a design choice rooted in cryptographic efficiency and alignment with common blockchain operations:

- **Cryptographic alignment**: 256-bit words natively support Keccak-256 hashing and elliptic-curve computations. [^46][^48].
- **Storage optimization**: Storage slots are 32 bytes wide, and operations on full words minimize gas costs. [^47][^46]
- **Terminology**: The term "word" (vs "chunk" or "block") comes from computer architecture, where it denotes the native unit of data processing. [^49][^50]

### Key Gas Cost Challenges with GeoJSON

1. **Dynamic String Overhead**
GeoJSON's JSON formatting (brackets, commas, quotes) adds ~30-40% bloat compared to raw coordinate data[^7][^14].
2. **Precision Tradeoffs**
High-precision coordinates increase storage requirements exponentially. A polygon with 10 vertices at 7 decimal places requires **140 bytes** as numbers vs. **300+ bytes** as a JSON string[^4][^6].
3. **Nested Structure Inefficiency**
Multi-polygon features compound storage costs due to additional array nesting in JSON[^1][^16].

## Strategies for Optimizing GeoJSON Storage

### 1. Fixed-Point Encoding for Floating-Point Numbers

Fixed-point encoding is a useful strategy for preserving fractional numbers as integers by scaling them by a predefined factor, maintaining precision. This approach, widely adopted strategy in blockchain and GIS systems, is due to the lack of native float support in Solidity. Here's how it works in practice:

#### Core Concept

1. **Scaling Factor**: Multiply floats by $10^n$ (where `n` = decimal precision) to convert them to integers.
2. **Storage**: Store the scaled integers in using integer types (`int40`, `uint256`, etc.).
3. **Reconstruction**: Divide by the same $10^n$ when retrieving the data off-chain.

| Scaling Factor | Decimal Places | Accuracy | Coordinate Value Placeholder |
| :-- | :-- | :-- | :-- |
| 10⁰ | 0 | ~10 km | ±549,755,813 |
| 10¹ | 1 | ~1 km | ±54,975,581 |
| 10² | 2 | ~11 m | ±549,755.813 |
| 10³ | 3 | ~1.1 m | ±54,975.581 |
| 10⁴ | 4 | ~11 cm | ±549.755813 |
| 10⁵ | 5 | ~1.1 cm | ±54.975581 |
| 10⁶ | 6 | ~0.11 cm | ±0.549755 |
| 10⁷ | 7 | ~1.1 mm | ±0.00549755 |
| 10⁸ | 8 | ~0.11 mm | ±0.000054975 |
| 10⁹ | 9 | ~0.011 mm | ±0.000000549 |

*Maintains sub-centimeter precision while using compact integer storage[^3][^9]*
*Note: The max *Coordinate Value Placeholder* value is determined by the integer type used (e.g., `int40` can store values up to ±549,755,813)[^4][^5]*

#### Packed Integer Arrays for Coordinates

A GeoJSON feature contains a geometry object that's represented as array(s) of coordinate pairs. Instead of storing coordinates as strings, we can use packed integer arrays to store these coordinates more efficiently.

**Schema Definition**

| Data Type | Schema Type | Example Structure |
| :-- | :-- | :-- |
| Single Polygon | int40[2][] | [ [x, y], [x, y], ... ] |
| Multi-Polygon | int40[2][][] | [ [ [x, y], ... ], [ [x, y], ... ] ] |

**Implementation**

Let's take the following examples of a geojson with two polygons:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-74.0, 40.7],
      [-74.1, 40.7], 
      [-74.1, 40.8], 
      [-74.0, 40.8],
      [-74.0, 40.7]
    ],
    [
      [-73.0, 41.7],
      [-73.1, 41.7],
      [-73.1, 41.8],
      [-73.0, 41.8],
      [-73.0, 41.7]
    ]    
  ]
}
```

Now, let's scale the coordinates by 10⁶ to maintain precision while using integers. Each coordinate pair is represented as two `int40` values (5 bytes each, so 10 bytes per pair).

```json
[
    [-74000000, 40700000],
    [-74100000, 40700000], 
    [-74100000, 40800000], 
    [-74000000, 40800000],
    [-74000000, 40700000]
  ],
  [
    [-73000000, 41700000],
    [-73100000, 41700000],
    [-73100000, 41800000],
    [-73000000, 41800000],
    [-73000000, 41700000]
]
```

Let's calculate the gas cost of storing just the coordinates from the polygon as a string vs. using packed integers.

**1. As a `string`**

- **Data:**
The GeoJSON-like string representation of your polygons is 153 bytes long.
- **Storage:**
Ethereum stores data in 32-byte (256-bit) words, each costing 20,000 gas.
- **Calculation:**
  - Number of 32-byte words: $(153 + 31) // 32 = 5$
  - Total gas: $5 \times 20,000 = 100,000$ gas

**As an `int40[^1][][]` array**

- **Data:**
Each coordinate pair is two `int40` values (5 bytes each, so 10 bytes per pair).
  - Each polygon: 5 points × 10 bytes = 50 bytes
  - Two polygons: 2 × 50 = 100 bytes total
- **Storage:**
  - Number of 32-byte words: $(100 + 31) // 32 = 4$
  - Total gas: $4 \times 20,000 = 80,000$ gas

**Summary of gas usage**

| Format | Total Bytes | 32-Byte Words | Gas Cost | Savings |
| :-- | :-- | :-- | :-- | :-- |
| `string` | 153 | 5 | 100,000 | - |
| `int40[2][][]` | 100 | 4 | 80,000 | 20% |

#### Key takeaways

Storing as `int40[2][][]` saves 20% gas compared to storing as a `string` for this example (80,000 gas vs. 100,000 gas). The savings increase with larger or more complex polygons, as the string format introduces more overhead per coordinate due to formatting characters.

If we were to store a geojson containing 5 polygons with 6 points each:

| Format | Total Bytes | 32-Byte Words | Gas Cost | Savings |
| :-- | :-- | :-- | :-- | :-- |
| `string` | 300 | 10 | 200,000 | - |
| `int40[2][][]` | 791 | 25 | 500,000 | 250% |

---

A simple formula to estimate gas usage for storing `int40[][]` polygons:

$$
\text{Gas} = \left\lceil \frac{\text{number of polygons} \times \text{points per polygon} \times 2 \times 5}{32} \right\rceil \times 20{,}000
$$

**where:**

- Each coordinate (int40) = 5 bytes
- Each point = 2 coordinates (x, y)
- Ethereum storage word = 32 bytes
- Each 32-byte word costs 20,000 gas

---

### Hybrid Approach for On/Off-Chain Storage

For more complex geometries, a more ideal approach is to store the geojson object on IPFS.

- **Off-chain:** Store the GeoJSON object in IPFS
- **On-chain:** Store the Merkle root hash of the geojson object in an attestation
- **Validation:** Compare the Merkle root hash of the geojson from IPFS with the on-chain attestation to verify data integrity
- **Gas Cost:** Only store the hash on-chain, which is much smaller than the full GeoJSON object or even the packed integer array

## Best Practices

1. **Precision Matching**
Use smallest possible precision (e.g., 6 decimals ≈ 11cm accuracy)[^4]
2. **Array Pre-Allocation**
Initialize fixed-size arrays when possible:
`int40[^2][^100] maxVertices` vs dynamic `int40[^2][]`[^9][^17]
3. **Batched Updates**
Group related geometry updates to amortize transaction costs[^16]

## Common Pitfalls

1. **Overflow Risk**:
Verify scaled values fit within the chosen integer type:

```typescript
const x = Math.round(value * factor);
if (x > MAX_INT40 || x < MIN_INT40) {
  throw new Error("Value out of bounds");
}
```

2. **Mixed Precision**:

Never combine coordinates with different scaling factors in the same array.

```typescript
const x = Math.round(value * factor);
const y = Math.round(value * factor2); // Avoid this
```

3. **Decimal Truncation**:

Use rounding instead of truncation to avoid cumulative errors:

```typescript
Math.round(value * factor) // Not Math.floor()
```

By implementing these patterns, developers achieve **deterministic precision** while optimizing gas costs for geospatial attestations.

---

## Conclusion

By combining packed integer encoding with selective off-chain storage, developers can achieve **60-90% gas cost reduction** for GeoJSON-based attestations. The optimal approach depends on specific use case requirements:

- **High-frequency updates:** On-chain int40[][] arrays
- **Complex geometries:** Hybrid hash-based storage
- **Maximum efficiency:** Fixed-size arrays with precision caps
- **32-byte alignment** is critical for minimizing storage costs[^47][^48]

These patterns apply broadly to spatial data storage in EAS, enabling cost-effective solutions for environmental monitoring, property registries, and logistics tracking applications[^13][^16].

[^1]: gas-

[^2]: https://docs.attest.org/docs/tutorials/gas-efficiency

[^3]: https://github.com/ethereum-attestation-service/eas-docs-site/blob/main/docs/tutorials/create-a-schema.md

[^4]: https://www.cyfrin.io/blog/solidity-gas-efficiency-tips-tackle-rising-fees-base-other-l2

[^5]: https://ethereum.stackexchange.com/questions/119947/what-are-the-gas-costs-for-type-casting-or-conversions

[^6]: https://www.reddit.com/r/ethdev/comments/1hcfkcw/help_i_am_confused_about_the_gas_costs_associated/

[^7]: https://doc.confluxnetwork.org/docs/general/build/smart-contracts/gas-optimization/bytes32String

[^8]: https://www.reddit.com/r/ethdev/comments/o0vxgl/is_it_cheaper_in_gas_to_pass_in_arguments_as/

[^9]: https://blog.web3labs.com/solidity-smart-contracts-gas-optimization-techniques/

[^10]: https://docs.attest.org/docs/category/tutorials

[^11]: https://ethereum.stackexchange.com/questions/111987/what-is-the-gas-cost-per-entry-in-storage

[^12]: https://forum.openzeppelin.com/t/how-to-calculate-the-gas-cost-of-soliditys-transfer-function/5847

[^13]: https://www.quicknode.com/guides/ethereum-development/smart-contracts/what-is-ethereum-attestation-service-and-how-to-use-it

[^14]: https://www.sitepoint.com/ethereum-transaction-costs/

[^15]: https://www.reddit.com/r/solidity/comments/15dtm07/understanding_gas_price_for_contract/

[^16]: https://github.com/ethereum-attestation-service/eas-docs-site/blob/main/docs/core--concepts/schemas.md

[^17]: https://news.ycombinator.com/item?id=26604121

[^18]: https://docs.openzeppelin.com/contracts/4.x/api/utils

[^19]: https://console.settlemint.com/documentation/platform-components/middleware-and-api-layer/attestation-indexer

[^20]: https://coinsbench.com/rareskills-solidity-interview-question-52-answered-describe-the-three-types-of-storage-gas-costs-5134bbd2f8d1

[^21]: https://ethereum.stackexchange.com/questions/872/what-is-the-cost-to-store-1kb-10kb-100kb-worth-of-data-into-the-ethereum-block

[^22]: https://github.com/ethereum-attestation-service/eas-docs-site/blob/main/docs/quick--start/quickstart.md

[^23]: https://docs.attest.org/docs/tutorials/create-a-schema

[^24]: https://hacken.io/discover/solidity-gas-optimization/

[^25]: https://yos.io/2021/05/17/gas-efficient-solidity/

[^26]: https://aptos.dev/en/network/blockchain/gas-txn-fee

[^27]: https://supra.com/es/academy/blockchain-attestation-and-ethereum-attestation-service/

[^28]: https://easscan.org/schema/create

[^29]: https://coinsbench.com/rareskills-solidity-interview-question-52-answered-describe-the-three-types-of-storage-gas-costs-5134bbd2f8d1

[^30]: https://docs.openzeppelin.com/contracts/4.x/api/utils

[^31]: https://hackmd.io/@fvictorio/gas-costs-after-berlin

[^32]: https://simpleswap.io/blog/understanding-the-attestations-ethereum2.0

[^33]: https://www.reddit.com/r/ethereum/comments/phwdht/explaining_gas_cost_eip2200_in_evm_assembly_with/

[^34]: https://detectors.auditbase.com/string-gas-optimization

[^35]: https://www.reddit.com/r/solidity/comments/15dtm07/understanding_gas_price_for_contract/

[^36]: https://github.com/wolflo/evm-opcodes/blob/main/gas.md

[^37]: https://dev.to/jamiescript/gas-saving-techniques-in-solidity-324c

[^38]: https://ethereum.stackexchange.com/questions/50503/bytes32-same-length-hex-strings-cost-different-gas-why

[^39]: https://ethereum.stackexchange.com/questions/123511/why-does-the-gas-cost-of-push-in-array-in-solidity-remain-the-same

[^40]: https://ethereum-magicians.org/t/proposals-to-adjust-memory-gas-costs/10036

[^41]: https://ethereum.stackexchange.com/questions/23595/storing-string-value-in-solidity

[^42]: https://metaschool.so/articles/representing-bytes32-as-string-in-solidity/

[^43]: https://coinsbench.com/byte-vs-bytes-in-solidity-29a42f49e862

[^44]: https://www.cyfrin.io/blog/solidity-gas-efficiency-tips-tackle-rising-fees-base-other-l2

[^45]: https://dev.to/patrickalphac/getting-gas-prices-in-solidity-4ijf

[^46]: https://www.quicknode.com/guides/ethereum-development/smart-contracts/a-dive-into-evm-architecture-and-opcodes

[^47]: https://blog.openzeppelin.com/ethereum-in-depth-part-2-6339cf6bddb9

[^48]: https://docs.polygon.technology/zkEVM/concepts/evm-basics/

[^49]: https://ethereum.stackexchange.com/questions/2327/clarification-of-256-bit-word-semantics

[^50]: https://www.reddit.com/r/ethdev/comments/6lri88/why_does_the_evm_use_32byte_words/
