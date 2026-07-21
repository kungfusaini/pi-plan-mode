export const PLAN_MODE_TOOLS = [
  "read",
  "bash",
  "grep",
  "find",
  "ls",
  "question",
  "pi_todo",
  "pi_plan_create",
  "pi_plan_current",
  "pi_plan_list",
  "pi_plan_read",
  "pi_plan_update",
  "pi_plan_archive",
];

export const PLAN_MODE_DISABLED_TOOLS = new Set(["edit", "write"]);
const PLAN_MODE_MANAGED_TOOLS = new Set([...PLAN_MODE_TOOLS, "edit", "write"]);

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

export function getPlanModeTools(activeToolNames: string[], allToolNames: string[]): string[] {
  const available = new Set(allToolNames);
  return unique([
    ...activeToolNames.filter((name) => !PLAN_MODE_DISABLED_TOOLS.has(name)),
    ...PLAN_MODE_TOOLS,
  ]).filter((name) => available.has(name));
}

export function getNormalModeTools(activeToolNames: string[]): string[] {
  return unique([
    "read",
    "bash",
    "edit",
    "write",
    ...activeToolNames.filter((name) => !PLAN_MODE_MANAGED_TOOLS.has(name)),
  ]);
}

export function mutatingBashReason(command: string): string | undefined {
  const stripped = command
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .join(" && ");
  const patterns: Array<[RegExp, string]> = [
    [/\b(rm|rmdir|mv|chmod|chown|mkdir|touch|truncate)\b/, "filesystem mutation"],
    [/\b(cp|rsync|scp)\b/, "file copy can mutate workspace"],
    [/\b(git\s+(add|commit|checkout|switch|reset|rebase|merge|cherry-pick|stash|clean|restore|apply|am|pull|push|worktree\s+add|worktree\s+remove))\b/, "git state mutation"],
    [/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update|upgrade|dedupe|link|unlink|audit\s+fix)\b/, "dependency mutation"],
    [/\b(pip|pip3|poetry|uv|cargo|go)\s+(install|add|remove|update|get|mod\s+tidy)\b/, "dependency mutation"],
    [/\b(npx|pnpm\s+dlx|yarn\s+dlx)\b/, "external command may mutate workspace"],
    [/\b(prettier|eslint|ruff|black|isort|gofmt|rustfmt)\b.*\b(--write|--fix|-w)\b/, "formatter/linter write mode"],
    [/(^|[^<])>\s*[^&]|>>|\btee\b/, "shell redirection writes files"],
  ];
  for (const [pattern, reason] of patterns) {
    if (pattern.test(stripped)) return reason;
  }
  return undefined;
}
