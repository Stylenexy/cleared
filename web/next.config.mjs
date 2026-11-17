import path from "node:path";
import { fileURLToPath } from "node:url";
export default {
  transpilePackages: ["@cleared/sdk", "@cleared/guard"],
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  ),
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["unpdf"],
  experimental: { cpus: 2 },
};
