import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import planModeExtension, { LEGACY_STATE_ENTRY_TYPE, STATE_ENTRY_TYPE } from "../src/index.ts";
import { ensureProjectStore, resolveProjectContext } from "../src/context.ts";
import { createPlan, setCurrentPlan } from "../src/plans.ts";

test("extension registers plan commands, tools, and legacy state migration", async () => {
  const handlers = new Map<string, Function[]>();
  const commands = new Map<string, any>();
  const shortcuts = new Map<string, any>();
  const tools = new Map<string, any>();
  const active = ["read", "bash", "edit", "write", "pi_todo"];
  let selected = [...active];
  const entries: any[] = [];
  const pi: any = {
    appendEntry(customType: string, data: unknown) { entries.push({ type: "custom", customType, data }); },
    getActiveTools() { return selected; },
    getAllTools() { return [...active, "question", "pi_plan_create", "pi_plan_current", "pi_plan_list", "pi_plan_read", "pi_plan_update", "pi_plan_archive"].map((name) => ({ name })); },
    on(name: string, handler: Function) { handlers.set(name, [...(handlers.get(name) ?? []), handler]); },
    registerCommand(name: string, command: unknown) { commands.set(name, command); },
    registerShortcut(key: string, shortcut: unknown) { shortcuts.set(key, shortcut); },
    registerTool(tool: any) { tools.set(tool.name, tool); },
    sendUserMessage() {},
    setActiveTools(names: string[]) { selected = names; },
  };
  planModeExtension(pi);

  assert.ok(commands.has("plan"));
  assert.ok(commands.has("plans"));
  assert.ok(commands.has("plan-show"));
  assert.ok(shortcuts.has("tab"));
  assert.deepEqual([...tools.keys()], ["pi_plan_create", "pi_plan_list", "pi_plan_current", "pi_plan_read", "pi_plan_update", "pi_plan_archive"]);

  const previousDataHome = process.env.XDG_DATA_HOME;
  const dataHome = mkdtempSync(path.join(tmpdir(), "pi-plan-extension-data-"));
  const projectRoot = mkdtempSync(path.join(tmpdir(), "pi-plan-extension-project-"));
  mkdirSync(path.join(projectRoot, ".git"));
  process.env.XDG_DATA_HOME = dataHome;
  const info = ensureProjectStore(resolveProjectContext(projectRoot));
  const current = createPlan(info, { title: "Visible plan", body: "## Goal\n\nShow this plan." });
  setCurrentPlan(info, current.id);

  const statuses = new Map<string, unknown>();
  const themed: Array<{ color: string; value: string }> = [];
  const notifications: Array<{ message: string; level: string }> = [];
  const ctx: any = {
    mode: "print",
    cwd: projectRoot,
    sessionManager: {
      getBranch: () => [{ type: "custom", customType: LEGACY_STATE_ENTRY_TYPE, data: { enabled: true, toolsBeforePlanMode: active } }],
      getEntries: () => [],
    },
    ui: {
      notify(message: string, level: string) { notifications.push({ message, level }); },
      setStatus(key: string, value: unknown) { statuses.set(key, value); },
      theme: { fg: (color: string, value: string) => { themed.push({ color, value }); return value; } },
    },
  };
  try {
    await handlers.get("session_start")?.[0]({}, ctx);
    assert.ok(!selected.includes("edit"));
    assert.ok(selected.includes("pi_todo"));
    assert.equal(statuses.get("plan-mode"), "PLAN");
    assert.equal(statuses.get("plan-selected"), "Plan Selected");
    assert.ok(themed.some(({ color, value }) => color === "dim" && value === "Plan Selected"));

    await shortcuts.get("tab").handler(ctx);
    assert.deepEqual(selected, active);
    assert.equal(statuses.get("plan-mode"), undefined);
    await shortcuts.get("tab").handler(ctx);
    assert.ok(!selected.includes("edit"));
    assert.equal(statuses.get("plan-mode"), "PLAN");

    await commands.get("plan-show").handler("", ctx);
    assert.match(notifications.at(-1)?.message || "", /Show this plan/);

    await tools.get("pi_plan_current").execute("call", { action: "clear" }, undefined, undefined, ctx);
    assert.equal(statuses.get("plan-selected"), undefined);

    await commands.get("plan").handler("off", ctx);
    assert.deepEqual(selected, active);
    assert.equal(entries.at(-1).customType, STATE_ENTRY_TYPE);
  } finally {
    if (previousDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousDataHome;
  }
});
