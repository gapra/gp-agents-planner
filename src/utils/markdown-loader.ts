import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Allowed root directories from which markdown files may be loaded.
 * This prevents path traversal attacks (e.g., ../../etc/passwd).
 * All paths are resolved to absolute paths at load time.
 */
const ALLOWED_ROOTS: string[] = [
  path.resolve(process.cwd(), 'agents'),
  path.resolve(process.cwd(), 'skills'),
];

/**
 * Loads a markdown file from an allowed directory.
 *
 * Security: Validates that the resolved absolute path is strictly within
 * one of the ALLOWED_ROOTS directories before reading. This prevents path
 * traversal attacks where a caller could pass "../../../etc/passwd" or
 * similar inputs.
 *
 * @param filePath - Relative path to the markdown file (e.g., "agents/FeatureArchitect.md")
 * @returns The UTF-8 file contents
 * @throws {Error} If the resolved path is outside of allowed roots, or if the file cannot be read
 */
export async function loadMarkdown(filePath: string): Promise<string> {
  // Resolve to an absolute path to prevent relative path confusion
  const resolvedPath = path.resolve(process.cwd(), filePath);

  // Security check: verify the resolved path starts with an allowed root
  const isAllowed = ALLOWED_ROOTS.some((allowedRoot) =>
    resolvedPath.startsWith(allowedRoot + path.sep) ||
    resolvedPath === allowedRoot
  );

  if (!isAllowed) {
    // Do NOT include the resolved path in the error message to avoid
    // leaking filesystem structure to the caller (which may be an MCP client).
    throw new Error(
      `Access denied: '${filePath}' is not within an allowed directory. ` +
      `Only files in 'agents/' and 'skills/' directories may be loaded.`
    );
  }

  // Read the file — let the error propagate so the caller can handle it
  // properly (e.g., return an MCP error response instead of silently failing).
  const content = await fs.readFile(resolvedPath, 'utf-8');
  return content;
}