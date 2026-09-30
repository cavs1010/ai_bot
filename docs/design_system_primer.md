# Design System Primer

How professional teams organise the look of an app, in plain words, and where each piece lives
in this project. Read this when you need to remember *why* things are structured the way they are.

> **Current status** (what is done, what is missing) is tracked in `spec_development/NOW.md`, not
> here. This file explains the concepts; it does not go out of date when the code changes.

---

## 1. The core idea: one source of truth

Every design decision is written down **once**, and everything else reads it from there.

If the same colour is typed in two places, the two copies will eventually disagree: someone
updates one and forgets the other. Professionals avoid this by keeping one place for each
decision and generating or referencing everything else from it.

This applies at every level: one place for colours, one place for what a button looks like, and
one place for how a form shows an error.

---

## 2. A word about "tokens"

In design, a **token** is **a name that stands for a design value**:

```
--accent      →  #0d9488   (teal)
--bento-card  →  #121212   (dark grey)
```

Code never says "teal" or `#0d9488`. It says `accent`. Change the value behind the name once,
and every button, link and highlight follows.

It has **nothing to do with LLM tokens** (pieces of text an AI model reads). The two fields
borrowed the same everyday word, meaning "a small thing that stands for something else". In
design the term was coined at Salesforce around 2014.

In conversation we call them **"colour names"** or **"theme colours"** to avoid the confusion.

---

## 3. The four layers

Professional teams build appearance in layers. Each layer uses **only** the layer below it and
never invents its own values. The best-known version of this idea is **Atomic Design**, by Brad
Frost.

