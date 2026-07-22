# pi-plan-mode

Read-only planning mode and durable scoped plans for the [Pi coding agent](https://pi.dev).

## Demo

![pi-plan-mode demo](./assets/demo.gif)

## Features

- `Ctrl+Alt+P` or `/plan` toggles a read-only exploration mode; `/plan <task>` starts a planning request.
- Disables `edit` and `write` and blocks common mutating shell commands while planning.
- Durable `pi_plan_create`, `pi_plan_list`, `pi_plan_current`, `pi_plan_read`, `pi_plan_update`, and `pi_plan_archive` tools.
- Explicit **Approve and select / Approve / Discuss further** save flow.
- Dim-grey `Plan Selected` footer indicator and `/plan-show` Markdown viewer for the selected plan.
- XDG-backed storage outside repositories.
- Works without a workspace plugin by keeping plans isolated to the current Pi session.
- Optionally uses project- or stream-scoped storage when an enabled workspace plugin provides that context at runtime.
- Preserves other installed tools in plan mode; session todo tools are supported but not required.

## Plan scope and storage

The extension resolves plan scope in this order:

1. **Workspace stream:** when an enabled workspace plugin reports an active stream, plans and the selected-plan pointer belong to that stream.
2. **Workspace project:** when an enabled workspace plugin reports project scope, plans and selection belong to that project.
3. **Standalone session:** when no workspace plugin provides context, plans and selection belong only to the current Pi session.

Storage stays outside repositories under the XDG data directory:

```text
# Standalone session scope
${XDG_DATA_HOME:-~/.local/share}/pi/sessions/<session-id>--<hash>/plans/

# Workspace project scope
${XDG_DATA_HOME:-~/.local/share}/pi/projects/<project-id>/plans/

# Workspace stream scope
${XDG_DATA_HOME:-~/.local/share}/pi/projects/<project-id>/streams/<stream-id>/plans/
```

Each `plans/` directory contains:

```text
active/
archive/
current.json
```

Workspace integration uses Pi's runtime event bus rather than a package dependency or stale registry detection. If no provider answers, the extension always falls back to session scope.

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
Ctrl+Alt+P        Toggle plan mode and the PLAN tag above the input
/plan             Toggle plan mode
/plan on          Enable plan mode
/plan off         Disable plan mode
/plan <task>      Enable plan mode and submit the task
/plans            List active plans
/plans archive    List archived plans
/plans all        List every plan
/plan-show        Show the selected plan
```

## Shortcut configuration

The default plan-mode shortcut is `ctrl+alt+p`, avoiding Pi's built-in `tab` autocomplete binding.

To set a different shortcut, create `${XDG_CONFIG_HOME:-~/.config}/pi/agent/plan-mode.json`:

```json
{
  "toggleShortcut": "alt+p"
}
```

You can also override it per process with `PI_PLAN_MODE_SHORTCUT=alt+p`.

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
