import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Anchor all paths to the module's own file location — NOT process.cwd().
//
// WHY: When an MCP client (Claude Desktop, Cursor, JetBrains, VS Code) spawns
// this server as a subprocess, it may set the working directory to anything:
// `/`, `~`, the IDE's install directory, etc. Using process.cwd() would cause
// all file lookups to fail silently or resolve to wrong locations.
//
// HOW: import.meta.url is always the absolute URL of *this compiled file*,
// regardless of how or from where the process was launched.
//
// Directory layout (both dev and production are identical relative depth):
//
//   src/utils/markdown-loader.ts  →  ../../  →  project root
//   dist/utils/markdown-loader.js →  ../../  →  project root
//
// So navigating two levels up from __dirname always reaches the project root.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Absolute path to the project root, resolved relative to this module file.
 * Stable regardless of the process working directory.
 */
const PROJECT_ROOT = path.resolve(__dirname, "../../");

/**
 * Allowed root directories from which markdown files may be loaded.
 * Resolved relative to PROJECT_ROOT (not process.cwd()) to prevent
 * path traversal attacks AND to be stable across all MCP client launch contexts.
 */
const ALLOWED_ROOTS: readonly string[] = [
  path.join(PROJECT_ROOT, "agents"),
  path.join(PROJECT_ROOT, "skills"),
] as const;

/**
 * Loads a markdown file from an allowed directory.
 *
 * Security: Validates that the resolved absolute path is strictly within
 * one of the ALLOWED_ROOTS directories before reading. This prevents path
 * traversal attacks where a caller could pass "../../../etc/passwd" or
 * similar inputs.
 *
 * Stability: Uses import.meta.url-based path resolution so the server works
 * correctly regardless of the working directory set by the MCP client host.
 *
 * @param filePath - Path relative to the project root (e.g., "agents/FeatureArchitect.md")
 * @returns The UTF-8 file contents
 * @throws {Error} If the resolved path is outside of allowed roots, or if the file cannot be read
 */
export async function loadMarkdown(filePath: string): Promise<string> {
  // Resolve relative to PROJECT_ROOT (anchored to module location, not cwd)
  const resolvedPath = path.resolve(PROJECT_ROOT, filePath);

  // Security check: verify the resolved path is strictly within an allowed root.
  // We append path.sep to the allowedRoot to prevent a path like
  // "/project/agents-extra/file.md" from matching "/project/agents".
  const isAllowed = ALLOWED_ROOTS.some(
    (allowedRoot) =>
      resolvedPath.startsWith(allowedRoot + path.sep) || resolvedPath === allowedRoot,
  );

  if (!isAllowed) {
    // Do NOT include the resolved path in the error message to avoid
    // leaking filesystem structure to the caller (which may be an MCP client).
    throw new Error(
      `Access denied: '${filePath}' is not within an allowed directory. ` +
        `Only files in 'agents/' and 'skills/' directories may be loaded.`,
    );
  }

  // Read the file — let the error propagate so the caller can handle it
  // properly (e.g., return an MCP error response instead of silently failing).
  const content = await fs.readFile(resolvedPath, "utf-8");
  return content;
}
