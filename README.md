# Imperfect Pictures — Class Archive

An open, draggable desktop of student projects for **Imperfect Pictures** at the [https://sfpc.study/](School for Poetic Computation) (SFPC). The site serves as a lightweight archive: each project is a node on the canvas with a caption (Creator and Project Title) that links to an internal project page, an external site, or downloadable file.

## Live version

[https://projects.sfpc.study/imperfect-pictures/](https://projects.sfpc.study/imperfect-pictures/)

---

## Site Overview

- **Canvas view** (default): draggable “icons” spread across the viewport. Positions are **randomized on each load** for a fresh layout.
- **List view**: an overlay window that opens above the canvas and lists projects in a sortable table (by **Name / Creator / Class**). Click column headers to sort ascending/descending. Close the window to return to the canvas.

The bottom **nav bar** contains buttons for **About**, **List**, and **Shuffle**. Buttons use simple ASCII glyphs; **Shuffle** is visible only when no window is open (i.e., in canvas mode).

### Other Features
- **Placeholders**: If a project has no `image` specified, a placeholder is chosen.
- **Mobile**: On small screens, the List view collapses to a single‑column stacked list and the nav buttons hide labels to show just icons.

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
  "download": true
}
```

**Fields**
- `creator` (string): The student name as it should appear.
- `title` (string): Project name.
- `class` (string): Session label, e.g. "Summer 2025".
- `href` (string): Link target. May be an **internal page** (e.g. `projects/name.html`), an **external URL**, or a file path.
- `image` (optional string): Project image thumbnail. If omitted, a placeholder image is used.
- `download` (optional boolean or string): If present, clicking the project will download the file at `href` instead of navigating. If a string, it sets the saved filename.

**Other Notes**
- Internal project pages can be simple HTML stubs placed under `projects/` and linked from `href`.
- The HTML `download` attribute is most reliable for files hosted on the **same origin** (within this repo). Some cross‑origin links may open in a new tab depending on browser/server headers.

---

## Local Development

```bash
# From the repo root
# Option A: open index.html directly
open index.html

# Option B: run a tiny HTTP server
python3 -m http.server 8080
# then visit http://localhost:8080/
```

**Project structure**
```
imperfect-pictures/
├── index.html                ← main site
├── assets/
│   ├── css/style.css         ← global styles
│   ├── js/script.js          ← rendering, drag, list/about windows
│   └── img/                  ← placeholder images, thumbnails
├── data/
│   └── projects.json         ← all project data
└── projects/                 ← optional internal project pages
```

---

## Credits

**Imperfect Pictures** at the School for Poetic Computation (SFPC).

Site assembled by the class team and contributors.
