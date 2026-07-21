import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { ensureProjectStore, resolveProjectContext, type ProjectContextInfo } from "./context.ts";
import { getNormalModeTools, getPlanModeTools, mutatingBashReason, PLAN_MODE_DISABLED_TOOLS } from "./mode.ts";
import {
  archivePlan,
  clearCurrentPlanRef,
  createPlan,
  formatPlanList,
  listPlans,
  planWorkflowContext,
  resolveCurrentPlan,
  resolvePlan,
  setCurrentPlan,
  updatePlan,
} from "./plans.ts";

export const STATE_ENTRY_TYPE = "pi-plan-mode";
export const LEGACY_STATE_ENTRY_TYPE = "project-workspaces-plan-mode";
const APPROVAL_OPTIONS = ["Approve and select", "Approve", "Discuss further"];

interface PlanModeState {
  enabled: boolean;
  toolsBeforePlanMode?: string[];
}

function contextInfo(ctx: ExtensionContext): ProjectContextInfo {
  return ensureProjectStore(resolveProjectContext(ctx.cwd));
}

function textResult(text: string, details: Record<string, unknown> = {}) {
  return { content: [{ type: "text" as const, text }], details };
}

function latestPlanApproval(ctx: ExtensionContext): "select" | "approve" | "discuss" | undefined {
  for (const entry of [...ctx.sessionManager.getBranch()].reverse()) {
    if (entry.type !== "message") continue;
    const message = entry.message as any;
    if (message.role !== "toolResult") continue;
    if (message.toolName === "pi_plan_create") return undefined;
    if (message.toolName !== "question") continue;
    const details = message.details;
    if (details?.cancelled) return undefined;
    const labels = Array.isArray(details?.options) ? details.options.map((option: any) => option?.label) : [];
    if (labels.length !== APPROVAL_OPTIONS.length) return undefined;
    if (!APPROVAL_OPTIONS.every((label, index) => labels[index] === label)) return undefined;
    const value = String(details.value || details.answer || "");
    if (value === APPROVAL_OPTIONS[0]) return "select";
    if (value === APPROVAL_OPTIONS[1]) return "approve";
    if (value === APPROVAL_OPTIONS[2]) return "discuss";
    return undefined;
  }
  return undefined;
}

function planModePrompt(info: ProjectContextInfo): string {
  return `You are in Pi plan mode. You may inspect, search, and reason, but you must not create, edit, delete, move, format, generate, or otherwise mutate project files. The only write-like exception is Pi's internal project plan storage through pi_plan_* tools after explicit user approval.

Use plan mode to separate research from implementation:
1. Understand the user's goal and constraints.
2. Explore relevant files, commands, docs, and project patterns.
3. Identify the implementation path, risks, edge cases, and verification commands.
4. Present a concrete plan that the user can approve or revise.

Question tool rules:
- Use the question tool for multiple-choice clarification and approval gates. Do not write numbered options in normal chat and wait for a typed reply.
- Ask clarification questions only when the answer materially changes scope, approach, sequencing, risk, or verification.
- If no important ambiguity exists, say you found no blockers and proceed.
- Keep options concise and high-signal, usually 2-4 options plus an option to continue with assumptions when acceptable.

Plan content rules:
- Build a detailed, practical plan, not a checkbox checklist.
- Include: Goal, Context, Recommended approach, Phases, Risks/assumptions/open questions, Verification commands, Files inspected, and Files likely to change.
- Do not include checkbox-style progress tracking in the durable plan.
- Use a session todo tool, when available, for live execution tracking. Do not use plan files for checklist progress.

Final approval flow is mandatory before saving:
1. Present the final draft plan in chat.
2. Call question with exactly these three options and allowCustom=false:
   - ${APPROVAL_OPTIONS[0]}
   - ${APPROVAL_OPTIONS[1]}
   - ${APPROVAL_OPTIONS[2]}
3. Do not call pi_plan_create, pi_plan_current, or pi_plan_update until the user selects one of those options through question.
4. If "${APPROVAL_OPTIONS[0]}": call pi_plan_create with select=true and the full plan body, then say "Plan saved and selected."
5. If "${APPROVAL_OPTIONS[1]}": call pi_plan_create with select=false and the full plan body, then say "Plan saved as active but not selected."
6. If "${APPROVAL_OPTIONS[2]}": do not save; continue discussion and refine the draft.

If the user asks to resume, continue, execute, or archive a plan, use pi_plan_read first when a current or single active plan exists. If executing a plan and a session todo tool is available, convert the plan phases into a concise live checklist before making changes.

${planWorkflowContext(info)}`;
}

