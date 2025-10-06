# Imperfect Pictures — Class Archive

An interactive archive of student projects for the **Imperfect Pictures** class at the [School For Poetic Computation](https://sfpc.study/) (SFPC). The site features a desktop of draggable project nodes. Each project can potentially be opened, downloaded, or visited externally, with internal project pages shown in overlay windows.

## Live version

[https://projects.sfpc.study/imperfect-pictures/](https://projects.sfpc.study/imperfect-pictures/)

---

## Site Overview

- **Desktop view** (default): draggable project "nodes" (thumbnails) are randomly arranged across the viewport on each load.
- **List view**: Opens as an overlay window above the desktop, listing all projects in a sortable table (by **Name / Creator / Session**).
- **Project windows**: Clicking a project (in desktop or list view) will:
    - Open an internal page in an overlay window (for `.html` projects)
    - Trigger a file download (for downloadable projects)
    - Open an external link in a new tab (for external projects)

The bottom **nav bar** contains buttons for **About**, **List**, and **Shuffle**.

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
  "external": false,
  "download": false,
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
- `external` (optional boolean): Set to `true` if the link should always open externally (in a new tab), even if it appears to be an internal link. Defaults to `false`.
- `download` (optional boolean or string): Set to `true` to trigger download of the file at `link` when clicked. If a string, it sets the saved filename. If `false` or omitted, clicking navigates normally.
- `creatorLinks` (optional array): List of objects like `{ "label": "Portfolio", "url": "https://..." }` for multiple labeled links (e.g. website, Instagram, etc).
- `description` (optional string): Description shown in the context menu or on hover in list/desktop views.

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
