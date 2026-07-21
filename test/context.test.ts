import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { projectID, resolveProjectContext } from "../src/context.ts";

test("projectID is deterministic for a canonical root", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-root-"));
  assert.equal(projectID(root), projectID(path.join(root, ".")));
  assert.match(projectID(root), /--[a-f0-9]{12}$/);
});

test("resolveProjectContext uses the longest matching shared registry project", () => {
  const previous = process.env.XDG_DATA_HOME;
  const dataHome = mkdtempSync(path.join(tmpdir(), "pi-plan-data-"));
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-project-"));
  const nested = path.join(root, "packages", "app");
  mkdirSync(nested, { recursive: true });
  const id = projectID(root);
  const dir = path.join(dataHome, "pi", "projects", id);
  mkdirSync(path.dirname(path.join(dataHome, "pi", "projects", "registry.json")), { recursive: true });
  writeFileSync(path.join(dataHome, "pi", "projects", "registry.json"), JSON.stringify({
    v: 1,
    projects: { [id]: { id, root, dir, aliases: [root], status: "active" } },
  }));

  process.env.XDG_DATA_HOME = dataHome;
  try {
    const info = resolveProjectContext(nested);
    assert.equal(info.id, id);
    assert.equal(info.root, realpathSync(root));
    assert.equal(info.plans, path.join(dir, "plans"));
  } finally {
    if (previous === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previous;
  }
});

test("resolveProjectContext discovers a git root without a registry", () => {
  const previous = process.env.XDG_DATA_HOME;
  const dataHome = mkdtempSync(path.join(tmpdir(), "pi-plan-data-"));
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-git-"));
  const nested = path.join(root, "src", "feature");
  mkdirSync(path.join(root, ".git"));
  mkdirSync(nested, { recursive: true });

  process.env.XDG_DATA_HOME = dataHome;
  try {
    const info = resolveProjectContext(nested);
    assert.equal(info.root, realpathSync(root));
    assert.equal(info.id, projectID(root));
  } finally {
    if (previous === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previous;
  }
});