export default function planModeExtension(pi: ExtensionAPI) {
  let planModeEnabled = false;
  let toolsBeforePlanMode: string[] | undefined;

  function persistState(): void {
    pi.appendEntry(STATE_ENTRY_TYPE, { enabled: planModeEnabled, toolsBeforePlanMode } satisfies PlanModeState);
  }

  function updateStatus(ctx: ExtensionContext): void {
    ctx.ui.setStatus("plan-mode", planModeEnabled ? ctx.ui.theme.fg("warning", "plan") : undefined);
  }

  function enablePlanMode(ctx: ExtensionContext): void {
    if (toolsBeforePlanMode === undefined) toolsBeforePlanMode = pi.getActiveTools();
    const allToolNames = pi.getAllTools().map((tool) => tool.name);
    pi.setActiveTools(getPlanModeTools(toolsBeforePlanMode, allToolNames));
    planModeEnabled = true;
    updateStatus(ctx);
    persistState();
  }

  function disablePlanMode(ctx: ExtensionContext): void {
    pi.setActiveTools(toolsBeforePlanMode ?? getNormalModeTools(pi.getActiveTools()));
    toolsBeforePlanMode = undefined;
    planModeEnabled = false;
    updateStatus(ctx);
    persistState();
  }

  pi.registerCommand("plan", {
    description: "Toggle Pi plan mode, or use /plan <task> to enable plan mode and ask the agent to draft a durable plan",
    handler: async (args, ctx) => {
      const raw = args.trim();
      const action = raw.toLowerCase();
      if (["off", "disable", "disabled", "exit"].includes(action)) {
        disablePlanMode(ctx);
        ctx.ui.notify("Plan mode disabled. Normal tools restored.", "info");
        return;
      }
      if (["on", "enable", "enabled"].includes(action) || !raw) {
        if (planModeEnabled && !raw) {
          disablePlanMode(ctx);
          ctx.ui.notify("Plan mode disabled. Normal tools restored.", "info");
          return;
        }
        enablePlanMode(ctx);
        ctx.ui.notify("Plan mode enabled. Repo write tools disabled; mutating bash is blocked.", "info");
        return;
      }
      enablePlanMode(ctx);
      ctx.ui.notify("Plan mode enabled. Starting planning request.", "info");
      pi.sendUserMessage(raw);
    },
  });

  pi.registerCommand("plans", {
    description: "List active Pi project plans",
    handler: async (args, ctx) => {
      const info = contextInfo(ctx);
      const status = ["active", "archive", "all"].includes(args.trim()) ? args.trim() : "active";
      ctx.ui.notify(formatPlanList(info, listPlans(info, status)), "info");
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getBranch?.() ?? ctx.sessionManager.getEntries();
    const stateEntry = entries
      .filter((entry: { type: string; customType?: string }) => entry.type === "custom" && [STATE_ENTRY_TYPE, LEGACY_STATE_ENTRY_TYPE].includes(entry.customType || ""))
      .pop() as { data?: PlanModeState } | undefined;
    if (stateEntry?.data) {
      planModeEnabled = Boolean(stateEntry.data.enabled);
      toolsBeforePlanMode = stateEntry.data.toolsBeforePlanMode;
    }
    if (planModeEnabled) {
      const allToolNames = pi.getAllTools().map((tool) => tool.name);
      pi.setActiveTools(getPlanModeTools(toolsBeforePlanMode ?? pi.getActiveTools(), allToolNames));
    }
    updateStatus(ctx);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const info = contextInfo(ctx);
    return { systemPrompt: `${event.systemPrompt}\n\n${planModeEnabled ? planModePrompt(info) : planWorkflowContext(info)}` };
  });

  pi.on("tool_call", async (event) => {
    if (!planModeEnabled) return;
    if (PLAN_MODE_DISABLED_TOOLS.has(event.toolName)) {
      return { block: true, reason: `Plan mode: ${event.toolName} is disabled. Use /plan off after the plan is approved if you want to implement.` };
    }
    if (event.toolName === "bash") {
      const command = typeof event.input.command === "string" ? event.input.command : "";
      const reason = mutatingBashReason(command);
      if (reason) return { block: true, reason: `Plan mode: blocked mutating bash (${reason}). Command: ${command}` };
    }
  });

  pi.registerTool({
    name: "pi_plan_create",
    label: "Plan Create",
    description: "Create a durable active Pi project plan after the final question approval flow. This tool verifies the latest approval question result; the select parameter is accepted for compatibility but the recorded user answer is authoritative.",
    promptSnippet: "Create a durable project plan after explicit approval.",
    promptGuidelines: [
      "Use pi_plan_create only after asking the final approval question with exactly: Approve and select, Approve, Discuss further.",
      "Do not use pi_plan_create when the user selected Discuss further.",
    ],
    parameters: Type.Object({
      title: Type.String({ description: "Short human-readable plan title" }),
      body: Type.String({ description: "Full detailed markdown plan body" }),
      select: Type.Optional(Type.Boolean({ description: "Deprecated compatibility hint. Actual selection is determined from the latest approval question result." })),
      task: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const approval = latestPlanApproval(ctx);
      if (!approval) return textResult("Refusing to create plan: ask the final approval question first with exactly Approve and select, Approve, Discuss further.");
      if (approval === "discuss") return textResult("Refusing to create plan: user selected Discuss further.");
      const shouldSelect = approval === "select";
      const info = contextInfo(ctx);
      const plan = createPlan(info, params);
      if (shouldSelect) setCurrentPlan(info, plan.id);
      return textResult([
        shouldSelect ? "Plan saved and selected." : "Plan saved as active but not selected.",
        `Plan: ${plan.title} (${plan.id})`,
        `Path: ${plan.path}`,
      ].join("\n"), { plan, selected: shouldSelect });
    },
    renderResult(result, _options, theme) {
      const first = result.content?.[0];
      const message = first?.type === "text" ? first.text : "Plan saved";
      return new Text(theme.fg("success", message), 0, 0);
    },
  });

  pi.registerTool({
    name: "pi_plan_list",
    label: "Plan List",
    description: "List durable Pi project plans for the current project.",
    parameters: Type.Object({ status: Type.Optional(Type.String({ description: "active, archive, or all" })) }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const info = contextInfo(ctx);
      const status = ["active", "archive", "all"].includes(params.status || "") ? params.status! : "active";
      const plans = listPlans(info, status);
      return textResult(formatPlanList(info, plans), { plans, status });
    },
  });

  pi.registerTool({
    name: "pi_plan_current",
    label: "Plan Current",
    description: "Show, set, or clear the current plan pointer for the current Pi project.",
    parameters: Type.Object({
      action: Type.Optional(Type.String({ description: "show, set, or clear" })),
      id: Type.Optional(Type.String({ description: "Plan id/path/title for action=set" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const info = contextInfo(ctx);
      const action = (params.action || "show").trim().toLowerCase();
      if (action === "clear") {
        clearCurrentPlanRef(info);
        return textResult("Current plan pointer cleared.");
      }
      if (action === "set") {
        if (!params.id) return textResult("action=set requires id");
        const plan = setCurrentPlan(info, params.id);
        return textResult(`Current plan set to ${plan.title} (${plan.id})\nPath: ${plan.path}`, { plan });
      }
      const current = resolveCurrentPlan(info, "all");
      if (!current) return textResult("No current plan is set.");
      return textResult([`Path: ${current.path}`, "", current.content].join("\n"), { plan: current });
    },
  });

  pi.registerTool({
    name: "pi_plan_read",
    label: "Plan Read",
    description: "Read a durable Pi project plan.",
    parameters: Type.Object({
      id: Type.Optional(Type.String({ description: "Plan id/path/title. If omitted, current or single active plan is used." })),
      status: Type.Optional(Type.String({ description: "active, archive, or all" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        const info = contextInfo(ctx);
        const status = ["active", "archive", "all"].includes(params.status || "") ? params.status! : "active";
        const plan = params.id ? resolvePlan(info, params.id, status) : (resolveCurrentPlan(info, status) || resolvePlan(info, undefined, status));
        return textResult([`Path: ${plan.path}`, "", plan.content].join("\n"), { plan });
      } catch (error) {
        return textResult(`❌ ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  pi.registerTool({
    name: "pi_plan_update",
    label: "Plan Update",
    description: "Update an active durable Pi project plan only when intended approach/scope/risks/completion criteria change. Do not use for checklist progress.",
    parameters: Type.Object({
      id: Type.Optional(Type.String()),
      title: Type.Optional(Type.String()),
      body: Type.String(),
      reason: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const info = contextInfo(ctx);
      const plan = updatePlan(info, params);
      return textResult(`Updated active plan: ${plan.title} (${plan.id})\nPath: ${plan.path}`, { plan });
    },
  });

  pi.registerTool({
    name: "pi_plan_archive",
    label: "Plan Archive",
    description: "Archive a completed active durable Pi project plan.",
    parameters: Type.Object({ id: Type.Optional(Type.String()), result: Type.Optional(Type.String()) }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const info = contextInfo(ctx);
      const plan = archivePlan(info, params);
      return textResult(`Archived plan: ${plan.title} (${plan.id})\nPath: ${plan.path}`, { plan });
    },
  });
}

export * from "./context.ts";
export * from "./mode.ts";
export * from "./plans.ts";
