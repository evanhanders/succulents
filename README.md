# Evan's Succulents 🌵

A little website for a succulent & cactus collection, in two halves:

- **The Journal** — a reverse-chronological photo log: new plants, repottings, pups, and blooms.
- **The Pokédex** — a care encyclopedia where every species gets a numbered "dex entry" with
  type badges and how to light, water, soil, feed, and overwinter it.

It's a **static site** — plain HTML/CSS/JS, no build step, no backend. Everything is data-driven:
adding a plant or a journal entry means dropping in a folder + a JSON file + photos and adding one
line to a manifest. Full details live in [`CLAUDE.md`](./CLAUDE.md).

## Run it locally

The pages `fetch()` JSON, so use a static server (not `file://`):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

| Page | File |
| --- | --- |
| Home | `index.html` |
| Journal | `journal.html` |
| Pokédex grid | `dex.html` |
| Species care sheet | `species.html?s=<slug>` |

- Species records: `species/<slug>/species.json` (+ `images/`), listed in `species/manifest.json`.
- Journal entries: `journal/<slug>/entry.json` (+ `images/`), listed newest-first in `journal/manifest.json`.
- Shared photo-reel + lightbox engine, type badges, and the card renderer live in `reel.js`.

## Deploy

Push and enable GitHub Pages (deploy from branch, root). `.nojekyll` serves the files as-is.

All photos are my own.
