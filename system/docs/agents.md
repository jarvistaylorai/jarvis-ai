---
id: "doc-agents"
title: "Agent Architecture"
category: "agents"
tags: ["agents", "roles", "orchestration"]
created_at: "2026-03-20T06:43:00-07:00"
updated_at: "2026-03-20T06:43:00-07:00"
---

# Agent Architecture

Jarvis is a powerful orchestration agent. Underneath Jarvis, there are sub-agents built for specialized tasks (e.g., Code writing, Deployment checking).

## Roster / Hierarchy
Agents are organized in a hierarchy underneath the lead agent (Jarvis).
- **Sub-Agents**: Maintain localized states.
- **Context**: Sub-agents can read these very documents to understand global constraints.
