(function () {
    const byId = (id) => document.getElementById(id);
    const desktop = byId('desktop');
    const overlayBackdrop = byId('overlay-backdrop');
    let listContainer = null;
    const shuffleBtn = byId('shuffle-button');
    const listBtn = byId('list-button');
    const aboutBtn = byId('about-button');

    const tplOverlay = byId('overlay-template');
    const tplAbout = byId('about-content-template');
    const tplList = byId('list-content-template');
    const tplProject = byId('project-content-template');

    const windows = {
        about: null,
        list: null,
        project: null
    };

    const overlayZBase = (() => {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--z-overlay');
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 2000;
    })();

    let overlayZ = overlayZBase;

    function bringToFront(overlay) {
        if (!overlay) return;
        overlay.style.zIndex = String(++overlayZ);
    }

    let projectFrame = null;

    const PLACEHOLDER_PATH = 'assets/img/placeholders/placeholder_{NN}.png';
    const PLACEHOLDER_COUNT = 30;

    let selectedNode = null;
    let selectedRow = null;
    let allItems = [];
    let sortBy = 'title';
    let sortAsc = true;

    /* UTILITIES */

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function hasValue(v) {
        return v != null && String(v).trim().length > 0;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[s]));
    }

    function toURL(link) {
        try {
            return new URL(link, window.location.href);
        } catch {
            return null;
        }
    }

    function isExternalLink(link) {
        const u = toURL(link);
        if (!u) return false;
        return u.origin !== window.location.origin;
    }

    function isInternalNavigable(item) {
        if (!item || !item.link) return false;
        if (item.download) return false;
        return !isExternalLink(item.link);
    }

    function makeKey(item, idx) {
        const slug = (s) => String(s || '').toLowerCase().trim()
            .replace(/[\s]+/g, '-').replace(/[^a-z0-9\-_.:/]/g, '');
        const t = slug(item.title),
            c = slug(item.creator),
            i = slug(item.image);
        return `tc:${t}|${c}|${i || idx}`;
    }

    function createPlaceholderPicker() {
        const n = Math.max(1, PLACEHOLDER_COUNT);
        const padLen = String(n).length;
        const pool = Array.from({
            length: n
        }, (_, i) => String(i + 1).padStart(padLen, '0'));
        // Fisher–Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        let idx = 0;
        return function nextPlaceholder() {
            if (idx >= pool.length) idx = 0;
            const xx = pool[idx++];
            return String(PLACEHOLDER_PATH).replace('{NN}', xx);
        };
    }

    /* WINDOW CREATION */

    function createWindow(kind, titleText, contentTemplate, onClose) {
        if (!tplOverlay || !tplOverlay.content) return null;
        const frag = tplOverlay.content.cloneNode(true);
        const overlay = frag.querySelector('.overlay');
        const section = frag.querySelector('section');
        const panel = frag.querySelector('.window-panel');
        const titleSpan = frag.querySelector('.titlebar-text');
        const viewport = frag.querySelector('.window-viewport');

        overlay.id = `${kind}-overlay`;
        section.classList.remove('list');
        section.classList.add(kind);

        const defaultAria = (
            kind === 'about' ? 'About window' :
                kind === 'list' ? 'Project list window' :
                    kind === 'project' ? 'Project window' :
                        'Overlay window'
        );
        section.setAttribute('aria-label', defaultAria);

        titleSpan.textContent = titleText || '';

        const titleId = `${kind}-window-title`;
        titleSpan.id = titleId;
        if (panel) panel.setAttribute('aria-labelledby', titleId);

        if (contentTemplate && contentTemplate.content) {
            viewport.appendChild(contentTemplate.content.cloneNode(true));
        }

        document.getElementById('app').appendChild(frag);
        const appended = document.getElementById(`${kind}-overlay`);
        attachWindowControls(appended, () => (onClose ? onClose() : closeOverlay(appended)));
        return {
            overlay: appended,
            panel: appended.querySelector('.window-panel'),
            titleSpan: appended.querySelector('.titlebar-text'),
            viewport: appended.querySelector('.window-viewport')
        };
    }

    function ensureAbout() {
        if (windows.about) return windows.about;
        const w = createWindow('about', 'About — Imperfect Pictures', tplAbout, () => closeOverlay(w.overlay));
        if (!w) return null;
        w.overlay.hidden = true;
        windows.about = w;
        return w;
    }

    function ensureList() {
        if (windows.list) return windows.list;
        const w = createWindow('list', 'Projects', tplList, () => closeOverlay(w.overlay));
        if (!w) return null;
        listContainer = w.viewport.querySelector('#list-container');
        bindSortingHeaders(w.overlay);
        bindListInteractions();
        w.overlay.hidden = true;
        windows.list = w;
        return w;
    }

    function ensureProject() {
        if (windows.project) return windows.project;
        const w = createWindow('project', 'Project', tplProject, () => closeOverlay(w.overlay, () => projectFrame && projectFrame.removeAttribute('src')));
        if (!w) return null;
        projectFrame = w.viewport.querySelector('#project-frame');
        w.overlay.hidden = true;
        windows.project = w;
        return w;
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

    function openListRow(row) {
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

    function normalize(v) {
        return (v == null ? '' : String(v)).toLowerCase();
    }

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
        const map = {
            name: 'title',
            creator: 'creator',
            session: 'session'
        };
        const field = map[column];
        if (!field) return;
        if (sortBy === field) {
            sortAsc = !sortAsc;
        } else {
            sortBy = field;
            sortAsc = true;
        }
        renderList(getSortedItems());
        updateSortIndicators();
    }

    function updateSortIndicators() {
        const header = windows.list ? windows.list.overlay.querySelector('.list-header') : null;
        if (!header) return;
        header.querySelectorAll('.col').forEach(el => el.removeAttribute('data-sort'));
        const active =
            sortBy === 'title' ? header.querySelector('.name') :
                sortBy === 'creator' ? header.querySelector('.creator') :
                    sortBy === 'session' ? header.querySelector('.session') : null;
        if (active) active.setAttribute('data-sort', sortAsc ? 'asc' : 'desc');
    }

    /* RENDERING */

    function renderNodes(items) {
        desktop.innerHTML = '';
        const nextPlaceholder = createPlaceholderPicker();
        items.forEach((item, idx) => {
            const node = document.createElement('figure');
            node.className = 'node';
            node.dataset.key = makeKey(item, idx);

            const a = document.createElement('a');
            a.className = 'thumb';
            a.href = item.link;

            const hasDownload = !!item.download;
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

            if (isInternalNavigable(item)) {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
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

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                selectNode(node);
            });
            node.addEventListener('dblclick', (e) => {
                if (e.target.closest('a')) return;
                e.preventDefault();
                a.click();
            });

            node.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    a.click();
                    e.preventDefault();
                }
            });
            node.tabIndex = 0;
        });
    }

    function renderList(items) {
        listContainer.innerHTML = '';
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
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    openProject(item.link, item.title);
                });
            }
            name.appendChild(anchor);

            const creator = document.createElement('span');
            creator.className = 'creator';
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
            listContainer.appendChild(li);
        });
    }

    function getCssNumber(varName, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }

    function rectsOverlap(a, b, pad) {
        return !(a.x + a.w + pad <= b.x ||
            b.x + b.w + pad <= a.x ||
            a.y + a.h + pad <= b.y ||
            b.y + b.h + pad <= a.y);
    }

    function findNonOverlappingPosition(w, h, cw, ch, placed, pad, maxAttempts) {
        const maxX = Math.max(0, cw - w);
        const maxY = Math.max(0, ch - h);
        let attempts = 0;
        while (attempts < maxAttempts) {
            const x = Math.random() * maxX;
            const y = Math.random() * maxY;
            const candidate = { x, y, w, h };
            let collides = false;
            for (let i = 0; i < placed.length; i++) {
                if (rectsOverlap(candidate, placed[i], pad)) { collides = true; break; }
            }
            if (!collides) return { x, y };
            attempts++;
        }
        if (pad > 0) return findNonOverlappingPosition(w, h, cw, ch, placed, 0, Math.floor(maxAttempts / 2));
        return { x: Math.random() * maxX, y: Math.random() * maxY };
    }

    function layoutNodesNonOverlapping(nodes) {
        const { width: cw, height: ch } = desktop.getBoundingClientRect();
        const pad = getCssNumber('--space-md', 8);
        const placed = [];
        const maxAttempts = 200;
        nodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            const w = rect.width || node.offsetWidth || 220;
            const h = rect.height || node.offsetHeight || 180;
            const pos = findNonOverlappingPosition(w, h, cw, ch, placed, pad, maxAttempts);
            setNodePosition(node, pos.x, pos.y);
            placed.push({ x: pos.x, y: pos.y, w, h });
        });
    }

    /* SHUFFLING */

    function shuffleList() {
        if (!listContainer) return;
        const nodes = Array.from(listContainer.children);
        for (let i = nodes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
        }
        nodes.forEach(n => listContainer.appendChild(n));
    }

    function shuffleNodes() {
        const nodes = Array.from(desktop.querySelectorAll('.node'));
        for (let i = nodes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
        }
        layoutNodesNonOverlapping(nodes);
        let z = 1;
        nodes.forEach(n => n.style.zIndex = String(z++));
    }

    /* DRAGGING */

    function enableDrag() {
        let active = null;
        let startX = 0, startY = 0, origX = 0, origY = 0;
        let zTop = 1000;
        let isDragging = false;
        let suppressClick = false;
        const DRAG_THRESHOLD = 5;

        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            const node = e.target.closest('.node');
            if (!node) return;

            active = node;
            isDragging = false;
            selectNode(node);
            const p = getNodePosition(node);
            origX = p.x; origY = p.y;
            startX = e.clientX; startY = e.clientY;
        };

        const onPointerMove = (e) => {
            if (!active) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (!isDragging) {
                if (Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD) {
                    isDragging = true;
                    suppressClick = true;
                    active.setPointerCapture(e.pointerId);
                    active.style.zIndex = String(++zTop);
                } else {
                    return;
                }
            }

            const { width: cw, height: ch } = desktop.getBoundingClientRect();
            const rect = active.getBoundingClientRect();
            let nx = origX + dx;
            let ny = origY + dy;
            const w = rect.width, h = rect.height;
            nx = clamp(nx, 0, cw - w);
            ny = clamp(ny, 0, ch - h);
            setNodePosition(active, nx, ny);
            e.preventDefault();
        };

        const onPointerUp = (e) => {
            if (active) {
                try { active.releasePointerCapture(e.pointerId); } catch { }
            }
            active = null;
            isDragging = false;
        };

        const onClickCapture = (e) => {
            if (!suppressClick) return;
            if (desktop && desktop.contains(e.target)) {
                e.stopPropagation();
                e.preventDefault();
            }
            suppressClick = false;
        };

        desktop.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('click', onClickCapture, true);

        desktop.addEventListener('dragstart', (e) => e.preventDefault());
    }

    function setNodePosition(el, x, y) {
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.x = String(Math.round(x));
        el.dataset.y = String(Math.round(y));
    }

    function getNodePosition(el) {
        return {
            x: Number(el.dataset.x || 0),
            y: Number(el.dataset.y || 0)
        };
    }

    /* OVERLAY HANDLING */

    function openOverlay(overlay, onOpen) {
        if (!overlay) return;
        bringToFront(overlay);
        const panel = overlay.querySelector('.window-panel');
        if (panel) {
            panel.classList.remove('maximized');
            const maxBtn = panel.querySelector('.titlebar-btn.maximize');
            if (maxBtn) {
                const kind = panel.closest('section')?.classList[0] || 'overlay';
                maxBtn.textContent = '□';
                maxBtn.setAttribute('aria-label', `Maximize ${kind} window`);
            }
        }
        overlay.hidden = false;
        if (onOpen) onOpen();
        updateToolbarState();
    }

    function closeOverlay(overlay, onClose) {
        if (!overlay) return;
        overlay.hidden = true;
        if (onClose) onClose();
        updateToolbarState();
    }

    function openProject(link, titleText) {
        const w = ensureProject();
        if (!w) return;
        openOverlay(w.overlay, () => {
            w.titleSpan.textContent = titleText || 'Project';
            if (projectFrame) projectFrame.src = link;
            const section = w.overlay.querySelector('section');
            if (section) {
                const base = 'Project window';
                section.setAttribute('aria-label', titleText ? `${base} — ${titleText}` : base);
            }
        });
    }

    function updateToolbarState() {
        const aboutOpen = !!(windows.about && !windows.about.overlay.hidden);
        const listOpen = !!(windows.list && !windows.list.overlay.hidden);
        const projectOpen = !!(windows.project && !windows.project.overlay.hidden);
        const anyOpen = aboutOpen || listOpen || projectOpen;
        if (overlayBackdrop) overlayBackdrop.hidden = !anyOpen;
        if (aboutBtn) {
            aboutBtn.classList.toggle('active', aboutOpen);
            aboutBtn.setAttribute('aria-pressed', String(aboutOpen));
        }
        if (listBtn) {
            listBtn.classList.toggle('active', listOpen);
            listBtn.setAttribute('aria-pressed', String(listOpen));
        }
        if (shuffleBtn) shuffleBtn.hidden = (aboutOpen || listOpen || projectOpen);
    }

    /* INITIALIZATION */

    updateToolbarState();


    fetch('data/projects.json', {
        cache: 'no-store'
    })
        .then(r => r.json())
        .then(items => {
            allItems = items;

            renderNodes(allItems);
            ensureList();
            renderList(getSortedItems());
            updateSortIndicators();
            shuffleNodes();
            enableDrag();
            if (window.matchMedia("(max-width: 640px)").matches) {
                const w = ensureList();
                if (w && w.overlay.hidden) {
                    openOverlay(w.overlay, () => listContainer && listContainer.focus());
                }
            }
        })
        .catch(err => {
            console.error('Failed to load data/projects.json', err);
            desktop.innerHTML = '<p style="padding:1rem">Error loading projects, please try refreshing.</p>';
        });

    aboutBtn && aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const w = ensureAbout();
        if (!w) return;
        if (w.overlay.hidden) {
            openOverlay(w.overlay);
        } else {
            closeOverlay(w.overlay);
        }
    });

    listBtn && listBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const w = ensureList();
        if (!w) return;
        if (w.overlay.hidden) {
            openOverlay(w.overlay, () => listContainer && listContainer.focus());
        } else {
            closeOverlay(w.overlay);
        }
    });
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const listOpen = !!(windows.list && !windows.list.overlay.hidden);
            if (listOpen) {
                shuffleList();
            } else {
                shuffleNodes();
            }
        });
    }

    function attachWindowControls(overlay, onClose) {
        if (!overlay) return;
        const windowPanel = overlay.querySelector('.window-panel');
        if (!windowPanel) return;
        const maxBtn = windowPanel.querySelector('.titlebar-btn.maximize');
        const closeBtn = windowPanel.querySelector('.titlebar-close');

        windowPanel.addEventListener('mousedown', () => bringToFront(overlay));

        const getKind = () => windowPanel.closest('section')?.classList[0] || 'overlay';
        const syncMaxButton = () => {
            const maximized = windowPanel.classList.contains('maximized');
            const kind = getKind();
            if (maxBtn) {
                maxBtn.textContent = maximized ? '❐' : '□';
                maxBtn.setAttribute('aria-label', maximized ? `Restore ${kind} window` : `Maximize ${kind} window`);
            }
        };

        syncMaxButton();

        if (maxBtn) {
            maxBtn.addEventListener('click', () => {
                windowPanel.classList.toggle('maximized');
                syncMaxButton();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                onClose && onClose();
            });
        }
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay || (windowPanel && !windowPanel.contains(e.target))) {
                onClose && onClose();
            }
        });
        window.addEventListener('keydown', (e) => {
            const isOpen = !overlay.hidden;
            if (isOpen && e.key === 'Escape') {
                e.preventDefault();
                onClose && onClose();
            }
        });
    }



    function bindSortingHeaders(root) {
        const sortHeaderName = root.querySelector('.list-header .name');
        const sortHeaderCreator = root.querySelector('.list-header .creator');
        const sortHeaderSession = root.querySelector('.list-header .session');
        sortHeaderName && sortHeaderName.addEventListener('click', () => setSort('name'));
        sortHeaderCreator && sortHeaderCreator.addEventListener('click', () => setSort('creator'));
        sortHeaderSession && sortHeaderSession.addEventListener('click', () => setSort('session'));
    }

    if (desktop) {
        desktop.addEventListener('click', () => selectNode(null));
    }

    function bindListInteractions() {
        if (!listContainer) return;
        listContainer.tabIndex = 0;
        listContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;

            const li = e.target.closest('li');
            if (li && listContainer.contains(li)) {
                e.stopPropagation();
                selectRow(li);
                openListRow(li);
            } else {
                selectRow(null);
            }
        });
        listContainer.addEventListener('keydown', (e) => {
            const rows = Array.from(listContainer.children);
            const idx = selectedRow ? rows.indexOf(selectedRow) : -1;
            if (e.key === 'ArrowDown') {
                const next = rows[Math.min(idx + 1, rows.length - 1)] || rows[0];
                selectRow(next);
                next && next.scrollIntoView({
                    block: 'nearest'
                });
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                const prev = rows[Math.max(idx - 1, 0)] || rows[0];
                selectRow(prev);
                prev && prev.scrollIntoView({
                    block: 'nearest'
                });
                e.preventDefault();
            } else if (e.key === 'Enter') {
                openListRow(selectedRow);
                e.preventDefault();
            } else if (e.key === 'Home') {
                if (rows[0]) {
                    selectRow(rows[0]);
                    rows[0].scrollIntoView({
                        block: 'nearest'
                    });
                }
                e.preventDefault();
            } else if (e.key === 'End') {
                if (rows[rows.length - 1]) {
                    selectRow(rows[rows.length - 1]);
                    rows[rows.length - 1].scrollIntoView({
                        block: 'nearest'
                    });
                }
                e.preventDefault();
            }
        });
    }
})();