```
┌─────────────────────────────────────────────────────────────┐
│ 4. SCREENS     Dashboard, Active workout, History…          │  assemble ↓
├─────────────────────────────────────────────────────────────┤
│ 3. PATTERNS    confirm-before-delete, search + filter list  │  combine ↓
├─────────────────────────────────────────────────────────────┤
│ 2. COMPONENTS  Button, Input, Form field, Card, Modal…      │  read from ↓
├─────────────────────────────────────────────────────────────┤
│ 1. FOUNDATIONS colours, fonts, spacing, radius, icons…      │  single source
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Foundations (the raw ingredients)

Values only, no shapes yet.

| Foundation | What it is | Example |
|---|---|---|
| **Colour** | Every colour, with light and dark versions | `--accent`, `--content-primary` |
| **Typography** | Font families, sizes, weights, line heights | Outfit for text, JetBrains Mono for numbers |
| **Spacing** | A fixed scale of gaps and padding | 4 · 8 · 12 · 16 · 24 · 32 |
| **Radius** | How rounded corners are | small, medium, large, pill |
| **Elevation** | Shadows that show what is "above" what | card, pop-up, menu |
| **Icons** | **One** icon set, used everywhere | Lucide |
| **Motion** | Animation speeds and curves | fast = 150 ms, normal = 250 ms |

**The rule:** nothing above this layer may use a value that isn't defined here.

### Layer 2: Components (the building blocks)

Each recurring piece of the interface is built **once**, from foundations only.

- **Basic controls:** button, text input, textarea, checkbox, radio, switch, dropdown, slider
- **Forms:** a *form field* is one unit (**label + input + help text + error message**), always
  laid out the same way. Validation errors look and behave the same everywhere.
- **Containers:** card, modal/dialog, bottom sheet, tabs, list row
- **Feedback:** badge, toast/notice, spinner, skeleton loader, progress bar
- **States:** empty ("No workouts yet"), loading and error, each with one consistent look

A component has **variants** instead of copies: `<Button variant="primary">`,
`<Button variant="danger">`. Change the component file once and every use changes.

**The file rule.** Each control is its own file under `frontend/src/components/ui/`. That file
knows how the control looks and how it turns on or off. It does not know which screen uses it.
A pattern or a screen **imports** that file. It never defines the control again inside the file
that uses it.

The look (colours, radius, the `.toggle`, `.btn`, `.badge`, and `.input` classes) stays in
`frontend/src/index.css`. The React file only applies those classes.

Example: `frontend/src/components/ui/switch.tsx` exports `Switch`.

### Layer 3: Patterns (recurring combinations)

Solutions to problems that come up again and again, built by **importing** layer 2 controls:

- "Ask for confirmation before deleting something"
- "A list with a search box and filters"
- "A step-by-step flow with Back / Next"

A pattern supplies the labels, the tone, and what happens on click. It does not redraw the
control.

Example: `frontend/src/cockpit/OrderToggles.tsx` imports `Switch` twice. One case is live
trades. The other is market hours.

### Layer 4: Screens

Screens **only assemble** layers 2 and 3: "a card with a title, two inputs and a primary
button". A screen never decides what a button looks like; it just says "a button goes here".
It imports the pattern or the control. It does not contain a private copy of either.

---

## 4. The professional workflow

1. **Define the foundations.**
2. **Build or adopt the components**, reading only from the foundations.
3. **Document them** in a style guide, generated from the source where possible, so it cannot
   drift.
4. **Build screens only from components.**
5. **When something new is needed, add it to the system first**, as its own file under
   `frontend/src/components/ui/`, then import it. Never make a one-off inside the screen.

Step 5 is the discipline that keeps an app consistent as it grows. Skipping it is how apps end up
with 60 slightly different buttons.

---

## 5. Build it yourself or use a library?

A **component library** is Layer 2 already built by someone else: buttons, inputs, modals and
so on, ready to use.

| | Build your own | Use a library |
|---|---|---|
| **Effort** | More work up front | Much faster start |
| **Look** | Exactly your design | The library's look, unless customised |
| **Control** | Full | Limited to what the library allows |

**The rule of thumb:** pick a library that uses **the styling system you already have**, so it
reads your foundations instead of bringing its own. Otherwise you end up with two styling sources
fighting each other.

For this project (Tailwind on web, Uniwind on the phone):

| Library | Platform | Fits? |
|---|---|---|
| **shadcn/ui** | Web | ✅ Built on Tailwind; copies component files into your project, so you own them |
| **HeroUI Native** | Phone | ✅ Built on Uniwind, by the same team |
| **Ant Design** | Web (separate phone version) | ❌ Own styling system and a "business dashboard" look; would be a second source |

---

## 6. Where the foundations are kept

Small projects keep foundations in the format their platforms already read. Larger teams keep
them in a **neutral file** and generate one output per platform:

```
colours.json ──► CSS (web) · Swift (iOS) · Kotlin (Android) · Figma (designers)
```

There is an official standard for that neutral file: the **W3C Design Tokens format**, first
stable version October 2025. **Style Dictionary** is the best-known generator.

**This project uses CSS as the source**, because both platforms read CSS (Tailwind on web,
Uniwind on the phone). That is the lighter version of the same principle. Moving to a neutral
JSON file becomes worth it when something that *cannot* read CSS joins, such as a designer's
Figma, a fully native Swift/Kotlin app, or email templates.

---

## 7. Map of this project

This is the structure to follow. One file per control. Patterns and screens import it.

| Layer | Where it lives |
|---|---|
| Foundations (colour, type, radius, spacing) | `frontend/src/index.css`, the `@theme` block only. No second token file. |
| Component look (button, badge, input, toggle classes) | `frontend/src/index.css`, the `@layer components` block. |
| Components (the React controls) | One file each in `frontend/src/components/ui/`. Example: `switch.tsx` exports `Switch`. |
| Patterns | `frontend/src/cockpit/`. They import controls and pass the labels and behaviour. Example: `OrderToggles.tsx` imports `Switch` twice. |
| Screens | `frontend/src/App.tsx` assembles patterns and controls. It does not define them. |
| Icons | Lucide (`lucide-react`) |

---

## Further reading

- Brad Frost, *Atomic Design*: <https://atomicdesign.bradfrost.com/>
- W3C Design Tokens Community Group: <https://www.designtokens.org/>
- Style Dictionary: <https://styledictionary.com/>
- shadcn/ui: <https://ui.shadcn.com/>
- Uniwind: <https://docs.uniwind.dev/>
