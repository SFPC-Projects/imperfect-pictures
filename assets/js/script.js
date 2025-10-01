(function () {
    const byId = (id) => document.getElementById(id);
    const desktop = byId('desktop');
    const listUl = byId('listUl');
    const randomizeBtn = byId('randomizeBtn');
    const listViewLink = byId('listViewLink');

    const listOverlay = byId('listOverlay');
    const listWindow = byId('listWindow');
    const listClose = byId('listClose');
    const listMaxBtn = byId("listMaximize");

    const aboutBtn = byId('aboutBtn');
    const aboutOverlay = byId('aboutOverlay');
    const aboutWindow = byId('aboutWindow');
    const aboutClose = byId('aboutClose');
    const aboutMaxBtn = byId("aboutMaximize");

    const projectOverlay = byId('projectOverlay');
    const projectWindow = byId('projectWindow');
    const projectClose = byId('projectClose');
    const projectMaxBtn = byId("projectMaximize");
    const projectTitle = byId('projectTitle');
    const projectFrame = byId('projectFrame');

    const PLACEHOLDER_PATH = 'assets/img/placeholders/placeholder_{NN}.png';
    const PLACEHOLDER_COUNT = 30;

    let selectedNode = null;
    let selectedRow = null;
    let allItems = [];
    let sortBy = 'title';
    let sortAsc = true;

    /* UTILITIES */

    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

    function hasValue(v) { return v != null && String(v).trim().length > 0; }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }

    function isOverlayOpen() {
        return !!(aboutOverlay && !aboutOverlay.hidden);
    }

    function toURL(link) {
        try { return new URL(link, window.location.href); } catch { return null; }
    }
    function isExternalLink(link) {
        const u = toURL(link); if (!u) return false;
        return u.origin !== window.location.origin;
    }
    function isInternalNavigable(item) {
        if (!item || !item.link) return false;
        if (item.download) return false; // downloads should not embed
        return !isExternalLink(item.link);
    }

    function makeKey(item, idx) {
        const slug = (s) => String(s || '').toLowerCase().trim()
            .replace(/[\s]+/g, '-').replace(/[^a-z0-9\-_.:/]/g, '');
        const t = slug(item.title), c = slug(item.creator), i = slug(item.image);
        return `tc:${t}|${c}|${i || idx}`;
    }

    function createPlaceholderSequence() {
        const n = Math.max(1, PLACEHOLDER_COUNT);
        const padLen = String(n).length;
        const pool = Array.from({ length: n }, (_, i) => String(i + 1).padStart(padLen, '0'));
        // Fisher–Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        let idx = 0;
        return function nextPlaceholder() {
            if (idx >= pool.length) idx = 0; // repeats only after exhausting unique set
            const xx = pool[idx++];
            return String(PLACEHOLDER_PATH).replace('{NN}', xx);
        };
    }

    /* SELECTION STATE */

    function selectNode(node) {
        if (selectedNode) selectedNode.classList.remove('selected');
        selectedNode = node;
        if (node) node.classList.add('selected');
    }

    function selectRow(row) {
        if (selectedRow) selectedRow.classList.remove('selected');
        selectedRow = row;
        if (row) row.classList.add('selected');
    }

    function openRow(row) {
        if (!row) return;
        const link = row.dataset.link;
        if (!link) return;

        const item = allItems.find(it => it.link === link);
        if (item && isInternalNavigable(item)) {
            openProject(item.link, item.title);
            return;
        }
        const external = isExternalLink(link);
        const target = external ? '_blank' : '_self';
        const features = external ? 'noopener' : '';
        window.open(link, target, features);
    }

    /* SORTING */

    function normalize(v) { return (v == null ? '' : String(v)).toLowerCase(); }

    function getSortedItems() {
        const arr = allItems.slice();
        if (!sortBy) return arr;
        arr.sort((a, b) => {
            const A = normalize(a[sortBy]);
            const B = normalize(b[sortBy]);
            const cmp = A.localeCompare(B);
            return sortAsc ? cmp : -cmp;
        });
        return arr;
    }

    function setSort(column) {
        const map = { name: 'title', creator: 'creator', session: 'session' };
        const field = map[column];
        if (!field) return;
        if (sortBy === field) {
            sortAsc = !sortAsc;
        } else {
            sortBy = field; sortAsc = true;
        }
        renderList(getSortedItems());
        updateSortIndicators();
    }

    function updateSortIndicators() {
        const header = document.querySelector('#list .list-header');
        if (!header) return;
        header.querySelectorAll('.col').forEach(el => el.removeAttribute('data-sort'));
        const active =
            sortBy === 'title' ? header.querySelector('.name') :
                sortBy === 'creator' ? header.querySelector('.creator') :
                    sortBy === 'session' ? header.querySelector('.session') : null;
        if (active) active.setAttribute('data-sort', sortAsc ? 'asc' : 'desc');
    }

    /* RENDERING */

    function renderDesktop(items) {
        desktop.innerHTML = '';
        const nextPlaceholder = createPlaceholderSequence();
        items.forEach((item, idx) => {
            const node = document.createElement('figure');
            node.className = 'node';
            node.dataset.key = makeKey(item, idx);

            const a = document.createElement('a');
            a.className = 'thumb';
            a.href = item.link;

            const hasDownload = !!item.download; // true or string filename
            if (hasDownload) {
                if (typeof item.download === 'string') a.setAttribute('download', item.download);
                else a.setAttribute('download', '');
                a.target = '_self';
                a.rel = '';
            } else {
                const external = isExternalLink(item.link);
                a.target = external ? '_blank' : '_self';
                a.rel = external ? 'noopener noreferrer' : '';
            }

            a.tabIndex = 0;
            a.setAttribute('aria-label', `${item.title} by ${item.creator}${hasDownload ? ' — download' : ''}`);

            if (isInternalNavigable(item)) {
                a.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    openProject(item.link, item.title);
                });
            }

            const img = document.createElement('img');
            img.alt = `${item.title} — ${item.creator}`;
            const hasImage = item.image && String(item.image).trim().length > 0;
            img.src = hasImage ? item.image : nextPlaceholder();
            img.draggable = false;

            const cap = document.createElement('figcaption');
            cap.className = 'caption';
            // Creator with optional link
            let creatorHtml;
            if (hasValue(item.creatorLink)) {
                creatorHtml = `<a href="${escapeHtml(item.creatorLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.creator)}</a>`;
            } else {
                creatorHtml = escapeHtml(item.creator);
            }
            cap.innerHTML = `<div class="creator">${creatorHtml}</div>
                       <div class="title">${escapeHtml(item.title)}</div>`;

            a.appendChild(img);
            node.appendChild(a);
            node.appendChild(cap);
            desktop.appendChild(node);

            node.addEventListener('click', (ev) => {
                ev.stopPropagation();
                selectNode(node);
            });
            node.addEventListener('dblclick', (ev) => {
                ev.preventDefault();
                a.click();
            });

            node.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    a.click();
                    ev.preventDefault();
                }
            });
            node.tabIndex = 0;
        });
    }

    function renderList(items) {
        listUl.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.dataset.link = item.link;

            const external = isExternalLink(item.link);
            const name = document.createElement('span');
            name.className = 'name';

            const anchor = document.createElement('a');
            anchor.href = item.link;

            const hasDownload = !!item.download;
            if (hasDownload) {
                if (typeof item.download === 'string') anchor.setAttribute('download', item.download);
                else anchor.setAttribute('download', '');
                anchor.target = '_self';
            } else {
                anchor.target = external ? '_blank' : '_self';
                if (external) anchor.rel = 'noopener noreferrer';
            }

            anchor.textContent = item.title || '';
            if (isInternalNavigable(item)) {
                anchor.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    openProject(item.link, item.title);
                });
            }
            name.appendChild(anchor);

            const creator = document.createElement('span');
            creator.className = 'creator';
            // If creatorLink exists and is non-empty, make creator a link
            if (hasValue(item.creatorLink)) {
                const creatorA = document.createElement('a');
                creatorA.href = item.creatorLink;
                creatorA.target = '_blank';
                creatorA.rel = 'noopener noreferrer';
                creatorA.textContent = item.creator || '';
                creator.appendChild(creatorA);
            } else {
                creator.textContent = item.creator || '';
            }

            const session = document.createElement('span');
            session.className = 'session';
            session.textContent = item.session || '';

            li.appendChild(name);
            li.appendChild(creator);
            li.appendChild(session);
            listUl.appendChild(li);
        });
    }

    /* SHUFFLING */

    function shuffleList() {
        if (!listUl) return;
        const nodes = Array.from(listUl.children);
        for (let i = nodes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
        }
        nodes.forEach(n => listUl.appendChild(n));
    }

    function randomizePositions() {
        const nodes = Array.from(desktop.querySelectorAll('.node'));
        const { width: cw, height: ch } = desktop.getBoundingClientRect();
        let z = 1;
        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const w = rect.width || 220;
            const h = rect.height || 180;
            const maxX = Math.max(0, cw - w);
            const maxY = Math.max(0, ch - h);
            const x = clamp(Math.random() * maxX, 0, maxX);
            const y = clamp(Math.random() * maxY, 0, maxY);
            setPos(node, x, y);
            node.style.zIndex = String(z++);
        });
    }

    /* DRAGGING */

    function enableDrag() {
        let active = null;
        let startX = 0, startY = 0, origX = 0, origY = 0;
        let zTop = 1000;

        const onPointerDown = (e) => {
            const node = e.target.closest('.node');
            if (!node) return;

            active = node;
            selectNode(node);
            node.setPointerCapture(e.pointerId);
            node.style.zIndex = String(++zTop);
            const p = getPos(node);
            origX = p.x; origY = p.y;
            startX = e.clientX; startY = e.clientY;
            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!active) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const { width: cw, height: ch } = desktop.getBoundingClientRect();
            const rect = active.getBoundingClientRect();
            let nx = origX + dx;
            let ny = origY + dy;

            const w = rect.width, h = rect.height;
            nx = clamp(nx, 0, cw - w);
            ny = clamp(ny, 0, ch - h);

            setPos(active, nx, ny);
        };

        const onPointerUp = (e) => {
            if (active) {
                active.releasePointerCapture(e.pointerId);
            }
            active = null;
        };

        desktop.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        desktop.addEventListener('dragstart', (e) => e.preventDefault());
    }

    function setPos(el, x, y) {
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.x = String(Math.round(x));
        el.dataset.y = String(Math.round(y));
    }

    function getPos(el) {
        return { x: Number(el.dataset.x || 0), y: Number(el.dataset.y || 0) };
    }

    /* OVERLAY HANDLING */

    function openAbout() {
        if (!aboutOverlay) return;
        aboutOverlay.hidden = false;
        aboutClose && aboutClose.focus();
        updateControlsVisibility();
    }

    function closeAbout() {
        if (!aboutOverlay) return;
        aboutOverlay.hidden = true;
        updateControlsVisibility();
    }

    function openProject(link, titleText) {
        if (!projectOverlay || !projectFrame) return;
        if (projectTitle) projectTitle.textContent = titleText || 'Project';
        projectFrame.src = link;
        projectOverlay.hidden = false;
        if (projectClose) projectClose.focus();
        updateControlsVisibility();
    }
    function closeProject() {
        if (!projectOverlay) return;
        projectOverlay.hidden = true;
        if (projectFrame) projectFrame.src = 'about:blank';
        updateControlsVisibility();
    }


    /* VIEW TOGGLE */

    function updateControlsVisibility() {
        const aboutOpen = !!(aboutOverlay && !aboutOverlay.hidden);
        const listOpen = !!(listOverlay && !listOverlay.hidden);
        const projectOpen = !!(projectOverlay && !projectOverlay.hidden);
        if (aboutBtn) aboutBtn.classList.toggle('active', aboutOpen);
        if (listViewLink) listViewLink.classList.toggle('active', listOpen);
        if (randomizeBtn) randomizeBtn.hidden = (aboutOpen || listOpen || projectOpen);
    }
    /* INITIALIZATION */

    // Ensure listOverlay is hidden at start
    listOverlay && (listOverlay.hidden = true);
    updateControlsVisibility();


    fetch('data/projects.json', { cache: 'no-store' })
        .then(r => r.json())
        .then(items => {
            allItems = items;

            renderDesktop(allItems);
            renderList(getSortedItems());
            updateSortIndicators();
            randomizePositions();
            enableDrag();
        })
        .catch(err => {
            console.error('Failed to load data/projects.json', err);
            desktop.innerHTML = '<p style="padding:1rem">Error loading projects, please try refreshing.</p>';
        });

    // Nav bar
    aboutBtn && aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAbout();
    });
    listViewLink && listViewLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (listOverlay) listOverlay.hidden = false;
        if (listUl) listUl.focus();
        if (projectOverlay && !projectOverlay.hidden) closeProject();
        updateControlsVisibility();
    });
    randomizeBtn && (randomizeBtn.onclick = () => {
        const listOpen = !!(listOverlay && !listOverlay.hidden);
        if (listOpen) {
            shuffleList();
        } else {
            randomizePositions();
        }
    });

    // Window controls for overlays
    function attachWindowControls(overlay, onClose) {
        if (!overlay) return;
        const windowPanel = overlay.querySelector('.window-panel');
        if (!windowPanel) return;
        const maxBtn = windowPanel.querySelector('.titlebar-btn.maximize');
        const closeBtn = windowPanel.querySelector('.titlebar-btn.titlebar-close');
        let maximized = false;
        if (maxBtn) {
            maxBtn.addEventListener('click', () => {
                maximized = !maximized;
                windowPanel.classList.toggle('maximized', maximized);
                maxBtn.textContent = maximized ? "❐" : "□";
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                onClose && onClose();
            });
        }
        // Overlay click outside closes
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay || (windowPanel && !windowPanel.contains(e.target))) {
                onClose && onClose();
            }
        });
        // Escape closes
        window.addEventListener('keydown', (e) => {
            const isOpen = !overlay.hidden;
            if (isOpen && e.key === 'Escape') {
                e.preventDefault();
                onClose && onClose();
            }
        });
    }

    // Attach controls to overlays
    attachWindowControls(aboutOverlay, closeAbout);
    attachWindowControls(listOverlay, () => {
        if (listOverlay) listOverlay.hidden = true;
        updateControlsVisibility();
    });
    attachWindowControls(projectOverlay, closeProject);

    // Sorting headers
    const hdrName = document.querySelector('#list .list-header .name');
    const hdrCreator = document.querySelector('#list .list-header .creator');
    const hdrSession = document.querySelector('#list .list-header .session');
    hdrName && hdrName.addEventListener('click', () => setSort('name'));
    hdrCreator && hdrCreator.addEventListener('click', () => setSort('creator'));
    hdrSession && hdrSession.addEventListener('click', () => setSort('session'));

    // Desktop
    if (desktop) {
        desktop.addEventListener('click', () => selectNode(null));
    }

    // List
    if (listUl) {
        listUl.tabIndex = 0;
        listUl.addEventListener('click', (ev) => {
            const li = ev.target.closest('li');
            if (li && listUl.contains(li)) {
                ev.stopPropagation();
                selectRow(li);
            } else {
                selectRow(null);
            }
        });
        listUl.addEventListener('dblclick', (ev) => {
            const li = ev.target.closest('li');
            if (li && listUl.contains(li)) {
                ev.preventDefault();
                openRow(li);
            }
        });
        listUl.addEventListener('keydown', (ev) => {
            const rows = Array.from(listUl.children);
            const idx = selectedRow ? rows.indexOf(selectedRow) : -1;
            if (ev.key === 'ArrowDown') {
                const next = rows[Math.min(idx + 1, rows.length - 1)] || rows[0];
                selectRow(next);
                next && next.scrollIntoView({ block: 'nearest' });
                ev.preventDefault();
            } else if (ev.key === 'ArrowUp') {
                const prev = rows[Math.max(idx - 1, 0)] || rows[0];
                selectRow(prev);
                prev && prev.scrollIntoView({ block: 'nearest' });
                ev.preventDefault();
            } else if (ev.key === 'Enter') {
                openRow(selectedRow);
                ev.preventDefault();
            } else if (ev.key === 'Home') {
                if (rows[0]) { selectRow(rows[0]); rows[0].scrollIntoView({ block: 'nearest' }); }
                ev.preventDefault();
            } else if (ev.key === 'End') {
                if (rows[rows.length - 1]) { selectRow(rows[rows.length - 1]); rows[rows.length - 1].scrollIntoView({ block: 'nearest' }); }
                ev.preventDefault();
            }
        });
    }
})();
