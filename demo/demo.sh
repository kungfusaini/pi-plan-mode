#!/usr/bin/env bash
set -euo pipefail
BLUE=$'\033[38;5;81m'; GREEN=$'\033[38;5;114m'; YELLOW=$'\033[38;5;228m'; DIM=$'\033[38;5;245m'; RED=$'\033[38;5;203m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
pause(){ sleep "${1:-0.8}"; }
typeout(){ local s="$1"; local i; for ((i=0; i<${#s}; i++)); do printf '%s' "${s:i:1}"; sleep 0.01; done; printf '\n'; }
cmd(){ printf '\n%s❯%s ' "$BLUE" "$RESET"; typeout "$1"; pause "${2:-0.65}"; }
pi(){ printf '%sPi%s  %s\n' "$GREEN" "$RESET" "$1"; pause "${2:-0.75}"; }
tool(){ printf '%s%s%s\n' "$DIM" "$1" "$RESET"; pause "${2:-0.55}"; }
clear
printf '%spi-plan-mode%s\n' "$BOLD$BLUE" "$RESET"
printf '%sUser flow: request a plan → clarify → approve → /plan-show%s\n\n' "$DIM" "$RESET"
pause 0.8

cmd '/plan add Stripe subscriptions to the app' 0.8
pi 'PLAN mode enabled. I will explore and draft a plan before making changes.' 0.8
tool 'read package.json'
tool 'read src/routes/billing.ts'
tool 'bash: rg "stripe|subscription|billing" src test'
pi 'I found existing billing routes, but one decision affects the implementation.' 0.6

printf '\n%s? Which checkout flow should this plan use?%s\n' "$BOLD$YELLOW" "$RESET"; pause 0.35
printf '  %s› Hosted Stripe Checkout%s\n' "$GREEN" "$RESET"; pause 0.25
printf '    Embedded pricing table\n'; pause 0.2
printf '    Custom payment form\n'; pause 0.8

cmd 'Hosted Stripe Checkout' 0.7
pi 'Great — I will plan for hosted checkout and a billing-portal return flow.' 0.8

printf '\n%sPlan: Add Stripe subscriptions%s\n' "$BOLD" "$RESET"; pause 0.35
printf '  • Scope: products, checkout session, webhook, customer portal\n'; pause 0.35
printf '  • Approach: add env validation, server route, webhook handler, tests\n'; pause 0.35
printf '  • Risks: webhook signature failures, duplicate events, missing secrets\n'; pause 0.35
printf '  • Done when: subscription create/cancel works locally and tests pass\n'; pause 0.75

printf '\n%s? Save this durable plan?%s\n' "$BOLD$YELLOW" "$RESET"; pause 0.35
printf '  %s› Approve and select%s\n' "$GREEN" "$RESET"; pause 0.22
printf '    Approve\n'; pause 0.22
printf '    Discuss further\n'; pause 0.75

cmd 'Approve and select' 0.6
tool 'pi_plan_create: Add Stripe subscriptions'
pi 'Saved and selected durable plan: 2026-07-22-add-stripe-subscriptions.md' 0.9
printf '%sFooter:%s Plan Selected\n' "$DIM" "$RESET"; pause 0.8

cmd '/plan-show' 0.75
printf '\n%s# Add Stripe subscriptions%s\n' "$BOLD" "$RESET"; pause 0.25
printf 'Scope: products, checkout session, webhook, customer portal\n'; pause 0.25
printf 'Approach: env validation → checkout route → webhook handler → tests\n'; pause 0.25
printf 'Risks: webhook signatures, duplicate events, missing secrets\n'; pause 0.25
printf 'Completion: create/cancel flow works locally and tests pass\n\n'; pause 0.5
printf '%sPlan first. Clarify decisions. Approve deliberately. Resume with context.%s\n' "$GREEN" "$RESET"; pause 2
