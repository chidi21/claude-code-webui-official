/**
 * CLI argument parsing using runtime abstraction
 *
 * Handles command-line argument parsing in a runtime-agnostic way.
 */

import { program } from "commander";
import { VERSION } from "./version.ts";
import { getEnv, getArgs, readTextFile } from "../utils/os.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface ParsedArgs {
  debug: boolean;
  port: number;
  host: string;
  claudePath?: string;
}

export async function parseCliArgs(): Promise<ParsedArgs> {
  // Use version from auto-generated version.ts file
  const version = VERSION;

  // Get default port from environment or root .env file
  let envPort = getEnv("PORT");

  if (!envPort) {
    try {
      // Look for .env in the root directory (parent of backend)
      const __dirname =
        import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
      const envPath = join(__dirname, "../../.env");
      const envContent = await readTextFile(envPath);

      if (envContent) {
        const match = envContent.match(/^PORT=(\d+)/m);
        if (match) {
          envPort = match[1];
        }
      }
    } catch {
      // Ignore errors if .env doesn't exist or can't be read
    }
  }

  const defaultPort = parseInt(envPort || "8081", 10);

  // Configure program
  program
    .name("claude-code-webui")
    .version(version, "-v, --version", "display version number")
    .description("Claude Code Web UI Backend Server")
    .option(
      "-p, --port <port>",
      "Port to listen on",
      (value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid port number: ${value}`);
        }
        return parsed;
      },
      defaultPort,
    )
    .option(
      "--host <host>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      "127.0.0.1",
    )
    .option(
      "--claude-path <path>",
      "Path to claude executable (overrides automatic detection)",
    )
    .option("-d, --debug", "Enable debug mode", false);

  // Parse arguments - Commander.js v14 handles this automatically
  program.parse(getArgs(), { from: "user" });
  const options = program.opts();

  // Handle DEBUG environment variable manually
  const debugEnv = getEnv("DEBUG");
  const debugFromEnv = debugEnv?.toLowerCase() === "true" || debugEnv === "1";

  return {
    debug: options.debug || debugFromEnv,
    port: options.port,
    host: options.host,
    claudePath: options.claudePath,
  };
}
