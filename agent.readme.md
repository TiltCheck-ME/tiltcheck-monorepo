# TiltCheck Development Agent — README

This document explains what the TiltCheck Development Agent is, how it works, and how contributors should use it.

## What Is This Agent?

This repository uses a GitHub Copilot Custom Agent to help maintain and expand the TiltCheck ecosystem.  
It acts as a co-author and technical collaborator for the founder (jmenichole) while also assisting contributors.

The agent:
- understands all internal documentation inside `/docs/tiltcheck/`
- uses the founder’s voice, tone, and development style
- ensures modules remain modular, scrappy, and cheap to run
- assists with architecture, APIs, Discord bots, and trust engines
- asks clarifying questions whenever context is missing
- warns against bad patterns (custodial flows, legal risks, unnecessary complexity)

## How to Use It

The agent triggers automatically when you:
- open a PR,  
- create a file,  
- edit code,  
- ask Copilot for help inside GitHub.

You can give it instructions like:
- “Refactor JustTheTip fee logic”  
- “Add a new endpoint to CollectClock”  
- “Create a new Discord command for /trust explain”  

The agent will look at docs + existing code before answering.

## Rules It Enforces

- Non-custodial crypto flows only  
- Flat-fee rule (0.07 SOL unless changed)  
- Avoids judgmental or shaming language  
- Anti-scam, anti-confusion, anti-tilt safety measures  
- Keeps modules independent via Event Router  
- Prefers free-tier infra  
- No hallucination; ask if unsure  

## When Not to Use The Agent

- For sensitive personal data  
- For legal advice  
- For financial/gambling advice  
- For code that intentionally breaks Discord ToS  

## Updating the Agent

When docs change, update:

.github/agents/tiltcheck-agent.yml


## Ownership

Created and maintained by **jmenichole**.  
TiltCheck Ecosystem © 2024–2025.
