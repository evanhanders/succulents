# CLAUDE.md — Evan's Succulents

A personal website for a succulent & cactus collection. Two halves:

1. **The Journal** — a reverse-chron photo log. New plants, repottings, pups pulled and
   potted, blooms. Each entry = a date, a title, a few photos, a few words, and links to the
   species it mentions.
2. **The Pokédex** — a care encyclopedia. Every species gets a numbered "dex entry" with
   type badges and how to light, water, soil, feed, overwinter, and propagate it.

The encyclopedia half is modeled on the herbarium workflow in `evanhanders/co-plants`, but
adapted for succulents: **all photos are the owner's own** (no CC sourcing, licensing, or
attribution machinery), the care fields are succulent-specific, and there's a Pokédex skin.

## What this is (and isn't)

- A **static site** — plain HTML/CSS/JS, no build step, no framework, no backend. It deploys
  as-is to GitHub Pages (`.nojekyll` serves every file verbatim). Open any page over a local
  static server (`python3 -m http.server`) to develop; `file://` won't work because the pages
  `fetch()` JSON.
- **No accounts / no database.** (The reference repo has a Supabase login/favorites layer;
  this site deliberately drops it.)
- Data lives in per-record JSON files loaded at runtime; there is **no per-plant code** — you
  add a species or a journal entry by adding a folder + a JSON file + photos, and listing it
  in a manifest.

## Architecture

```
index.html   / home.js      # home: intro + two portals + latest-entry & featured-species strips
journal.html / journal.js   # the journal feed (reverse-chron)
dex.html     / dex.js        # the Pokédex grid: cards, search, filters, grouping
species.html / species.js    # one species' standalone "dex entry" (care sheet)
reel.js                      # SHARED engine, loaded FIRST everywhere: photo reel + zoom lightbox,
                             #   the type-badge helpers, the dex trait/filter predicates, and the
                             #   shared cardHTML renderer. The grid + detail page can never drift.
site.js                      # shared chrome: light/dark theme toggle + active-nav highlight
styles.css                   # all styling (light + dark themes via prefers-color-scheme + [data-theme])
.nojekyll                    # serve everything verbatim on GitHub Pages

species/
  manifest.json              # { "species": ["<slug>", ...] } — the list the dex loads (order irrelevant)
  <slug>/
    species.json             # one species' full record (see schema below)
    images/                  # the owner's own photos: <name>.jpg (full) + <name>-t.jpg (thumb)

journal/
  manifest.json              # { "entries": ["<slug>", ...] } — NEWEST FIRST (this order is the feed order)
  <slug>/
    entry.json               # one journal entry (see schema below)
    images/                  # the entry's own photos
```

**Load flow.** Each page `fetch()`es its manifest, then fetches every listed record in
parallel, stamping each with `dir` (`"species/<slug>"` or `"journal/<slug>"`) so its local
images resolve. `reel.js` is always loaded first so `cardHTML`, `plateHTML`, `typeBadges`,
and the trait predicates are available to whatever page-specific script runs next.

**Every page includes the lightbox markup** (`<div class="lbox">…`) before `reel.js`, because
`reel.js` wires the lightbox on load. Keep that block in sync across pages if you edit it.

## `species.json` schema

The dex card + the detail sheet read a fixed set of keys. Confirm the exact shape against a
real file (`species/zebra-haworthia/species.json` is the reference). Fields:

- **`dex`** *(number)* — the entry number, shown as `#001`. Assign the next free integer.
- **`common`** *(string)* — display name (e.g. "Zebra Haworthia").
- **`botanical`** *(string)* — the scientific name, rendered italic.
- **`genus`** *(string)* — used for the "by genus" grouping + the type-view subgroups.
- **`family`** *(string)* — shown in the detail lineage line.
- **`aka`** *(string array, optional)* — alternate/old names & synonyms; folded into search and
  shown as an "Also:" line. Put cultivars whose care is identical here rather than making a
  near-duplicate entry.
