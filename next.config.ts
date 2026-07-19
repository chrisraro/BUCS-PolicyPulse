import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local embeddings run @huggingface/transformers, which loads the
  // onnxruntime-node native binding — keep both out of the Turbopack/webpack
  // server bundle so the native .node file is resolved at runtime instead.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  // Vercel's automatic file tracing misses onnxruntime-node's dynamically
  // loaded platform library (prod error: "libonnxruntime.so.1: cannot open
  // shared object file"). Force-include the linux/x64 binaries (~43MB) for
  // every route that can trigger local embedding: document ingest/re-index
  // (server actions under /admin/documents) and chat retrieval (/api/chat).
  outputFileTracingIncludes: {
    "/admin/documents": ["./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
    "/api/chat": ["./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**"],
  },
};

export default nextConfig;
