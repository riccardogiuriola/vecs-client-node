# 📦 Vecs Client

**Vecs Client** is a robust, zero-dependency Node.js & TypeScript client for **Vecs**, the high-performance Semantic Cache server.

It allows you to interact with the Vecs server using a simple, Promise-based API to store, retrieve, and manage data based on **semantic meaning** rather than just exact text matches.

## ✨ Features

- **💪 Type-Safe:** Written in TypeScript with full type definitions included.

- **⚡ Zero Dependencies:** Uses native Node.js `net` and `events` modules. Extremely lightweight.

- **🔄 Smart Buffering:** Handles TCP stream fragmentation and VSP protocol parsing automatically.

- **Promise-based:** Modern `async/await` API.

## 📦 Installation

```
npm install vecs-client

```

## 🚀 Quick Start

### 1\. Connection

```
import { VecsClient } from 'vecs-client';

const client = new VecsClient({
    host: '127.0.0.1', // Default: localhost
    port: 6380         // Default: 6380
});

await client.connect();

```

### 2\. Semantic Caching (The Magic)

Store a prompt and its response. Vecs will automatically generate embeddings.

```
// SET: Save a question and its answer
// L1 stores the exact match. L2 stores the semantic embedding.
await client.set(
    "How do I reset my password?",
    { category: "support", user_id: 101 }, // Metadata (JSON)
    "Go to Settings > Security > Reset."   // The Answer
);

// QUERY: Ask a DIFFERENT but SIMILAR question
// This returns the cached answer because the meaning is the same.
const answer = await client.query("I forgot my password, help me");

if (answer) {
    console.log("✅ HIT:", answer);
    // Output: "Go to Settings > Security > Reset."
} else {
    console.log("❌ MISS: Call your LLM here...");
}

```

Store a prompt and its response with a custom TTL

```
// SET with specific TTL (e.g., 60 seconds)
await client.set(
    "What is the current stock price?",
    { symbol: "AAPL" },
    "150.00 USD",
    60 // <-- Expires in 1 minute
);
```

Using TTL (Time-To-Live)

```
// SET with specific TTL (e.g., 60 seconds)
await client.set(
    "What is the current stock price?",
    { symbol: "AAPL" },
    "150.00 USD",
    60 // <-- Expires in 1 minute (Optional)
);
```

### 3\. Deleting Data

Invalidate cache entries when data becomes stale or incorrect.

```
// Removes exact match from L1 and semantically similar vectors from L2
const deleted = await client.delete("How do I reset my password?");

if (deleted) {
    console.log("🗑️ Entry removed successfully");
}

```

## 📚 API Reference

### `new VecsClient(options)`

Creates a new client instance.

- `options.host` (string): Server hostname (default: `127.0.0.1`).
- `options.port` (number): Server port (default: `6380`).
- `options.timeout` (number): Socket timeout in milliseconds (optional).

### `client.connect(): Promise<void>`

Establishes the TCP connection to the Vecs server.

### `client.set(prompt, params, response, ttl?): Promise<string>`

Stores an entry in the cache (both L1 and L2).

- `prompt` (string): The user query to embed.
- `params` (object): Metadata to store (currently unused by search, stored for reference).
- `response` (string): The text to return upon a cache hit.
- `ttl` (number, optional): Time-to-live in seconds. If omitted, the server default is used.

### `client.query(prompt, params?): Promise<string | null>`

Searches the cache for an exact (L1) or semantic (L2) match.

- `prompt` (string): The phrase or question to search for.
- `params` (object, optional): Metadata.
- **Returns:** `string` (the cached response) if a match is found, or `null` if no match is found (Cache Miss).

### `client.delete(prompt, params?): Promise<boolean>`

Removes entries from the cache (invalidates both exact and semantic matches).

- `prompt` (string): The phrase to remove.
- `params` (object, optional): Metadata.
- **Returns:** `true` if the command was processed successfully.

### `client.disconnect(): void`

Closes the connection safely.
