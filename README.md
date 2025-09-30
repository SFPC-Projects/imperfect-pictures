# Imperfect Pictures — Class Archive

An open, draggable desktop of student projects for **Imperfect Pictures** at the School for Poetic Computation (SFPC). The site serves as a lightweight archive: each project is a node on the canvas with a caption (Creator and Project Title) that links to may link to an internal project page, an external site, or a downloadable file.

## Live version

[https://projects.sfpc.study/imperfect-pictures/](https://projects.sfpc.study/imperfect-pictures/)

---

## Site Overview

This is a static site built with plain **HTML/CSS/JS** and a single **JSON** file for project data. There are two primary views:

- **Canvas view** (default): draggable “icons” spread across the viewport. Positions are **randomized on each load** for a fresh layout.
- **List window**: an overlay window that lists projects in a sortable table (by Name / Creator / Class). Users can close the window to return to the canvas.

There’s also an **About window** with class information. The nav bar at the bottom contains buttons to open/close the About and List windows and a Shuffle button (visible in canvas mode only).

### Other Features
- **Placeholders**: If a project has no `image`, a placeholder is chosen from `assets/img/placeholder_XX.png`.
- **Mobile**: On small screens, the List view collapses to a single‑column stacked list and the nav buttons show icon glyphs.

---

## How to Add a New Project

Edit `data/projects.json` and add a new object to the array.

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
- `image` (optional string): Project image thumbnail. If omitted, a placeholder image is used.

**Note**
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
│   ├── js/script.js          ← rendering, drag, list/about windows
│   └── img/                  ← placeholder_XX.png and thumbnails
├── data/projects.json        ← all project data
└── projects/                 ← internal project pages (optional)
```

---

## Credits

**Imperfect Pictures** at the School for Poetic Computation (SFPC).

Site assembled by the class team and contributors.
