# Imperfect Pictures — Class Archive

An open, draggable desktop of student projects for **Imperfect Pictures** at the School for Poetic Computation (SFPC). The site serves as a lightweight archive: each project is a PNG node on the canvas with a caption (Creator / Project Title) that links to either an internal project page or an external site.

## Live version

> (Add link here when deployed, e.g. GitHub Pages or the SFPC domain.)

---

## Site Overview

This is a static site built with plain **HTML/CSS/JS** and a single **JSON** file for project data. There are two primary views:

- **Canvas view** (default): draggable PNG “icons” spread across the viewport. Positions are **randomized on each load** (non‑persistent) for a fresh layout.
- **List window**: an overlay window that lists projects in a sortable table (by Name / Creator / Class). Users can close the window to return to the canvas.

There’s also an **About window** with class information. The nav bar at the bottom contains buttons to open/close the About and List windows and a Shuffle button (visible in canvas mode only).

### Notable behavior
- **Placeholders**: If a project has no `image`, a non‑deterministic placeholder is chosen from `assets/img/placeholder_XX.png`. Each placeholder is used at most once per page load until the pool is exhausted.
- **Thumbnails & captions**: Thumbnails clamp to their container (no cropping). Captions wrap within the node width.
- **Mobile**: On small screens, the List view collapses to a single‑column stacked list and the nav buttons show icon glyphs.

---

## How to Add a New Project

Edit `data/projects.json` and add a new object to the array. The schema is intentionally minimal:

```json
{
  "creator": "Full Name",
  "title": "Project Title",
  "class": "Summer 2025",
  "href": "projects/creator-slug.html",
  "image": "assets/img/projects/example/example.png"
}
```

**Fields**
- `creator` (string): The student name as it should appear.
- `title` (string): Project name.
- `class` (string): Session label, e.g. "Summer 2025".
- `href` (string): Link target. May be an **internal page** (e.g. `projects/name.html`) or an **external URL**.
- `image` (optional string): PNG/JPG/WebP thumbnail. If omitted, a placeholder image is used.

**Notes**
- You do **not** need `id`, `width`, `height`, or `target` keys; those were removed from the data model.
- Internal project pages can be simple HTML stubs placed under `projects/` and linked from `href`.

---

## Local Development

```bash
# Clone and serve (any static server works)
cd imperfect-pictures
# Open index.html directly, or run a tiny HTTP server for local testing
npx serve .
```

**Project structure**
```
imperfect-pictures/
├── index.html                ← main entry (canvas + overlays)
├── assets/
│   ├── css/style.css         ← global styles (CSS variables + responsive)
│   └── js/script.js          ← rendering, drag, list/about windows
├── data/projects.json        ← all project data
├── assets/img/               ← placeholder_XX.png and thumbnails
└── projects/                 ← internal project pages (optional)
```

**Tech details**
- **Positions**: Node positions are randomized at load and **not persisted** to storage.
- **Placeholders**: The code draws from a shuffled pool (`placeholder_01..NN`) to avoid duplicate placeholders on a single page view.
- **Sorting**: In List view, clicking column headers toggles ascending/descending sort.
- **Accessibility**: Nav buttons use ASCII glyphs for icons with hidden labels on very small screens; aria labels remain for screen readers.

---

## Deployment

Any static host works (GitHub Pages, Netlify, Vercel, etc.). For GitHub Pages on the **SFPC-Projects/imperfect-pictures** repo:

1. Push `main` to GitHub.
2. In **Settings → Pages**, set **Branch** to `main` and the root to `/`.
3. After the site builds, update the **Live version** link above.

---

## Maintenance

- Add/edit projects in `data/projects.json`.
- Add thumbnails under `assets/img/projects/…` and reference them in `image`.
- Internal project stubs live under `projects/`.
- Styles use CSS variables (see `:root` in `style.css`) so colors/spacing can be adjusted centrally.

---

## Credits

**Imperfect Pictures** at the School for Poetic Computation (SFPC).

Site assembled by the class team and contributors.

Maintainer(s): Kevin Cunanan Chappelle — <https://kvnchpl.com>