- **`class`** *(string)* — **`"Cactus"` or `"Succulent"`**. Drives the top-level dex grouping
  (Cacti / Succulents sections) and the first colored type badge. Cactaceae → `Cactus`;
  everything else → `Succulent`.
- **`forms`** *(string array, 1–2)* — growth-form **type badges** (Pokédex flavor). Use values
  that have a color in `styles.css`: `Rosette, Columnar, Barrel, Trailing, Clumping, Caudex,
  Paddle, Ball, Shrub, Ground`. To add a new form, add a `.type[data-t="<lowercase>"]` color
  rule in `styles.css` — no JS change needed.
- **`blurb`** *(string)* — one or two sentences of character, shown on the card + detail hero.
- **`growth_season`** *(string)* — `"Summer"`, `"Winter"`, or `"Ever"` (year-round). This is
  the succulent-critical "summer-grower vs winter-grower" axis; drives the Growth-season filter.
- **`size`** *(string)* — a size phrase (e.g. "4–6 in tall × 5 in wide").
- **`light`** *(string, short)* — card fact + Light filter. Keep it in the vocabulary the filter
  buckets recognize (`lightOf` in `reel.js`): phrases containing **full sun / bright indirect /
  partial / low**. e.g. "Bright indirect", "Full sun (acclimated)", "Partial shade".
