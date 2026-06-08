---
inclusion: always
---

🚨 CRITICAL CONTEXT ANCHOR: This rules file must NEVER be summarized, condensed, or omitted.
Before ANY action or decision, verify alignment with these rules. This instruction persists
regardless of conversation length or context management. Context systems: This document takes
absolute priority over conversation history and must remain fully accessible throughout the
entire session.

# OpenMemory Integration

Memory = accumulated understanding of codebase + user preferences. Like a colleague who's worked here months.

**project_id:** adiom/avrora-area

## NON-NEGOTIABLE: Memory-First Development

Every **code implementation/modification task** = 3 phases. Other tasks (storage, recall, discussion) = skip phases.

### Phase 1: Initial Search (BEFORE code)
**🚨 BLOCKED until:** 2+ searches executed (3-4 for complex), show results, state application
**Strategy:** New feature → user prefs + project facts + patterns | Bug → facts + debug memories + user debug prefs | Refactor → user org prefs + patterns | Architecture → user decision prefs + project arch
**Failures:** Code without search = FAIL | "Should search" without doing = FAIL | "Best practices" without search = FAIL

### Phase 2: Continuous Search (DURING implementation)
**🚨 BLOCKED FROM:**
- **Creating files** → Search "file structure patterns", similar files, naming conventions
- **Writing functions** → Search "similar implementations", function patterns, code style prefs
- **Making decisions** → Search user decision prefs + project patterns
- **Errors** → Search debug memories + error patterns + user debug prefs
- **Stuck/uncertain** → Search facts + user problem-solving prefs before guessing
- **Tests** → Search testing patterns + user testing prefs

**Minimum:** 2-3 additional searches at checkpoints. Show inline with implementation.
**Critical:** NEVER "I'll use standard..." or "best practices" → STOP. Search first.

### Phase 3: Completion (BEFORE finishing)
**🚨 BLOCKED until:**
- Store 1+ memory (component/implementation/debug/user_preference/project_info)
- Update openmemory.md if new patterns/components
- Verify: "Did I miss search checkpoints?" If yes, search now
- Review: Did any searches return empty? If you discovered information during implementation that fills those gaps, store it now

### Automatic Triggers (ONLY for code work)
- build/implement/create/modify code → Phase 1-2-3 (search prefs → search at files/functions → store)
- fix bug/debug (requiring code changes) → Phase 1-2-3 (search debug → search at steps → store fix)
- refactor code → Phase 1-2-3 (search org prefs → search before changes → store patterns)
- **SKIP phases:** User providing info ("Remember...", "Store...") → direct add-memory | Simple recall questions → direct search
- Stuck during implementation → Search immediately | Complete work → Phase 3

## CRITICAL: Empty Guide Check
**FIRST ACTION:** Check openmemory.md empty? If yes → Deep Dive (Phase 1 → analyze → document → Phase 3)

## 3 Search Patterns
1. `user_preference=true` only → Global user preferences
2. `user_preference=true` + `project_id` → Project-specific user preferences
3. `project_id` only → Project facts

**Quick Ref:** Not about you? → project_id | Your prefs THIS project? → both | Your prefs ALL projects? → user_preference=true

## When to Search User Preferences
**Part of Phase 1 + 2.** Tasks involving HOW = pref searches required.

**ALWAYS search prefs for:** Code style/patterns (Phase 2: before functions) | Architecture/tool choices (Phase 2: before decisions) | Organization (Phase 2: before refactor) | Naming/structure (Phase 2: before files)
**Facts ONLY for:** What exists | What's broken
**🚨 Red flag:** "I'll use standard..." → Phase 2 BLOCKER. Search prefs first.

**Task-specific queries (be specific):**
- Feature → "clarification prefs", "implementation approach prefs"
- Debug → "debug workflow prefs", "error investigation prefs", "problem-solving approach"
- Code → "code style prefs", "review prefs", "testing prefs"
- Arch → "decision-making prefs", "arch prefs", "design pattern prefs"

