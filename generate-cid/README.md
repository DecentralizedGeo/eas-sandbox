# Generate CID

A TypeScript package for generating Content Identifiers (CIDs) using Helia without uploading to IPFS blockstore.

## Overview

This package provides both a CLI tool and web interface to generate IPFS-compatible CIDs from files or text content. It uses Helia's [HTTP implementation](https://ipfs.github.io/helia/modules/_helia_http.html) to calculate CIDs locally without uploading to IPFS. I've added a few options to customize the chunking algorithms and layout strategies to see how CIDs would look with different configurations.

## Features

- **CLI Tool**: Generate CIDs from command line with custom chunking options
- **Web Interface**: Browser-based CID generator with file upload support
- **Chunking Options**: Fixed-size or Rabin variable-size chunking
- **Layout Strategies**: Balanced tree or flat layout
- **No Upload**: Generate CIDs without storing data in blockstore

## Quick Start

### Install Dependencies

```bash
yarn install
```

### Build Package

```bash
yarn build
```

> You can also run `yarn build:generate-cid` from the `EAS-Sandbox` root directory to build the generate-cid package specifically.

## Web Interface

Start the web server:

```bash
yarn webapp

```

> You can also run `yarn generate-cid-webapp` from the `EAS-Sandbox` root directory to run the web interface.

Then open http://localhost:3000 in your browser to use the web interface for uploading files and generating CIDs.

### CLI Usage

Generate CID for a file:

```bash
yarn get-cid path/to/file.txt
```

Generate CID for text content:

```bash
yarn get-cid "Hello, IPFS!"
```

### CLI Options

```bash
yarn get-cid [options] <input>

Options:
  --chunker <type>          "fixed" or "rabin" (default: fixed)
  --chunk-size <size>       Chunk size in bytes (default: 1048576)
  --avg-chunk-size <size>   Average chunk size for rabin chunker
  --min-chunk-size <size>   Minimum chunk size for rabin chunker
  --max-chunk-size <size>   Maximum chunk size for rabin chunker
  --layout <type>           "balanced" or "flat" (default: balanced)
  --help, -h                Show help message
```

### Examples

**Basic file CID:**

```bash
yarn get-cid package.json
```

**Custom chunking for large files:**

```bash
yarn get-cid --chunker rabin --avg-chunk-size 512000 image.jpg
```

**Small chunks for better deduplication:**

```bash
yarn get-cid --chunk-size 65536 document.pdf
```

**Flat layout instead of balanced tree:**

```bash
yarn get-cid --layout flat video.mp4
```

## Output Example

```
$ yarn get-cid package.json

Starting CID generation...
Processing file: package.json
File size: 1279 bytes

Generated CID: bafkreig3zw5q2v7dnz4mizihoi2twdrcmobm7biiaerg6tb6l7nuz3if5m

Options used:
  Chunker: fixed
  Chunk size: 1048576 bytes
  Layout: balanced
```
