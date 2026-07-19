import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local embeddings run @huggingface/transformers, which loads the
  // onnxruntime-node native binding — keep both out of the Turbopack/webpack
  // server bundle so the native .node file is resolved at runtime instead.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
