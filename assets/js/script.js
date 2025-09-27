(function () {
    const byId = (id) => document.getElementById(id);
    const canvas = byId('canvas');
    const listUl = byId('listUl');
    const randomizeBtn = byId('randomizeBtn');
    const listViewLink = byId('listViewLink');

    const listOverlay = byId('listOverlay');
    const listWindow = byId('listWindow');
    const listClose = byId('listClose');

    const aboutBtn = byId('aboutBtn');
    const aboutOverlay = byId('aboutOverlay');
    const aboutWindow = byId('aboutWindow');
    const aboutClose = byId('aboutClose');

    let selectedNode = null;
    let selectedRow = null;
    let allItems = [];
    let sortBy = null;
    let sortAsc = true;
    let currentView = 'canvas';

    /* CONFIGURATION */

    const CONFIG = {};

    function mergeConfig(partial) {
        if (!partial || typeof partial !== 'object') return;
        if (typeof partial.placeholderCount === 'number') CONFIG.placeholderCount = partial.placeholderCount;
        if (typeof partial.initialView === 'string') CONFIG.initialView = partial.initialView;
        if (partial.defaultSort && typeof partial.defaultSort === 'object') {
            if (typeof partial.defaultSort.by === 'string') CONFIG.defaultSort.by = partial.defaultSort.by;
            if (typeof partial.defaultSort.asc === 'boolean') CONFIG.defaultSort.asc = partial.defaultSort.asc;
        }
        if (typeof partial.randomizeOnFirstLoad === 'boolean') CONFIG.randomizeOnFirstLoad = partial.randomizeOnFirstLoad;
        if (typeof partial.dragBoundsPadding === 'number') CONFIG.dragBoundsPadding = partial.dragBoundsPadding;
    }

    function loadConfig() {
        return fetch('data/config.json', { cache: 'no-store' })
            .then(r => r.ok ? r.json() : {})
            .then(json => { mergeConfig(json); })
            .catch(() => { /* keep defaults */ });
    }

    /* UTILITY */

    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }

    function isOverlayOpen() {
        return !!(aboutOverlay && !aboutOverlay.hidden);
    }

    function isExternalHref(href) {
        try {
            const u = new URL(href, window.location.href);
            return u.origin !== window.location.origin;
        } catch (_e) {
            return false;
        }
    }

    function makeKey(item, idx) {
        const slug = (s) => String(s || '').toLowerCase().trim()
            .replace(/[\s]+/g, '-').replace(/[^a-z0-9\-_.:/]/g, '');
        const t = slug(item.title), c = slug(item.creator), i = slug(item.image);
        return `tc:${t}|${c}|${i || idx}`;
    }

    // Placeholder images: assets/img/placeholder_XX.png
    function getPlaceholderSrc(key) {
        // Deterministic pseudo-random pick based on the node key so it stays stable across renders
        const n = Math.max(1, CONFIG.placeholderCount);
        let h = 0;
        for (let i = 0; i < key.length; i++) h = ((h << 5) - h) + key.charCodeAt(i) | 0;
        const idx = Math.abs(h) % n + 1;
        const xx = String(idx).padStart(2, '0');
        return `assets/img/placeholder_${xx}.png`;
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
        const href = row.dataset.href;
        if (href) {
            const external = isExternalHref(href);
            const target = external ? '_blank' : '_self';
            const features = external ? 'noopener' : '';
            window.open(href, target, features);
        }
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
        const map = { name: 'title', creator: 'creator', cls: 'class' };
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
                    sortBy === 'class' ? header.querySelector('.cls') : null;
        if (active) active.setAttribute('data-sort', sortAsc ? 'asc' : 'desc');
    }

    /* RENDERING */

    function renderCanvas(items) {
        canvas.innerHTML = '';
        items.forEach((item, idx) => {
            const node = document.createElement('figure');
            node.className = 'node';
            node.dataset.key = makeKey(item, idx);

            const a = document.createElement('a');
            a.className = 'thumb';
            a.href = item.href;
            const external = isExternalHref(item.href);
            a.target = external ? '_blank' : '_self';
            a.rel = external ? 'noopener noreferrer' : '';
            a.tabIndex = 0;
            a.setAttribute('aria-label', `${item.title} by ${item.creator}`);

            const img = document.createElement('img');
            img.alt = `${item.title} — ${item.creator}`;
            const key = node.dataset.key || makeKey(item, idx);
            const hasImage = item.image && String(item.image).trim().length > 0;
            img.src = hasImage ? item.image : getPlaceholderSrc(key);
            img.draggable = false;

            const cap = document.createElement('figcaption');
            cap.className = 'caption';
            cap.innerHTML = `<div class="creator">${escapeHtml(item.creator)}</div>
                       <div class="title">${escapeHtml(item.title)}</div>`;

            a.appendChild(img);
            node.appendChild(a);
            node.appendChild(cap);
            canvas.appendChild(node);

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

        canvas.addEventListener('click', () => selectNode(null));
    }

    function renderList(items) {
        listUl.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.dataset.href = item.href;

            const external = isExternalHref(item.href);
            const name = document.createElement('span');
            name.className = 'name';
            name.innerHTML = `<a href="${item.href}" target="${external ? '_blank' : '_self'}" ${external ? 'rel="noopener noreferrer"' : ''}>${escapeHtml(item.title)}</a>`;

            const creator = document.createElement('span');
            creator.className = 'creator';
            creator.textContent = item.creator || '';

            const cls = document.createElement('span');
            cls.className = 'cls';
            cls.textContent = item.class || '';

            li.appendChild(name);
            li.appendChild(creator);
            li.appendChild(cls);

            li.addEventListener('click', (ev) => {
                ev.stopPropagation();
                selectRow(li);
            });
            li.addEventListener('dblclick', (ev) => {
                ev.preventDefault();
                openRow(li);
            });

            listUl.appendChild(li);
        });

        listUl.tabIndex = 0;
        listUl.addEventListener('keydown', (ev) => {
            if (currentView !== 'list') return;
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

        listUl.addEventListener('click', () => selectRow(null));
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
        const nodes = Array.from(canvas.querySelectorAll('.node'));
        const { width: cw, height: ch } = canvas.getBoundingClientRect();
        let z = 1;
        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const w = rect.width || 220;
            const h = rect.height || 180;
            const pad = Math.max(0, CONFIG.dragBoundsPadding || 0);
            const maxX = Math.max(0, cw - w - pad);
            const maxY = Math.max(0, ch - h - pad);
            const x = clamp(Math.random() * maxX, pad, maxX);
            const y = clamp(Math.random() * maxY, pad, maxY);
            setPos(node, x, y);
            node.style.zIndex = String(z++);
        });
        savePositions();
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
            const { width: cw, height: ch, left, top } = canvas.getBoundingClientRect();
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
                savePositions();
            }
            active = null;
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        canvas.addEventListener('dragstart', (e) => e.preventDefault());
    }

    function setPos(el, x, y) {
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.x = String(Math.round(x));
        el.dataset.y = String(Math.round(y));
    }

    function getPos(el) {
        return { x: Number(el.dataset.x || 0), y: Number(el.dataset.y || 0) };
    }

    function savePositions() {
        const data = {};
        canvas.querySelectorAll('.node').forEach(n => {
            const k = n.dataset.key || n.dataset.id;
            if (!k) return;
            data[k] = { x: Number(n.dataset.x || 0), y: Number(n.dataset.y || 0), z: Number(n.style.zIndex || 1) };
        });
        try { localStorage.setItem('ipos', JSON.stringify(data)); } catch (_e) { }
    }

    function restorePositions(items) {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem('ipos') || 'null'); } catch (_e) { }
        if (!saved) return false;

        const nodes = Array.from(canvas.querySelectorAll('.node'));
        let appliedAny = false;
        nodes.forEach((n, idx) => {
            const key = n.dataset.key || n.dataset.id || String(idx);
            const s = saved[key];
            if (s) {
                setPos(n, s.x || 0, s.y || 0);
                n.style.zIndex = String(s.z || 1);
                appliedAny = true;
            }
        });
        return appliedAny;
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

    aboutBtn && aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAbout();
    });

    aboutClose && aboutClose.addEventListener('click', (e) => {
        e.preventDefault();
        closeAbout();
    });

    document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest && e.target.closest('#aboutClose');
        if (btn && isOverlayOpen()) {
            e.preventDefault();
            closeAbout();
        }
    }, true);
    // Click-outside on overlay background
    aboutOverlay && aboutOverlay.addEventListener('mousedown', (e) => {
        if (!isOverlayOpen()) return;
        if (e.target === aboutOverlay || (aboutWindow && !aboutWindow.contains(e.target))) {
            closeAbout();
        }
    });
    // Keyboard: Escape or Enter/Space on Close button closes
    window.addEventListener('keydown', (e) => {
        if (!isOverlayOpen()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeAbout();
        } else if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === aboutClose) {
            e.preventDefault();
            closeAbout();
        }
    });

    /* VIEW TOGGLE */

    function setView(mode) {
        currentView = mode;
        const canvasSec = byId('canvas');

        if (mode === 'list') {
            if (listOverlay) listOverlay.hidden = false;
            if (canvasSec) canvasSec.hidden = false; // keep canvas visible underneath
            if (listUl) listUl.focus();
        } else { // canvas
            if (listOverlay) listOverlay.hidden = true;
            if (canvasSec) canvasSec.hidden = false;
        }

        updateControlsVisibility();
    }

    function updateControlsVisibility() {
        const aboutOpen = !!(aboutOverlay && !aboutOverlay.hidden);
        if (aboutBtn) aboutBtn.classList.toggle('active', aboutOpen);
        if (listViewLink) listViewLink.classList.toggle('active', currentView === 'list');
        if (randomizeBtn) randomizeBtn.hidden = !(currentView === 'canvas' && !aboutOpen);
    }

    /* INITIALIZATION */

    loadConfig().then(() => {
        setView(CONFIG.initialView === 'list' ? 'list' : 'canvas');
        listOverlay && (listOverlay.hidden = CONFIG.initialView === 'list' ? false : true);
        updateControlsVisibility();

        listClose && listClose.addEventListener('click', (e) => {
            e.preventDefault();
            setView('canvas');
        });
        listOverlay && listOverlay.addEventListener('mousedown', (e) => {
            if (e.target === listOverlay || (listWindow && !listWindow.contains(e.target))) {
                setView('canvas');
            }
        });
        window.addEventListener('keydown', (e) => {
            if (currentView === 'list' && e.key === 'Escape') {
                e.preventDefault();
                setView('canvas');
            }
        });

        randomizeBtn.onclick = () => {
            if (currentView === 'list') {
                shuffleList();
            } else {
                randomizePositions();
            }
        };
        listViewLink.addEventListener('click', (e) => {
            e.preventDefault();
            setView('list');
        });

        fetch('data/projects.json', { cache: 'no-store' })
            .then(r => r.json())
            .then(items => {
                allItems = items;
                sortBy = (CONFIG.defaultSort && CONFIG.defaultSort.by) || null;
                sortAsc = (CONFIG.defaultSort && typeof CONFIG.defaultSort.asc === 'boolean')
                    ? CONFIG.defaultSort.asc : true;

                renderCanvas(allItems);
                renderList(getSortedItems());
                updateSortIndicators();

                const restored = restorePositions(allItems);
                if (!restored && CONFIG.randomizeOnFirstLoad) {
                    randomizePositions();
                }
                enableDrag();
            })
            .catch(err => {
                console.error('Failed to load data/projects.json', err);
                canvas.innerHTML = '<p style="padding:1rem">Could not load projects.json</p>';
            });

        // Header click sorting for list window
        const hdrName = document.querySelector('#list .list-header .name');
        const hdrCreator = document.querySelector('#list .list-header .creator');
        const hdrCls = document.querySelector('#list .list-header .cls');
        hdrName && hdrName.addEventListener('click', () => setSort('name'));
        hdrCreator && hdrCreator.addEventListener('click', () => setSort('creator'));
        hdrCls && hdrCls.addEventListener('click', () => setSort('cls'));
    });
})();
