import assert from "node:assert/strict";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePlanContext, type WorkspacePlanContext } from "../src/context.ts";

test("without workspace context plans are scoped to the Pi session", () => {
  const previous = process.env.XDG_DATA_HOME;
  const dataHome = mkdtempSync(path.join(tmpdir(), "pi-plan-data-"));
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-session-"));
  process.env.XDG_DATA_HOME = dataHome;

  try {
    const first = resolvePlanContext(root, "session-one");
    const same = resolvePlanContext(root, "session-one");
    const second = resolvePlanContext(root, "session-two");

    assert.equal(first.scope, "session");
    assert.equal(first.id, "session-one");
    assert.equal(first.root, realpathSync(root));
    assert.equal(first.plans, same.plans);
    assert.notEqual(first.plans, second.plans);
    assert.match(first.plans, /pi\/sessions\/session-one--[a-f0-9]{12}\/plans$/);
  } finally {
    if (previous === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previous;
  }
});

test("workspace project context selects project-scoped plan storage", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-project-"));
  const dir = path.join(root, "xdg-project");
  const workspace: WorkspacePlanContext = {
    scope: "project",
    id: "project-id",
    projectID: "project-id",
    root,
    dir,
  };

  const info = resolvePlanContext(root, "session-one", workspace);
  assert.equal(info.scope, "project");
  assert.equal(info.projectID, "project-id");
  assert.equal(info.sessionID, "session-one");
  assert.equal(info.plans, path.join(dir, "plans"));
});

test("workspace stream context selects stream-scoped plan storage", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pi-plan-stream-"));
  const dir = path.join(root, "xdg-project", "streams", "feature");
  const workspace: WorkspacePlanContext = {
    scope: "stream",
    id: "project-id/feature",
    projectID: "project-id",
    streamID: "feature",
    root,
    dir,
  };

  const info = resolvePlanContext(root, "session-one", workspace);
  assert.equal(info.scope, "stream");
  assert.equal(info.projectID, "project-id");
  assert.equal(info.streamID, "feature");
  assert.equal(info.plans, path.join(dir, "plans"));
});
