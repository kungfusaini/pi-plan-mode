import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ProjectContextInfo } from "../src/context.ts";
import { archivePlan, createPlan, listPlans, resolveCurrentPlan, setCurrentPlan, updatePlan } from "../src/plans.ts";

function context(): ProjectContextInfo {
  const dir = mkdtempSync(path.join(tmpdir(), "pi-plan-store-"));
  return { id: "example--123456789abc", root: "/example", dir, plans: path.join(dir, "plans") };
}

test("plan lifecycle uses active, current, and archive storage", () => {
  const info = context();
  const created = createPlan(info, { title: "Ship feature", body: "## Goal\n\nShip it." });
  assert.equal(listPlans(info).length, 1);

  setCurrentPlan(info, created.id);
  assert.equal(resolveCurrentPlan(info)?.id, created.id);

  const updated = updatePlan(info, { id: created.id, body: "## Goal\n\nShip it safely." });
  assert.match(updated.content, /Ship it safely/);
  assert.match(updated.content, /^Created:/m);

  const archived = archivePlan(info, { id: created.id, result: "Released." });
  assert.equal(archived.status, "archive");
  assert.equal(listPlans(info).length, 0);
  assert.equal(listPlans(info, "archive").length, 1);
  assert.equal(resolveCurrentPlan(info, "all"), undefined);
});