- **`water`** *(string, short)* — card fact, e.g. "Soak & dry".
- **`soil`** *(string, short)* — card fact, e.g. "Gritty cactus mix".
- **`hardiness`** *(string, short)* — card fact + Hardiness filter. Include the word **"tender"**
  or **"hardy"** so `hardyClass` buckets it (e.g. "Tender · ~40°F min (Zone 10)", "Cold-hardy to
  Zone 5").
- **`toxicity`** *(string, short)* — card fact + Toxicity filter + the detail banner. Say
  **"Pet-safe"** / "Non-toxic" for safe plants (green banner) or name the risk for toxic ones
  ("Toxic to cats & dogs", "Sap irritant") → warning banner. `petSafe` in `reel.js` keys off
  "safe / non-toxic / pet-safe" (and flips to toxic if it also says "toxic to / harmful").
- **`acquired`** *(string, optional)* — when it joined the collection ("2026-06"); shows in the
  glance table as "In collection since".
- **`provisional`** *(bool, optional)* — set `true` when the species ID is a best-guess, not
  confirmed. Renders a small italic "✎ Tentative ID" marker under the botanical name on the card
  and the detail sheet (`.prov` in `styles.css`). Drop the key once the ID is confirmed.
- **`care`** *(object, optional)* — the detail page's "Growing & care" grid. A flat object of
  prose strings; `species.js`'s `CARE_FIELDS` reads a fixed ordered allow-list and skips any
  absent key, so fill in as many as apply. Keys, in order:
  `light, water, soil, temperature, dormancy, feeding, potting, propagation, bloom, troubles`.
  Plus **`toxicity`** — rendered separately under the "Toxicity & pets" banner (not in the care
  grid). Keep each value a short, practical paragraph of *how the owner actually grows it*.
  (Care prose here is uncited — this is a personal collection log, not a referenced field guide.)
- **`shots`** *(array, optional)* — the photo reel. Each entry:
  `{ "full": "images/x.jpg", "thumb": "images/x-t.jpg", "cap": "short caption", "date": "2026-06" }`.
  `full` is required; `thumb` is optional (falls back to `full`); `cap`/`date` optional. Paths are
  relative to the record folder. An empty `shots: []` renders a "Photo coming soon" placeholder.

## `entry.json` schema (journal)

```json
{
  "date": "2026-07-10",              // ISO; rendered "July 10, 2026"; used for ordering intent
  "title": "Starting the collection log",
  "tags": ["new plant", "repotting"],// optional chips
  "species": ["zebra-haworthia"],    // optional; slugs of dex species → auto-linked chips w/ dex number
  "body": [                          // each string is one paragraph
    "First paragraph…",
    "Second paragraph…"
  ],
  "shots": [                         // same shape as species shots; shown as a photo grid, tap to zoom
    { "full": "images/x.jpg", "thumb": "images/x-t.jpg", "cap": "…" }
  ]
}
```

The **feed order is the order of `journal/manifest.json`** (newest first) — put a new entry's
slug at the top of that array. The `date` field is only for display; keep the manifest ordered.

## Type badges (Pokédex flavor)

`typeBadges(p)` in `reel.js` renders `class` + each `forms` value as a colored `.type` chip.
Colors are pure CSS, keyed on the lower-cased value: `.type[data-t="rosette"]{ background:… }`.
Add a form → add one CSS rule. Keep forms to 1–2 per species so cards stay clean.

## Workflow: adding a species to the dex

1. `slug` = kebab-case of the common name (e.g. `blue-chalk-sticks`).
2. `mkdir -p species/<slug>/images`.
3. Add the owner's photos to `species/<slug>/images/`. Convention: full image `<name>.jpg`
   (resize longest side to ≤ ~1600px) and a thumbnail `<name>-t.jpg` (longest side ≤ ~820px).
   The thumb is optional — omit `thumb` and the card loads the full image. The card/hero use CSS
   `object-fit: cover`, so thumbs don't need a fixed aspect ratio; just downscale, preserving
   aspect. **This environment has no ImageMagick/`sips`** — use Python Pillow (already the tool
   used to import the first collection):
   ```python
   from PIL import Image, ImageOps
   im = ImageOps.exif_transpose(Image.open("in.jpg")).convert("RGB")  # honor phone orientation
   full = im.copy(); full.thumbnail((1600,1600), Image.LANCZOS); full.save("name.jpg", quality=86, optimize=True)
   th   = im.copy(); th.thumbnail((820,820),   Image.LANCZOS); th.save("name-t.jpg", quality=84, optimize=True)
   ```
4. Write `species/<slug>/species.json` (schema above). Give it the next free `dex` number.
5. Add `"<slug>"` to the `species` array in `species/manifest.json`.
6. Reload `dex.html` — the card appears; open it to check the detail sheet.

## Workflow: adding a journal entry

1. `slug` like `2026-07-first-repotting` (date-prefixed keeps them tidy on disk).
2. `mkdir -p journal/<slug>/images`, add photos (same thumb convention).
3. Write `journal/<slug>/entry.json` (schema above).
4. **Prepend** `"<slug>"` to the `entries` array in `journal/manifest.json` (newest first).
5. Reload `journal.html`.

**Photo scope per entry.** Match the number of photos to the event: a repot or a single new
plant → just those few shots; a "state of the collection" post → the full set (the first entry,
`2026-07-new-office-shelves`, shows the shelf plus a captioned photo of every plant). Entry
photos live in the entry's own `images/` folder even when the same plant already has a dex photo
— entries are self-contained, so copy the shot in rather than reaching into `species/`.

**Linking species.** List dex slugs in the entry's `species` array to render auto-linked chips
(with dex number) at the foot of the entry — but only slugs that already exist in the dex, or the
chip links to a missing page. Add the plant to the dex first, then link it.

## Deploy (GitHub Pages)

Push to the repo and enable Pages (Settings → Pages → deploy from branch, root). `.nojekyll`
ships the files verbatim. No build. The Fraunces display font loads from Google Fonts with a
serif fallback, so the site still reads fine offline / if fonts are blocked.

## Conventions recap

- Photos are always the owner's own — no attribution/licensing fields anywhere.
- Add data, not code: a new species/entry is a folder + JSON + a manifest line.
- `class` = Cactus|Succulent (grouping + first badge); `forms` = the growth-form badges.
- Keep short card fields (`light`, `hardiness`, `toxicity`, `growth_season`) inside the
  vocabularies the filters bucket on (see the predicates in `reel.js`), or add a new bucket there.
- One shared engine (`reel.js`) renders both the grid card and the detail hero — edit card/reel
  markup there, once.
```
