#!/usr/bin/env bash
set -euo pipefail
BLUE=$'\033[38;5;81m'; GREEN=$'\033[38;5;114m'; YELLOW=$'\033[38;5;228m'; DIM=$'\033[38;5;245m'; RED=$'\033[38;5;203m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
pause(){ sleep "${1:-0.8}"; }
typeout(){ local s="$1"; local i; for ((i=0; i<${#s}; i++)); do printf '%s' "${s:i:1}"; sleep 0.012; done; printf '\n'; }
cmd(){ printf '\n%s❯%s ' "$BLUE" "$RESET"; typeout "$1"; pause 0.55; }
agent(){ printf '%sPi%s  %s\n' "$GREEN" "$RESET" "$1"; pause "${2:-0.75}"; }
clear
printf '%sPI PLAN MODE%s\n' "$BOLD$BLUE" "$RESET"
printf '%sDurable planning workflows for the Pi coding agent%s\n\n' "$DIM" "$RESET"
cmd 'pi -e ./src/index.ts'
agent 'Plan mode extension loaded: Ctrl+Alt+P or /plan' 0.9
cmd '/plan add OAuth login to the dashboard'
agent 'PLAN mode enabled — exploring only, mutating tools are blocked.' 0.9
printf '%sPLAN%s  Scope: dashboard auth, callback route, session storage\n' "$YELLOW" "$RESET"; pause 0.45
printf '%sPLAN%s  Risks: token leakage, redirect mismatch, regression in logout\n' "$YELLOW" "$RESET"; pause 0.45
printf '%sPLAN%s  Success: login works locally, tests pass, no secret committed\n' "$YELLOW" "$RESET"; pause 0.7
cmd 'try to edit src/auth.ts'
printf '%sBlocked:%s edit/write tools are disabled while planning.\n' "$RED" "$RESET"; pause 0.9
cmd 'Approve and select'
agent 'Saved durable plan: 2026-07-22-add-oauth-login.md' 0.75
printf '%sFooter:%s Plan Selected\n' "$DIM" "$RESET"; pause 0.8
cmd '/plans'
printf 'Active plans\n'; printf '  ✓ Add OAuth login to the dashboard %s(selected)%s\n' "$DIM" "$RESET"; pause 0.9
cmd '/plan-show'
printf '%s# Add OAuth login to the dashboard%s\n' "$BOLD" "$RESET"; pause 0.25
printf 'Approach → configure provider, implement callback, persist session, test auth flow\n'; pause 0.45
printf 'Completion → reviewed plan is available in future Pi sessions\n\n'; pause 0.5
printf '%sPlan first. Approve deliberately. Execute with shared context.%s\n' "$GREEN" "$RESET"; pause 2
