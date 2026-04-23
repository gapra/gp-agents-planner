import fs from 'node:fs/promises';
import path from 'node:path';

export async function loadMarkdown(filePath: string): Promise<string> {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Failed to load markdown file: ${filePath}`, error);
    return `Error: Could not load context from ${filePath}`;
  }
}