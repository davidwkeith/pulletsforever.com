# Anglesite Re-platform — Phase 2: 1.1.0 Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Adopt the Anglesite 1.1.0 build/deploy tooling — the modular `pre-deploy-check.ts` security scan and its helper closure, `tsx` script runner, and CSS/Markdown linting — without changing rendered output, and with `npm run predeploy` passing on this site's real content.

**Architecture:** Copy the 1.1.0 scan closure (10 files) into `scripts/` verbatim, with one justified deviation: a boundary fix to the phone-number regex (the stock greedy regex flags 14 false positives in this site's existing content — GPS coordinates, a Nature article ID, repeating-decimal fractions, a Wayback URL timestamp). Reconcile `.site-config` so the scan passes, switch scripts from `node --experimental-strip-types` to `tsx`, and wire linting (advisory).

**Tech Stack:** tsx 4.19, schema-dts 2 (type-only), stylelint 17 + stylelint-declaration-strict-value, markdownlint-cli2 0.22. Node 22.

**Reference:** spec `docs/superpowers/specs/2026-06-17-anglesite-1.1.0-replatform-design.md`. Template source: `~/.claude/plugins/cache/anglesite/anglesite/1.1.0/`.

---

## Key decisions baked into this plan

1. **Adopt the full scan closure verbatim** (10 leaf files): `pre-deploy-check.ts`, `config.ts`, `csp.ts`, `seo.ts`, `seo-audit.ts`, and the 5 provider-CSP modules `booking.ts`, `lemon-squeezy.ts`, `paddle.ts`, `shopify-buy-button.ts`, `snipcart.ts`. The provider modules are dormant until a provider is declared in `.site-config`; keeping them verbatim means future Anglesite updates merge cleanly and ecommerce skills work later without rework.
2. **One deviation from verbatim:** the phone regex gets a digit-boundary fix (justified below; should be upstreamed to Anglesite).
3. **Linting is advisory in Phase 2** — wire configs + scripts and report counts, but do NOT gate on zero lint errors (fixing all hand-written CSS to the strict template ruleset is out of scope here).
4. **No `PII_PHONE_ALLOW` needed** — the regex fix eliminates the false positives properly, rather than allowlisting 14 non-phone digit strings.

---

## File Structure

- **Create** `scripts/config.ts`, `scripts/csp.ts`, `scripts/seo.ts`, `scripts/seo-audit.ts`, `scripts/booking.ts`, `scripts/lemon-squeezy.ts`, `scripts/paddle.ts`, `scripts/shopify-buy-button.ts`, `scripts/snipcart.ts` — copied verbatim from the 1.1.0 template `scripts/`.
- **Replace** `scripts/pre-deploy-check.ts` — copied from template, then the phone-regex boundary fix applied.
- **Create** `.stylelintrc.json`, `.markdownlint.jsonc` — copied verbatim from template root.
- **Modify** `package.json` — add devDeps (`tsx`, `schema-dts`, `stylelint`, `stylelint-declaration-strict-value`, `markdownlint-cli2`); switch 6 script commands to `tsx`; add `lint:css` / `lint:md`.
- **Modify** `.site-config` — add `PII_EMAIL_ALLOW`.
- **Modify** `.gitignore` — add `/reports/`.
- **Modify** `src/content.config.ts:24` — `z.string().url()` → `z.url()` (Phase 1 carry-forward).

---

## Task 1: Adopt the scan closure + phone-regex fix

**Files:** create the 10 `scripts/*.ts` closure files; modify `package.json`, `.site-config`, `.gitignore`.

- [ ] **Step 1: Copy the 9 verbatim closure files**

```bash
cd /Users/dwk/Developer/github.com/pulletsforever.com/.claude/worktrees/replatform
T=~/.claude/plugins/cache/anglesite/anglesite/1.1.0/scripts
for f in config csp seo seo-audit booking lemon-squeezy paddle shopify-buy-button snipcart; do cp "$T/$f.ts" "scripts/$f.ts"; done
ls scripts/
```
Expected: the 9 files now exist in `scripts/`.

- [ ] **Step 2: Copy pre-deploy-check.ts from the template (replacing the old one)**

```bash
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/scripts/pre-deploy-check.ts scripts/pre-deploy-check.ts
```

- [ ] **Step 3: Apply the phone-regex boundary fix**

In `scripts/pre-deploy-check.ts`, find:
```ts
export const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
```
Replace with:
```ts
// Digit boundaries keep the pattern from matching a 10-digit slice of a longer
// number — an article ID (s41598-025-97652-6), a URL timestamp
// (/web/20120120031959/), a decimal coordinate (37.3268981241), or a
// repeating-decimal fraction. The lookahead omits `.` so a phone ending a
// sentence ("call 408-555-1234.") still matches. (Deviation from the Anglesite
// 1.1.0 template — candidate for upstreaming.)
export const phonePattern = /(?<![\d.-])\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?![\d-])/g;
```
Leave `scanPhones` and everything else unchanged (it already does `phonePattern.lastIndex = 0`).

- [ ] **Step 4: Add `PII_EMAIL_ALLOW` to `.site-config`**

These four addresses are published intentionally in post content (fediverse handles in `<code>`, an email in a query-string demo, a past work address):
```bash
printf '# Emails intentionally published in post content (skipped by the PII scan):\nPII_EMAIL_ALLOW=dwk@mastodon.social,dwk@tara.ai,dwk@xn--4t8h.dwk.io,user@domain.com\n' >> .site-config
tail -3 .site-config
```

- [ ] **Step 5: Add `/reports/` to `.gitignore`**

Append (matches the template — the SEO audit regenerates `reports/seo-report.md` on each predeploy):
```bash
printf '\n# Audit / scan reports (regenerated on demand; never committed)\n/reports/\n' >> .gitignore
```

- [ ] **Step 6: Add devDeps and switch `predeploy` to tsx**

In `package.json`: add to `devDependencies`: `"tsx": "^4.19.0"`, `"schema-dts": "^2.0.0"`. Change the `predeploy` script from `"node --experimental-strip-types scripts/pre-deploy-check.ts"` to `"tsx scripts/pre-deploy-check.ts"`. Then:
```bash
npm install
```
Expected: installs cleanly.

- [ ] **Step 7: Build and verify the scan passes**

```bash
npm run build >/dev/null 2>&1 && echo built
npm run predeploy
```
Expected: prints `PII email allowlist: ...`, possibly some `WARN:` lines (OG image / maintenance / SEO — all non-blocking), and ends with **`Pre-deploy security scan passed.`** (exit 0).
If it instead prints `Deploy blocked` with a `PII: possible phone number` line, the boundary fix in Step 3 was not applied correctly — re-check. If it blocks on an email, confirm `.site-config` Step 4 and that the address isn't on a new domain.

- [ ] **Step 8: Commit**

```bash
git add scripts/ package.json package-lock.json .site-config .gitignore
git commit -m "build: adopt Anglesite 1.1.0 pre-deploy scan closure (predeploy via tsx)"
```

---

## Task 2: Convert remaining scripts to tsx

**Files:** `package.json`.

- [ ] **Step 1: Switch the remaining `node --experimental-strip-types` invocations to `tsx`**

In `package.json` `scripts`, change these 5 commands so each `node --experimental-strip-types scripts/X.ts` becomes `tsx scripts/X.ts`:
`new-post`, `webmentions:send`, `webmentions:send:dry`, `websub:ping`, `websub:ping:dry`.
(Leave their flags like `--dry-run` intact, e.g. `"tsx scripts/send-webmentions.ts --dry-run"`.)

- [ ] **Step 2: Smoke-test one converted script (dry-run, no network writes)**

```bash
npm run webmentions:send:dry 2>&1 | tail -5
```
Expected: runs under `tsx` without a runtime error (dry-run performs no sends). If the script needs a build first and errors on missing `dist/`, that's acceptable — confirm the failure is about missing data, not a `tsx`/module error.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: run project scripts via tsx"
```

---

## Task 3: Wire CSS + Markdown linting (advisory)

**Files:** create `.stylelintrc.json`, `.markdownlint.jsonc`; modify `package.json`.

- [ ] **Step 1: Copy the lint configs verbatim**

```bash
cd /Users/dwk/Developer/github.com/pulletsforever.com/.claude/worktrees/replatform
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/.stylelintrc.json .
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/.markdownlint.jsonc .
```

- [ ] **Step 2: Add lint devDeps and scripts**

In `package.json`: add to `devDependencies`: `"stylelint": "^17.6.0"`, `"stylelint-declaration-strict-value": "^1.11.1"`, `"markdownlint-cli2": "^0.22.0"`. Add to `scripts`: `"lint:css": "stylelint 'src/**/*.css'"`, `"lint:md": "markdownlint-cli2 'docs/**/*.md' '*.md'"`. Then `npm install`.

- [ ] **Step 3: Run the linters (advisory — record counts, do NOT fix)**

```bash
npm run lint:css 2>&1 | tail -20 || true
npm run lint:md 2>&1 | tail -20 || true
```
Record the error/warning counts in your report. **Do not** fix lint findings in this task — that is out of Phase 2 scope. The goal is that the linters are wired and runnable.

- [ ] **Step 4: Commit**

```bash
git add .stylelintrc.json .markdownlint.jsonc package.json package-lock.json
git commit -m "build: wire stylelint + markdownlint (advisory)"
```

---

## Task 4: Zod v4 deprecation cleanup (Phase 1 carry-forward)

**Files:** `src/content.config.ts`.

- [ ] **Step 1: Replace the deprecated `.url()` form**

In `src/content.config.ts`, change:
```ts
syndication: z.array(z.string().url()).default([]),
```
to:
```ts
syndication: z.array(z.url()).default([]),
```
(`astro/zod` is Zod v4, where `z.string().url()` is deprecated in favor of `z.url()`; behavior is identical.)

- [ ] **Step 2: Typecheck — the deprecation hint should be gone**

```bash
npm run typecheck
```
Expected: `0 errors, 0 warnings, 0 hints` (the previously-noted `z.string().url()` hint is resolved).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "refactor: use z.url() (Zod v4) for syndication schema"
```

---

## Task 5: Final Phase 2 gate

**Files:** none (verification).

- [ ] **Step 1: Full green check**

```bash
npm run build 2>&1 | tail -2          # expect: 51 page(s) built / Complete!
npm run typecheck 2>&1 | tail -4      # expect: 0 errors, 0 warnings, 0 hints
npm test 2>&1 | tail -3               # expect: 7 passed
npm run predeploy 2>&1 | tail -3      # expect: Pre-deploy security scan passed.
```

- [ ] **Step 2: Confirm output unchanged vs Phase 1**

The build output must be unchanged by tooling adoption (tooling doesn't touch rendered pages). Confirm page count is still 51 and `astro check` is clean. (No baseline-oracle diff needed — Phase 2 changes only `scripts/`, configs, and one schema-internal `.url()`→`url()` swap that doesn't alter validation output.)

- [ ] **Step 3: Confirm `ANGLESITE_VERSION` still un-bumped**

```bash
grep ANGLESITE_VERSION .site-config   # expect: 1.0.0-beta.6 (bumped in Phase 6)
```

---

## Gate Summary (Phase 2 done when ALL hold)

- All 10 scan-closure files present in `scripts/`; `npm run predeploy` → **`Pre-deploy security scan passed.`** (exit 0) on the real build.
- `npm run build` → 51 pages; `astro check` → 0 errors/warnings/hints; `npm test` → 7/7.
- `tsx` runs all project scripts; `lint:css` / `lint:md` are wired and runnable (counts recorded, not required to be zero).
- `.site-config` `ANGLESITE_VERSION` still `1.0.0-beta.6`.
