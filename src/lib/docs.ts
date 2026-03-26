import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import matter from 'gray-matter';

export type Document = {
  id: string;
  title: string;
  type: string;
  category?: string;
  tags?: string[];
  workspace?: string;
  path: string;
  frontmatter: Record<string, any>;
  content: string;
  lastModified: string;
};

type DocumentCache = {
  docs: Document[];
  byId: Map<string, Document>;
  pathById: Map<string, string>;
};

type SaveDocPayload = {
  frontmatter?: Record<string, any>;
  body?: string;
};

const INDEXED_DIRECTORIES = ['Projects', 'Knowledge', 'DailyNotes'];
const ALLOWED_DIRECTORIES = [...INDEXED_DIRECTORIES, 'Inbox'];
const WATCH_EVENTS = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];

let cache: DocumentCache | null = null;
let watcher: chokidar.FSWatcher | null = null;
let resolvedVaultPath: string | null = null;
const shouldWatchVault = process.env.NODE_ENV !== 'test';

function getVaultPath(): string {
  if (resolvedVaultPath) {
    return resolvedVaultPath;
  }

  const configured = process.env.OBSIDIAN_VAULT_PATH;
  if (!configured) {
    throw new Error('OBSIDIAN_VAULT_PATH is not defined. Set it to your Jarvis Obsidian vault path.');
  }

  const absolutePath = path.resolve(configured);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Configured Obsidian vault path does not exist: ${absolutePath}`);
  }

  resolvedVaultPath = absolutePath;
  return absolutePath;
}

function invalidateCache() {
  cache = null;
}

function ensureWatcher() {
  if (!shouldWatchVault || watcher) {
    return;
  }

  try {
    watcher = chokidar.watch(getVaultPath(), {
      ignoreInitial: true,
      depth: Infinity,
      ignored: (watchedPath) => shouldIgnorePath(watchedPath),
    });

    const onChange = (changedPath: string) => {
      if (!changedPath) return;
      try {
        const absolutePath = path.resolve(changedPath);
        if (isWithinAllowedScope(absolutePath)) {
          invalidateCache();
        }
      } catch (error) {
        // If the changed file was removed, resolve can fail. Ignore.
      }
    };

    WATCH_EVENTS.forEach((event) => watcher!.on(event, onChange));
    watcher.on('error', (error) => {
      console.warn('[docs] File watcher error:', error);
    });
  } catch (error) {
    console.warn('[docs] Unable to initialize Obsidian watcher:', error);
  }
}

function ensureCache(): DocumentCache {
  if (!cache) {
    const docs = buildDocumentIndex();
    const byId = new Map<string, Document>();
    const pathById = new Map<string, string>();

    docs.forEach((doc) => {
      if (!byId.has(doc.id)) {
        byId.set(doc.id, doc);
        pathById.set(doc.id, doc.path);
      } else {
        console.warn(`[docs] Duplicate document id detected: ${doc.id} (${doc.path})`);
      }
    });

    cache = { docs, byId, pathById };
    ensureWatcher();
  }

  return cache;
}

function buildDocumentIndex(): Document[] {
  const files = collectDocumentPaths();
  const documents: Document[] = [];

  files.forEach((filePath) => {
    const doc = parseDocument(filePath);
    if (doc) {
      documents.push(doc);
    }
  });

  documents.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  return documents;
}

function collectDocumentPaths(): string[] {
  const vault = getVaultPath();
  const paths: string[] = [];
  
  ALLOWED_DIRECTORIES.forEach(dir => {
    const dirPath = path.join(vault, dir);
    if (fs.existsSync(dirPath)) {
      readDirectoryRecursive(dirPath, paths);
    }
  });

  return paths;
}

function readDirectoryRecursive(directory: string, files: string[]): void {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    console.warn('[docs] Unable to read directory', directory, error);
    return;
  }

  entries.forEach((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (shouldIgnorePath(entryPath, entry.isDirectory())) {
      return;
    }

    if (entry.isDirectory()) {
      readDirectoryRecursive(entryPath, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath);
    }
  });
}

function shouldIgnorePath(filePath: string, isDir = false): boolean {
  const relative = path.relative(getVaultPath(), filePath);
  const segments = relative ? relative.split(path.sep) : [];
  return segments.some((segment) => {
    if (!segment) return false;
    if (segment === '.obsidian' || segment === 'node_modules' || segment === 'Archive' || segment === 'Templates' || segment === 'System') return true;
    if (segment.startsWith('.') && segment !== '.' && segment !== '..') return true;
    return false;
  }) || (!isDir && path.basename(filePath).startsWith('.'));
}

function parseDocument(filePath: string): Document | null {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(fileContents);
    const stats = fs.statSync(filePath);
    const relativePath = relativeToVault(filePath);
    const frontmatter = { ...parsed.data };
    const id = typeof frontmatter.id === 'string' && frontmatter.id.trim().length > 0
      ? frontmatter.id
      : path.basename(filePath, path.extname(filePath));

    const title = typeof frontmatter.title === 'string' && frontmatter.title.trim().length > 0
      ? frontmatter.title
      : id;

    const docType = deriveDocumentType(relativePath, frontmatter);
    const [topLevel, ...rest] = relativePath.split(path.sep);
    const inferredCategory = rest.length > 0 ? topLevel : 'Root';
    const category = typeof frontmatter.category === 'string' ? frontmatter.category : inferredCategory;
    const workspace = typeof frontmatter.workspace === 'string' ? frontmatter.workspace : undefined;
    const tags = normalizeTags(frontmatter.tags);

    const document: Document = {
      id,
      title,
      type: docType,
      category,
      tags,
      workspace,
      path: filePath,
      frontmatter: { ...frontmatter, id, title },
      content: parsed.content,
      lastModified: stats.mtime.toISOString(),
    };

    return document;
  } catch (error) {
    console.warn('[docs] Unable to parse markdown file', filePath, error);
    return null;
  }
}

function deriveDocumentType(relativePath: string, frontmatter: Record<string, any>): string {
  if (typeof frontmatter.type === 'string' && frontmatter.type.trim().length > 0) {
    return frontmatter.type;
  }

  if (typeof frontmatter.category === 'string' && frontmatter.category.trim().length > 0) {
    return frontmatter.category;
  }

  const [topLevel] = relativePath.split(path.sep);
  switch (topLevel) {
    case 'Projects':
      return 'project';
    case 'Knowledge':
      return 'knowledge';
    case 'DailyNotes':
      return 'daily';
    case 'Inbox':
      return 'inbox';
    default:
      return 'note';
  }
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return undefined;
}

function isWithinAllowedScope(absolutePath: string): boolean {
  const vault = getVaultPath();
  const relative = path.relative(vault, absolutePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  const [topLevel] = relative.split(path.sep);
  return ALLOWED_DIRECTORIES.includes(topLevel);
}

function resolveAbsolutePath(inputPath: string): string {
  const vault = getVaultPath();
  const candidate = path.isAbsolute(inputPath) ? inputPath : path.join(vault, inputPath);
  const normalized = path.normalize(candidate);
  const relative = path.relative(vault, normalized);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path ${inputPath} escapes the configured Obsidian vault.`);
  }

  if (!isWithinAllowedScope(normalized)) {
    throw new Error(`Path ${inputPath} is outside of the vault.`);
  }

  return normalized;
}

