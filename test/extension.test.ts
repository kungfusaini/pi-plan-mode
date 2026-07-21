import assert from "node:assert/strict";
import test from "node:test";
import planModeExtension, { LEGACY_STATE_ENTRY_TYPE, STATE_ENTRY_TYPE } from "../src/index.ts";

test("extension registers plan commands, tools, and legacy state migration", async () => {
  const handlers = new Map<string, Function[]>();
  const commands = new Map<string, any>();
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
    registerTool(tool: any) { tools.set(tool.name, tool); },
    sendUserMessage() {},
    setActiveTools(names: string[]) { selected = names; },
  };
  planModeExtension(pi);

  assert.ok(commands.has("plan"));
  assert.ok(commands.has("plans"));
  assert.deepEqual([...tools.keys()], ["pi_plan_create", "pi_plan_list", "pi_plan_current", "pi_plan_read", "pi_plan_update", "pi_plan_archive"]);

  const statuses: unknown[] = [];
  const ctx: any = {
    cwd: process.cwd(),
    sessionManager: {
      getBranch: () => [{ type: "custom", customType: LEGACY_STATE_ENTRY_TYPE, data: { enabled: true, toolsBeforePlanMode: active } }],
      getEntries: () => [],
    },
    ui: {
      notify() {},
      setStatus(_key: string, value: unknown) { statuses.push(value); },
      theme: { fg: (_color: string, value: string) => value },
    },
  };
  await handlers.get("session_start")?.[0]({}, ctx);
  assert.ok(!selected.includes("edit"));
  assert.ok(selected.includes("pi_todo"));
  assert.equal(statuses.at(-1), "plan");

  await commands.get("plan").handler("off", ctx);
  assert.deepEqual(selected, active);
  assert.equal(entries.at(-1).customType, STATE_ENTRY_TYPE);
});
