import { createHash } from "node:crypto";
import { mkdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const WORKSPACE_CONTEXT_EVENT = "pi:workspace-context:resolve";

export type PlanScope = "session" | "project" | "stream";

export interface PlanContextInfo {
  scope: PlanScope;
  id: string;
  root: string;
  dir: string;
  plans: string;
  sessionID?: string;
  projectID?: string;
  streamID?: string;
}

export type ProjectContextInfo = PlanContextInfo;

export interface WorkspacePlanContext {
  scope: "project" | "stream";
  id: string;
  root: string;
  dir: string;
  projectID: string;
  streamID?: string;
}

export interface WorkspaceContextRequest {
  cwd: string;
  sessionID: string;
  result?: WorkspacePlanContext;
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

function sessionStorageID(sessionID: string): string {
  const base = slugify(sessionID) || "session";
  const hash = createHash("sha256").update(sessionID).digest("hex").slice(0, 12);
  return `${base}--${hash}`;
}

function validWorkspaceContext(value: WorkspacePlanContext | undefined): value is WorkspacePlanContext {
  return Boolean(
    value
      && (value.scope === "project" || value.scope === "stream")
      && value.id
      && value.root
      && value.dir
      && value.projectID,
  );
}

export function resolvePlanContext(
  workdir: string,
  sessionID: string,
  workspaceContext?: WorkspacePlanContext,
): PlanContextInfo {
  if (validWorkspaceContext(workspaceContext)) {
    const dir = path.resolve(workspaceContext.dir);
    return {
      ...workspaceContext,
      root: canonicalPath(workspaceContext.root),
      dir,
      plans: path.join(dir, "plans"),
      sessionID,
    };
  }

  const storageID = sessionStorageID(sessionID);
  const dir = path.join(dataHome(), "pi", "sessions", storageID);
  return {
    scope: "session",
    id: sessionID,
    sessionID,
    root: canonicalPath(workdir),
    dir,
    plans: path.join(dir, "plans"),
  };
}

export function ensurePlanStore(info: PlanContextInfo): PlanContextInfo {
  mkdirSync(path.join(info.plans, "active"), { recursive: true });
  mkdirSync(path.join(info.plans, "archive"), { recursive: true });
  return info;
}
