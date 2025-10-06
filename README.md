# Imperfect Pictures — Class Archive

An interactive, draggable archive of student projects for **Imperfect Pictures** at the [School For Poetic Computation](https://sfpc.study/) (SFPC). The site features a desktop of draggable project nodes, a sortable list view, internal project pages, downloads, and WIP placeholders. Each project can be opened, downloaded, or visited externally, with internal project pages shown in overlay windows. WIP projects are marked with placeholders.

## Live version

[https://projects.sfpc.study/imperfect-pictures/](https://projects.sfpc.study/imperfect-pictures/)

---

## Site Overview

- **Desktop view** (default): draggable project "nodes" (thumbnails) are randomly arranged across the viewport on each load. Thumbnails scale proportionally (smallest dimension = 70px), and captions are twice as wide as thumbnails. Nodes are draggable around the desktop; their z-order updates as you interact.
    - **Nodes**: Each node shows a thumbnail and a caption with Creator and Project Title. Clicking a node opens a context menu to view the project or toggle its description.
    - **Draggable**: Project nodes can be freely moved; their positions are not persistent.
    - **Windows**: Overlay windows (About, List, Project) are **not draggable** and appear centered.
- **List view**: Opens as an overlay window above the desktop, listing all projects in a sortable table (by **Name / Creator / Session**). Click column headers to sort ascending/descending. Clicking a project name opens a context menu with options to view the project or toggle its description. Closing the list window unselects all rows.
- **Project windows**: Clicking a project (in desktop or list view) will:
    - Open an internal page in an overlay window (for `.html` projects)
    - Trigger a file download (for downloadable projects)
    - Open an external link in a new tab (for external projects)
    - Open a WIP placeholder page (`wip.html`) for in-progress projects

The bottom **nav bar** contains buttons for **About**, **List**, and **Shuffle**. **Shuffle** is visible only when no window is open (desktop mode).

### Other Features
- **Placeholders**: Projects without an `image` use a randomly assigned placeholder.
- **Mobile**: On small screens, the List view is shown automatically and collapses to a single-column stacked list. Nav buttons show only icons.

---

## How to Add a New Project

Edit `data/projects.json` and add a new object to the array. Example:

```json
{
  "creator": "Full Name",
  "title": "Project Title",
  "session": "Summer 2025",
  "link": "projects/example/index.html",
  "image": "projects/example/example.png",
  "download": "example.zip",
  "creatorLinks": [
    { "label": "Portfolio", "url": "https://example.com" }
  ],
  "description": "Optional description shown in list and desktop menus."
}
```

**Field definitions:**
- `creator` (string): The student's name as it should appear.
- `title` (string): Project name.
- `session` (string): Session label, e.g. "Summer 2025". (Replaces previous `class` field.)
- `link` (string): Link target. Can be:
    - an **internal HTML file** (e.g. `projects/name/index.html`)
    - an **external site** (e.g. `https://example.com`)
    - a **downloadable file** (e.g. `projects/name/project.zip`)
    - the special value `wip.html` for work-in-progress placeholders
- `image` (optional string): Project thumbnail. If omitted, a placeholder image is used.
- `download` (optional boolean or string): If present, clicking the project will download the file at `link` instead of navigating. If a string, it sets the saved filename.
- `creatorLinks` (optional array): List of objects like `{ "label": "Portfolio", "url": "https://..." }` for multiple labeled links (e.g. website, Instagram, etc).
- `description` (optional string): Description shown in the context menu or on hover in list/desktop views.

**Notes:**
- `session` replaces the old `class` field.
- `link` replaces the old `href` field.
- `download` can be `true`/`false` or a string (filename).
- Internal `.html` files should be placed under `projects/` and will be opened in an overlay window.
- Downloadable projects trigger a local file download. (Best for files hosted within the repo.)
- External links open in a new tab.
- Projects with `link: "wip.html"` show a WIP placeholder page.

---

## Behavior Notes

- Internal `.html` projects open inside an overlay window (iframe).
- Downloadable projects trigger a local file download.
- External links open in a new tab.
- WIP projects (`link: "wip.html"`) open a placeholder page.
- On mobile, the list view is shown automatically.

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
└── projects/                 ← internal project pages, downloads, etc.
```

---

## Credits

**Imperfect Pictures** at the School for Poetic Computation (SFPC).

Site assembled by the class team and contributors.
