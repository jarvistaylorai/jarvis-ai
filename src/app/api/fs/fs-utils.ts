import path from 'path';
import fs from 'fs/promises';

// The absolute path to the virtual filesystem root
export const ROOT_WORKSPACE_PATH = path.join(process.cwd(), 'workspace');

export const getWorkspaceRoot = (workspace: string = 'business') => path.join(ROOT_WORKSPACE_PATH, workspace);

export const getSafeFsPath = (userPath: string | null, workspace: string = 'business'): string => {
  const root = getWorkspaceRoot(workspace);
  if (!userPath) {
    return root;
  }

  // Remove leading slash if present to make it relative to root
  const cleanPath = userPath.startsWith('/') ? userPath.slice(1) : userPath;
  const resolvedPath = path.resolve(root, cleanPath);

  // Security check: ensure the resolved path starts with the workspace path
  if (!resolvedPath.startsWith(root)) {
    throw new Error('Access Denied: Invalid path');
  }

  return resolvedPath;
};

/**
 * Helper to ensure a directory exists.
 */
export const ensureDirectory = async (dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
    // Ignore if directory already exists
  }
};
