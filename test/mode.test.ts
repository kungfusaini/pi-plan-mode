import assert from "node:assert/strict";
import test from "node:test";
import { getPlanModeTools, mutatingBashReason } from "../src/mode.ts";

test("plan mode removes writes, preserves installed tools, and enables available plan helpers", () => {
  const result = getPlanModeTools(
    ["read", "bash", "edit", "write", "web_search", "pi_todo"],
    ["read", "bash", "edit", "write", "web_search", "pi_todo", "pi_plan_read", "question"],
  );
  assert.deepEqual(result, ["read", "bash", "web_search", "pi_todo", "question", "pi_plan_read"]);
});

test("mutating bash filter catches common writes", () => {
  assert.equal(mutatingBashReason("git status"), undefined);
  assert.equal(mutatingBashReason("rg plan src"), undefined);
  assert.match(mutatingBashReason("git commit -am test") || "", /git state/);
  assert.match(mutatingBashReason("printf hi > file") || "", /redirection/);
});
