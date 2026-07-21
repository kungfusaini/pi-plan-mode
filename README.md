# pi-plan-mode

Read-only planning mode and durable project plans for the [Pi coding agent](https://pi.dev).

## Features

- `Tab` or `/plan` toggles a read-only exploration mode; `/plan <task>` starts a planning request.
- Disables `edit` and `write` and blocks common mutating shell commands while planning.
- Durable `pi_plan_create`, `pi_plan_list`, `pi_plan_current`, `pi_plan_read`, `pi_plan_update`, and `pi_plan_archive` tools.
- Explicit **Approve and select / Approve / Discuss further** save flow.
- Dim-grey `Plan Selected` footer indicator and `/plan-show` Markdown viewer for the selected plan.
- XDG-backed storage outside repositories.
- Works without a project-management plugin.
- Reuses the shared Pi project registry when present, so independently installed project tools converge on the same storage.
- Preserves other installed tools in plan mode; session todo tools are supported but not required.

## Storage

Plans are stored under:

```text
${XDG_DATA_HOME:-~/.local/share}/pi/projects/<project-id>/plans/
├── active/
├── archive/
└── current.json
```

The project ID is a stable slug plus the first 12 characters of a SHA-256 hash of the canonical project root. If `${XDG_DATA_HOME}/pi/projects/registry.json` exists, the longest matching active project root or alias is used. Otherwise the extension discovers a Git root and finally falls back to the current working directory.

This convention matches Pi project/workspace tools without requiring them as a dependency.

## Install

```bash
pi install npm:@kungfusaini/pi-plan-mode
```

Try a local checkout:

```bash
pi -e ./src/index.ts
```

## Commands

```text
Tab               Toggle plan mode and the PLAN tag above the input
/plan             Toggle plan mode
/plan on          Enable plan mode
/plan off         Disable plan mode
/plan <task>      Enable plan mode and submit the task
/plans            List active plans
/plans archive    List archived plans
/plans all        List every plan
/plan-show        Show the selected plan
```

## Plan model

A durable plan records intended approach, scope, risks, and completion criteria. It is not a live checklist. Use a separate session todo extension for execution progress when one is installed.

Update a durable plan only when its intended route changes. Archive it when the work is complete.

## Development

```bash
npm install
npm run check
npm pack --dry-run
```

## Security

Pi extensions run with your user permissions. Plan mode is a guardrail, not an operating-system sandbox. Its shell filter blocks common mutation patterns but cannot prove arbitrary shell commands are read-only.

## License

[MIT](./LICENSE) © Sumeet Saini
