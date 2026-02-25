# Screen Reader Automation (Prototype)

This repository contains an experimental Node.js + TypeScript tool for automated screen reader testing, starting with Playwright-driven keyboard navigation and VoiceOver announcements captured via Guidepup.

## Goals
The goal is to explore whether screen reader output can be collected programmatically in a way that is useful for:
- **Accessibility testing**
- **UI library evaluation** (e.g., headless UI components)
- **Developer education and debugging**
- **Early detection of accessibility regressions**

> This is not a replacement for manual testing. It is a research and prototyping effort.

## What this tool does
Starts and uses Playwright to:
- Load a page
- Control keyboard focus (Tab navigation)

Starts and uses VoiceOver (macOS) via Guidepup to:
- Announce the currently focused element

Captures:
- DOM focus information
- VoiceOver spoken output

Stops VoiceOver

Stops Playwright

  Supports different traversal modes via command-line flags