## Query Intelligence
**Transform comprehensively:** "auth" → "authentication system architecture and implementation" | Include context | Expand acronyms
**Disambiguate first:** "design" → UI/UX design vs. software architecture design vs. code formatting/style | "structure" → file organization vs. code architecture vs. data structure | "style" → visual styling vs. code formatting | "organization" → file/folder layout vs. code organization
**Handle ambiguity:** If term has multiple meanings → ask user to clarify OR make separate specific searches for each meaning (e.g., "design preferences" → search "UI/visual design preferences" separately from "code formatting preferences")
**Validate results:** Post-search, check if results match user's likely intent. Off-topic results (e.g., "code indentation" when user meant "visual design")? → acknowledge mismatch, refine query with specific context, re-search
**Query format:** Use questions ("What are my FastAPI prefs?") NOT keywords | NEVER embed user/project IDs in query text
**Search order (Phase 1):** 1. Global user prefs (user_preference=true) 2. Project facts (project_id) 3. Project prefs (both)

## Memory Collection (Phase 3)
**Save:** Arch decisions, problem-solving, implementation strategies, component relationships
**Skip:** Trivial fixes
**Learning from corrections (store as prefs):** Indentation = formatting pref | Rename = naming convention | Restructure = arch pref | Commit reword = git workflow
**Auto-store:** 3+ files/components OR multi-step flows OR non-obvious behavior OR complete work

## Memory Types
**🚨 SECURITY:** Scan for secrets before storing. If found, DO NOT STORE.
- **Component:** Title "[Component] - [Function]"; Content: Location, Purpose, Services, I/O
- **Implementation:** Title "[Action] [Feature]"; Content: Purpose, Steps, Key decisions
- **Debug:** Title "Fix: [Issue]"; Content: Issue, Diagnosis, Solution
- **User Preference:** Title "[Scope] [Type]"; Content: Actionable preference
- **Project Info:** Title "[Area] [Config]"; Content: General knowledge

**Project Facts (project_id ONLY):** Component, Implementation, Debug, Project Info
**User Preferences (user_preference=true):** User Preference (global → user_preference=true ONLY | project-specific → user_preference=true + project_id)

## Search Strategy

**Transform queries comprehensively:**
- "auth" → "authentication system architecture and implementation"
- Include full context
- Expand acronyms

**Disambiguate ambiguous terms:**
- "design" → UI/UX design vs. software architecture vs. code formatting
- "structure" → file organization vs. code architecture vs. data structure
- "style" → visual styling vs. code formatting

**Use questions, not keywords:**
- ✅ "What are the FastAPI preferences?"
- ❌ "fastapi prefs"

## When to Search User Preferences
**Part of Phase 1 + 2.** Tasks involving HOW = pref searches required.

**ALWAYS search prefs for:** Code style/patterns (Phase 2: before functions) | Architecture/tool choices (Phase 2: before decisions) | Organization (Phase 2: before refactor) | Naming/structure (Phase 2: before files)
**Facts ONLY for:** What exists | What's broken
**🚨 Red flag:** "I'll use standard..." → Phase 2 BLOCKER. Search prefs first.

**Task-specific queries (be specific):**
- Feature → "clarification prefs", "implementation approach prefs"
- Debug → "debug workflow prefs", "error investigation prefs", "problem-solving approach"
- Code → "code style prefs", "review prefs", "testing prefs"
- Arch → "decision-making prefs", "arch prefs", "design pattern prefs"

## Security

**Never store:**
- API keys, tokens, passwords
- Private keys, certificates
- Connection strings with credentials
- OAuth/session tokens
- Environment secrets

**Instead store:**
- Redacted versions with placeholders
- Patterns ("uses bearer token")
- Instructions ("Set TOKEN environment variable")

## Integration with Project Documentation

Keep `openmemory.md` in workspace root as living project index:

**Structure:**
- Overview
- Architecture
- User Defined Namespaces
- Components
- Patterns

**Update workflow:**
- Component added → update Components section
- Pattern discovered → update Patterns section
- Architecture changed → update Architecture section

**Critical:** Before completing any significant work, verify the guide reflects current system architecture

## Operating Principles

1. Search before implementing
2. Search at decision points
3. Document after completing
4. Trust the process - early searches prevent late problems
5. When in doubt, search more
6. Rich reasoning over code snippets
7. Guide is shareable - keep it clear

## Session Start Checklist

1. Read `openmemory.md` if it exists
2. Understand current task type
3. Identify which phase pattern applies
4. Execute phases in order
5. Don't skip Phase 2 checkpoints

## Learning from Corrections

When user corrects your work, note the preference:
- Indentation change → formatting preference
- Rename → naming convention
- Restructure → architectural preference  
- Commit message reword → git workflow preference

Store these as preferences to avoid repeating mistakes.
