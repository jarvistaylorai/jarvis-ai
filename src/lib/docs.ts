import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type Document = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const DOCS_DIR = path.join(process.cwd(), 'system', 'docs');

// Get all .md files recursively
function getAllDocPaths(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllDocPaths(filePath, fileList);
    } else if (filePath.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

export function getAllDocs(): Document[] {
  const paths = getAllDocPaths(DOCS_DIR);
  const docs = paths.map((filePath) => {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    return {
      id: data.id || path.basename(filePath, '.md'),
      title: data.title || 'Untitled',
      content,
      category: data.category || 'uncategorized',
      tags: data.tags || [],
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    } as Document;
  });

  return docs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getDocById(id: string): Document | null {
  const docs = getAllDocs();
  return docs.find((doc) => doc.id === id) || null;
}

export function getDocPathById(id: string): string | null {
  const paths = getAllDocPaths(DOCS_DIR);
  for (const filePath of paths) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);
    if (data.id === id) {
      return filePath;
    }
  }
  return null;
}

export function saveDoc(doc: Document): void {
  let filePath = getDocPathById(doc.id);

  if (!filePath) {
    // If it's a new doc, figure out the best folder based on category, otherwise default root
    const categoryFolders = ['architecture', 'agents', 'playbooks', 'research'];
    const targetFolder = categoryFolders.includes(doc.category) ? doc.category : '';
    filePath = path.join(DOCS_DIR, targetFolder, `${doc.id}.md`);
  }

  const fileContent = matter.stringify(doc.content, {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    tags: doc.tags,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  });

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, fileContent, 'utf8');
}

export function searchDocs(query: string): Document[] {
  const docs = getAllDocs();
  if (!query) return docs;
  
  const lowerQuery = query.toLowerCase();
  return docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.content.toLowerCase().includes(lowerQuery) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      doc.category.toLowerCase().includes(lowerQuery)
  );
}
