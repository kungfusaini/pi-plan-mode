import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface ProjectContextInfo {
  id: string;
  root: string;
  dir: string;
  plans: string;
}

interface RegistryProject {
  id?: string;
  root?: string;
  dir?: string;
  aliases?: string[];
  status?: string;
}

function dataHome(): string {
  return process.env.XDG_DATA_HOME || path.join(homedir(), ".local", "share");
}

function slugify(input: string): string {
  return input
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function canonicalPath(value: string): string {
  const resolved = path.resolve(value);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function isWithin(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function registryFile(): string {
  return path.join(dataHome(), "pi", "projects", "registry.json");
}

function registeredProject(cwd: string): RegistryProject | undefined {
  const file = registryFile();
  if (!existsSync(file)) return undefined;

  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const projects = parsed?.projects && typeof parsed.projects === "object"
      ? Object.values(parsed.projects) as RegistryProject[]
      : [];
    return projects
      .filter((project) => (project.status || "active") === "active" && project.root)
      .flatMap((project) => {
        const aliases = [project.root, ...(project.aliases || [])]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .map(canonicalPath);
        return aliases
          .filter((alias) => isWithin(cwd, alias))
          .map((alias) => ({ project, score: alias.length }));
      })
      .sort((a, b) => b.score - a.score)[0]?.project;
  } catch {
    return undefined;
  }
}

function discoverRoot(cwd: string): string {
  let current = cwd;
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return cwd;
    current = parent;
  }
}

export function projectID(root: string): string {
  const canonicalRoot = canonicalPath(root);
  const hash = createHash("sha256").update(canonicalRoot).digest("hex").slice(0, 12);
  const parent = path.basename(path.dirname(canonicalRoot));
  const leaf = path.basename(canonicalRoot) || "project";
  const base = slugify(parent && parent !== path.sep ? `${parent}-${leaf}` : leaf);
  return `${base || "project"}--${hash}`;
}

export function resolveProjectContext(workdir: string): ProjectContextInfo {
  const cwd = canonicalPath(workdir);
  const registered = registeredProject(cwd);
  const root = canonicalPath(registered?.root || discoverRoot(cwd));
  const id = registered?.id || projectID(root);
  const dir = registered?.dir || path.join(dataHome(), "pi", "projects", id);
  return { id, root, dir, plans: path.join(dir, "plans") };
}

export function ensureProjectStore(info: ProjectContextInfo): ProjectContextInfo {
  mkdirSync(path.join(info.plans, "active"), { recursive: true });
  mkdirSync(path.join(info.plans, "archive"), { recursive: true });
  return info;
}