function relativeToVault(absolutePath: string): string {
  return path.relative(getVaultPath(), absolutePath);
}

function deepMerge(target: Record<string, any>, updates: Record<string, any>): Record<string, any> {
  const result = { ...target };

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
    } else if (Array.isArray(existing) && Array.isArray(value)) {
      result[key] = [...value];
    } else {
      result[key] = value;
    }
  });

  return result;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function loadDocFromNonIndexedDirectories(id: string): Document | null {
  const vault = getVaultPath();
  const dirs = ALLOWED_DIRECTORIES.filter(d => !INDEXED_DIRECTORIES.includes(d));
  for (const directoryName of dirs) {
    const directory = path.join(vault, directoryName);
    if (!fs.existsSync(directory)) continue;
    const files: string[] = [];
    readDirectoryRecursive(directory, files);
    for (const file of files) {
      const doc = parseDocument(file);
      if (doc && doc.id === id) {
        return doc;
      }
    }
  }
  return null;
}

export function getAllDocs(): Document[] {
  return [...ensureCache().docs];
}

export function getDocById(id: string): Document | null {
  const cached = ensureCache().byId.get(id);
  if (cached) {
    return cached;
  }
  return loadDocFromNonIndexedDirectories(id);
}

export function getDocsByType(type: string): Document[] {
  return getAllDocs().filter((doc) => doc.type === type);
}

export function saveDoc(docPath: string, content: string | SaveDocPayload): Document | null {
  const absolutePath = resolveAbsolutePath(docPath);
  const existing = fs.existsSync(absolutePath)
    ? matter(fs.readFileSync(absolutePath, 'utf8'))
    : { data: {}, content: '' };

  const payload: SaveDocPayload = typeof content === 'string' ? { body: content } : content;
  const frontmatterUpdates = payload.frontmatter ?? {};
  const nextFrontmatter = deepMerge(existing.data || {}, frontmatterUpdates);

  if (!nextFrontmatter.id) {
    nextFrontmatter.id = path.basename(absolutePath, path.extname(absolutePath));
  }

  const nextBody = payload.body !== undefined ? payload.body : existing.content;
  const serialized = matter.stringify(nextBody ?? '', nextFrontmatter);

  const directory = path.dirname(absolutePath);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(absolutePath, serialized, 'utf8');

  invalidateCache();
  const updatedDoc = parseDocument(absolutePath);
  return updatedDoc;
}

export function updateDocFrontmatter(id: string, updates: Record<string, any>): Document | null {
  if (!updates || Object.keys(updates).length === 0) {
    return getDocById(id);
  }

  const document = getDocById(id);
  if (!document) {
    return null;
  }

  return saveDoc(document.path, { frontmatter: updates });
}

export function searchDocs(query: string): Document[] {
  const docs = getAllDocs();
  if (!query) return docs;

  const normalizedQuery = query.toLowerCase();
  return docs.filter((doc) => {
    const contentMatch = doc.content.toLowerCase().includes(normalizedQuery);
    const titleMatch = doc.title.toLowerCase().includes(normalizedQuery);
    const tagsMatch = (doc.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery));
    const categoryMatch = (doc.category || '').toLowerCase().includes(normalizedQuery);
    return contentMatch || titleMatch || tagsMatch || categoryMatch;
  });
}
