(function () {
    const byId = (id) => document.getElementById(id);
    const desktop = byId('desktop');
    const overlayBackdrop = byId('overlay-backdrop');
    let listContainer = null;
    const shuffleButton = byId('shuffle-button');
    const listButton = byId('list-button');
    const aboutButton = byId('about-button');

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

    let descriptionKey = null;
    let descriptionCloseHandler = null;

    function getDescriptionKey(item) {
        if (!item) return '';
        const key = item.link || item.title || '';
        return String(key).trim();
    }

    function isDescriptionOpenFor(item) {
        const key = getDescriptionKey(item);
        return !!key && key === descriptionKey;
    }

    function closeDescriptionWindow() {
        if (descriptionCloseHandler) {
            document.removeEventListener('click', descriptionCloseHandler);
            descriptionCloseHandler = null;
        }
        document.querySelectorAll('.description-window').forEach(el => el.remove());
        descriptionKey = null;
    }

    /* UTILITIES */

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function hasValue(v) {
        return v != null && String(v).trim().length > 0;
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

    function isItemExternal(item) {
        if (!item) return false;
        if (item.external === true) return true;
        if (item.external === false) return false;
        return !!(item.link && isExternalLink(item.link));
    }

    function isItemDownload(item) {
        return !!(item && item.download);
    }

    function isInternalNavigable(item) {
        if (!item || !item.link) return false;
        if (isItemDownload(item)) return false;
        if (isItemExternal(item)) return false;
        return true;
    }

    function isWorkInProgress(item) {
        if (!item) return false;
        if (item.wip === true) return true;
        const link = String(item.link || '').trim().toLowerCase();
        return link === 'wip.html';
    }

    function closeContextMenus() {
        document.querySelectorAll('.node-menu, .creator-menu').forEach(m => m.remove());
    }

    function mountContextMenu(menu) {
        if (!menu) return null;
        document.body.appendChild(menu);
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
        return menu;
    }

    function configureAnchorForItem(anchor, item) {
        if (!anchor || !item) return;
        anchor.href = item.link || '#';
        anchor.removeAttribute('download');
        anchor.target = '_self';
        anchor.rel = '';
        if (isItemDownload(item)) {
            const name = typeof item.download === 'string' ? item.download : '';
            if (name) anchor.setAttribute('download', name);
            else anchor.setAttribute('download', '');
        } else if (isItemExternal(item)) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        }
    }

    function triggerItemAction(item) {
        if (!item || !item.link) return;
        if (isItemDownload(item)) {
            const tmp = document.createElement('a');
            tmp.href = item.link;
            if (typeof item.download === 'string') tmp.setAttribute('download', item.download);
            else tmp.setAttribute('download', '');
            tmp.hidden = true;
            document.body.appendChild(tmp);
            tmp.click();
            tmp.remove();
            return;
        }
        if (isItemExternal(item)) {
            window.open(item.link, '_blank', 'noopener,noreferrer');
            return;
        }
        openProject(item.link, item.title);
    }

    function showCreatorLinksMenu(x, y, links) {
        if (!Array.isArray(links) || links.length === 0) return;
        const menu = document.createElement('div');
        menu.className = 'creator-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        links.forEach(linkObj => {
            const a = document.createElement('a');
            a.href = linkObj.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = linkObj.label || linkObj.url;
            menu.appendChild(a);
        });
        mountContextMenu(menu);
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
        setTimeout(() => {
            const windowPanel = appended.querySelector('.window-panel.floating');
            if (windowPanel) {
                windowPanel.classList.remove('maximized');
            }
        }, 0);
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
        const w = createWindow('list', 'Projects', tplList, () => {
            closeOverlay(w.overlay);
            if (selectedRow) {
                selectedRow.classList.remove('selected');
                selectedRow = null;
            }
        });
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

    function ensureProjectFrameElement(w) {
        if (!w || !w.viewport) return null;
        let frame = w.viewport.querySelector('#project-frame');
        if (!(frame instanceof HTMLIFrameElement)) {
            w.viewport.querySelectorAll('.iframe-fallback').forEach(el => el.remove());
            frame = document.createElement('iframe');
            frame.id = 'project-frame';
            frame.className = 'project-frame';
            frame.title = 'Embedded project';
            frame.src = 'about:blank';
            w.viewport.appendChild(frame);
        }
        projectFrame = frame;
        return frame;
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
        if (item) {
            triggerItemAction(item);
            return;
        }
        const external = isExternalLink(link);
        const target = external ? '_blank' : '_self';
        const features = external ? 'noopener,noreferrer' : '';
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

            const anchor = document.createElement('a');
            anchor.className = 'thumb';
            configureAnchorForItem(anchor, item);
            anchor.tabIndex = 0;

            const hasDownload = isItemDownload(item);
            const isExternal = isItemExternal(item);
            const workInProgress = isWorkInProgress(item);

            if (workInProgress) {
                node.classList.add('is-wip');
            }

            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeContextMenus();

                const menu = document.createElement('div');
                menu.className = 'node-menu';
                const rect = anchor.getBoundingClientRect();
                const left = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                const top = e.pageY || (rect.bottom + window.scrollY);
                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;

                const viewProj = document.createElement('button');
                viewProj.textContent = hasDownload ?
                    'Download Project' :
                    isExternal ?
                        'View Project (New Tab)' :
                        'View Project';
                viewProj.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.remove();
                    triggerItemAction(item);
                });
                menu.appendChild(viewProj);

                if (hasValue(item.description)) {
                    const descBtn = document.createElement('button');
                    const descOpen = isDescriptionOpenFor(item);
                    descBtn.textContent = descOpen ? 'Hide Description' : 'View Description';
                    descBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        menu.remove();
                        if (isDescriptionOpenFor(item)) {
                            closeDescriptionWindow();
                        } else {
                            showDescriptionWindow(item);
                        }
                    });
                    menu.appendChild(descBtn);
                }

                mountContextMenu(menu);
            });

            const img = document.createElement('img');
            img.alt = `${item.title} — ${item.creator}`;
            const hasImage = item.image && String(item.image).trim().length > 0;
            img.src = hasImage ? item.image : nextPlaceholder();
            img.draggable = false;
            anchor.appendChild(img);

            const caption = document.createElement('figcaption');
            caption.className = 'caption';

            const creatorWrap = document.createElement('div');
            creatorWrap.className = 'creator';
            if (Array.isArray(item.creatorLinks) && item.creatorLinks.length > 0) {
                const creatorLink = document.createElement('a');
                creatorLink.href = '#';
                creatorLink.className = 'creator-link';
                creatorLink.textContent = item.creator || '';
                creatorLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeContextMenus();
                    const rect = creatorLink.getBoundingClientRect();
                    const x = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                    const y = e.pageY || (rect.bottom + window.scrollY);
                    showCreatorLinksMenu(x, y, item.creatorLinks);
                });
                creatorWrap.appendChild(creatorLink);
            } else if (hasValue(item.creatorLink)) {
                const creatorLink = document.createElement('a');
                creatorLink.href = item.creatorLink;
                creatorLink.target = '_blank';
                creatorLink.rel = 'noopener noreferrer';
                creatorLink.textContent = item.creator || '';
                creatorWrap.appendChild(creatorLink);
            } else {
                creatorWrap.textContent = item.creator || '';
            }

            const titleWrap = document.createElement('div');
            titleWrap.className = 'title';
            titleWrap.textContent = item.title || '';
            if (workInProgress) {
                titleWrap.classList.add('is-wip');
            }

            caption.appendChild(creatorWrap);
            caption.appendChild(titleWrap);

            node.appendChild(anchor);
            node.appendChild(caption);
            desktop.appendChild(node);

            node.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                selectNode(node);
                anchor.click();
            });
            node.addEventListener('dblclick', (e) => {
                if (e.target.closest('a')) return;
                e.preventDefault();
                anchor.click();
            });

            node.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    anchor.click();
                    e.preventDefault();
                }
            });
            node.tabIndex = 0;
        });
    }

    function renderList(items) {
        listContainer.innerHTML = '';
        items.forEach((item) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.dataset.link = item.link;

            const isDownload = isItemDownload(item);
            const isExternal = isItemExternal(item);
            const workInProgress = isWorkInProgress(item);

            if (workInProgress) {
                li.classList.add('is-wip');
            }

            const name = document.createElement('span');
            name.className = 'name';

            const anchor = document.createElement('a');
            configureAnchorForItem(anchor, item);
            anchor.textContent = item.title || '';
            if (workInProgress) {
                anchor.classList.add('is-wip');
            }
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeContextMenus();
                selectRow(li);

                const menu = document.createElement('div');
                menu.className = 'node-menu';
                const rect = anchor.getBoundingClientRect();
                const left = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                const top = e.pageY || (rect.bottom + window.scrollY);
                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;

                const viewProj = document.createElement('button');
                viewProj.textContent = isDownload ?
                    'Download Project' :
                    isExternal ?
                        'View Project (New Tab)' :
                        'View Project';
                viewProj.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.remove();
                    triggerItemAction(item);
                });
                menu.appendChild(viewProj);

                if (hasValue(item.description)) {
                    const descBtn = document.createElement('button');
                    const existingDesc = li.nextElementSibling?.classList.contains('list-description');
                    descBtn.textContent = existingDesc ? 'Hide Description' : 'View Description';
                    descBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        menu.remove();
                        selectRow(li);
                        if (existingDesc) {
                            li.nextElementSibling.remove();
                        } else {
                            listContainer.querySelectorAll('.list-description').forEach(el => el.remove());
                            showListDescription(li, item.description);
                        }
                    });
                    menu.appendChild(descBtn);
                }

                mountContextMenu(menu);
            });
            name.appendChild(anchor);

            const creator = document.createElement('span');
            creator.className = 'creator';

            if (Array.isArray(item.creatorLinks) && item.creatorLinks.length > 0) {
                const creatorLink = document.createElement('a');
                creatorLink.href = '#';
                creatorLink.textContent = item.creator || '';
                creatorLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeContextMenus();
                    const rect = creatorLink.getBoundingClientRect();
                    const x = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                    const y = e.pageY || (rect.bottom + window.scrollY);
                    showCreatorLinksMenu(x, y, item.creatorLinks);
                });
                creator.appendChild(creatorLink);
            } else if (hasValue(item.creatorLink)) {
                const creatorLink = document.createElement('a');
                creatorLink.href = item.creatorLink;
                creatorLink.target = '_blank';
                creatorLink.rel = 'noopener noreferrer';
                creatorLink.textContent = item.creator || '';
                creator.appendChild(creatorLink);
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
            const candidate = {
                x,
                y,
                w,
                h
            };
            let collides = false;
            for (let i = 0; i < placed.length; i++) {
                if (rectsOverlap(candidate, placed[i], pad)) {
                    collides = true;
                    break;
                }
            }
            if (!collides) return {
                x,
                y
            };
            attempts++;
        }
        if (pad > 0) return findNonOverlappingPosition(w, h, cw, ch, placed, 0, Math.floor(maxAttempts / 2));
        return {
            x: Math.random() * maxX,
            y: Math.random() * maxY
        };
    }

    function layoutNodesNonOverlapping(nodes) {
        const {
            width: cw,
            height: ch
        } = desktop.getBoundingClientRect();
        // Attempt to scatter nodes broadly, retrying with lower padding when space is tight.
        const pad = getCssNumber('--space-md', 8);
        const placed = [];
        const maxAttempts = 200;
        nodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            const w = rect.width || node.offsetWidth || 220;
            const h = rect.height || node.offsetHeight || 180;
            const pos = findNonOverlappingPosition(w, h, cw, ch, placed, pad, maxAttempts);
            setNodePosition(node, pos.x, pos.y);
            placed.push({
                x: pos.x,
                y: pos.y,
                w,
                h
            });
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
        let startX = 0,
            startY = 0,
            origX = 0,
            origY = 0;
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
            origX = p.x;
            origY = p.y;
            startX = e.clientX;
            startY = e.clientY;
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

            const {
                width: cw,
                height: ch
            } = desktop.getBoundingClientRect();
            const rect = active.getBoundingClientRect();
            let nx = origX + dx;
            let ny = origY + dy;
            const w = rect.width,
                h = rect.height;
            nx = clamp(nx, 0, cw - w);
            ny = clamp(ny, 0, ch - h);
            setNodePosition(active, nx, ny);
            e.preventDefault();
        };

        const onPointerUp = (e) => {
            if (active) {
                try {
                    active.releasePointerCapture(e.pointerId);
                } catch { }
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

    function runAfterInitialLoadAndPaint(cb) {
        const run = () => {
            // Wait two frames after load so layout/style calculations are stable.
            requestAnimationFrame(() => requestAnimationFrame(cb));
        };
        if (document.readyState === 'complete') run();
        else window.addEventListener('load', run, {
            once: true
        });
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

        const item = allItems.find(it => it.link === link) || {};
        const hasDownload = isItemDownload(item);
        const isExternal = isItemExternal(item);
        const isMedia = /\.(gif|png|jpe?g|mp4|webm)$/i.test(link);

        if (hasDownload) {
            const a = document.createElement('a');
            a.href = link;
            if (typeof item.download === 'string') a.setAttribute('download', item.download);
            else a.setAttribute('download', '');
            a.hidden = true;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        openOverlay(w.overlay, () => {
            w.titleSpan.textContent = titleText || 'Project';
            w.titleSpan.title = 'Open project in new tab';
            w.titleSpan.onclick = () => {
                window.open(link, '_blank', 'noopener,noreferrer');
            };
            const section = w.overlay.querySelector('section');
            if (section) {
                const base = 'Project window';
                section.setAttribute('aria-label', titleText ? `${base} — ${titleText}` : base);
            }

            const frame = ensureProjectFrameElement(w);
            if (!frame) return;
            const parent = frame.parentElement;
            if (parent) {
                parent.querySelectorAll('.iframe-fallback').forEach(el => el.remove());
            }
            frame.style.removeProperty('display');

            if (isMedia) {
                const isVideo = /\.(mp4|webm)$/i.test(link);
                frame.removeAttribute('src');
                // Use srcdoc so media can render without navigating the iframe to a different origin.
                frame.srcdoc = `
                    <style>
                        body {
                            margin: 0;
                            background: #000;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                        }
                        img, video {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }
                    </style>
                    ${isVideo
                        ? `<video src="${link}" autoplay loop muted playsinline></video>`
                        : `<img src="${link}" alt="${titleText || 'Project'}">`
                    }
                `;
                return;
            }

            frame.removeAttribute('srcdoc');
            let didLoad = false;

            const showIframeFallback = () => {
                if (didLoad) return;
                didLoad = true;
                if (!frame.parentElement) return;

                const fallback = document.createElement('div');
                fallback.className = 'iframe-fallback';

                const msg = document.createElement('p');
                msg.textContent = 'Error loading project window. You can try opening it in a new tab:';
                fallback.appendChild(msg);

                const btn = document.createElement('button');
                btn.textContent = 'Open in new tab';
                btn.className = 'task-btn';
                btn.addEventListener('click', () => {
                    window.open(link, '_blank', 'noopener,noreferrer');
                });
                fallback.appendChild(btn);

                frame.removeAttribute('src');
                frame.style.display = 'none';
                frame.parentElement.appendChild(fallback);
            };

            function onIframeError() {
                showIframeFallback();
            }
            function onIframeLoad() {
                // Cross-origin iframes often expose no readable document to this page.
                // Treat load as success and reserve fallback for real iframe error events.
                didLoad = true;
            }
            frame.onerror = onIframeError;
            frame.onload = onIframeLoad;

            frame.src = link;
        });
    }

    function showDescriptionWindow(item) {
        closeDescriptionWindow();

        const box = document.createElement('div');
        box.className = 'description-window';

        const header = document.createElement('div');
        header.className = 'description-header';

        const titleLink = document.createElement('a');
        titleLink.href = item.link;
        titleLink.textContent = item.title;
        if (isInternalNavigable(item)) {
            titleLink.addEventListener('click', (e) => {
                e.preventDefault();
                openProject(item.link, item.title);
                closeDescriptionWindow();
            });
        } else if (isItemExternal(item)) {
            titleLink.target = '_blank';
            titleLink.rel = 'noopener noreferrer';
        }
        header.appendChild(titleLink);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'description-close';
        closeBtn.setAttribute('aria-label', 'Close description');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeDescriptionWindow();
        });
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'description-body';
        const creatorBlock = document.createElement('div');
        creatorBlock.className = 'description-creator';
        if (Array.isArray(item.creatorLinks) && item.creatorLinks.length > 0) {
            const creatorLink = document.createElement('a');
            creatorLink.href = '#';
            creatorLink.className = 'creator-link';
            creatorLink.textContent = item.creator || '';
            creatorLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeContextMenus();
                const rect = creatorLink.getBoundingClientRect();
                const x = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                const y = e.pageY || (rect.bottom + window.scrollY);
                showCreatorLinksMenu(x, y, item.creatorLinks);
            });
            creatorBlock.appendChild(creatorLink);
        } else if (hasValue(item.creatorLink)) {
            const creatorLink = document.createElement('a');
            creatorLink.href = item.creatorLink;
            creatorLink.target = '_blank';
            creatorLink.rel = 'noopener noreferrer';
            creatorLink.textContent = item.creator || '';
            creatorBlock.appendChild(creatorLink);
        } else {
            creatorBlock.textContent = item.creator || '';
        }

        const subtitle = document.createElement('div');
        subtitle.className = 'description-subtitle';
        subtitle.appendChild(creatorBlock);

        if (hasValue(item.session)) {
            const sessionBlock = document.createElement('div');
            sessionBlock.className = 'description-session';
            sessionBlock.textContent = item.session;
            subtitle.appendChild(sessionBlock);
        }

        const textBlock = document.createElement('p');
        textBlock.className = 'description-text';
        textBlock.textContent = item.description || '';

        body.appendChild(subtitle);
        body.appendChild(textBlock);

        box.appendChild(header);
        box.appendChild(body);
        document.body.appendChild(box);

        descriptionKey = getDescriptionKey(item);

        const closeWin = (e) => {
            if (!box.contains(e.target)) {
                closeDescriptionWindow();
            }
        };
        descriptionCloseHandler = closeWin;
        setTimeout(() => document.addEventListener('click', closeWin), 0);
    }

    function updateToolbarState() {
        const aboutOpen = !!(windows.about && !windows.about.overlay.hidden);
        const listOpen = !!(windows.list && !windows.list.overlay.hidden);
        const projectOpen = !!(windows.project && !windows.project.overlay.hidden);
        const anyOpen = aboutOpen || listOpen || projectOpen;
        if (overlayBackdrop) overlayBackdrop.hidden = !anyOpen;
        if (aboutButton) {
            aboutButton.classList.toggle('active', aboutOpen);
            aboutButton.setAttribute('aria-pressed', String(aboutOpen));
            aboutButton.setAttribute('aria-label', aboutOpen ? 'About window open' : 'About');
        }
        if (listButton) {
            listButton.classList.toggle('active', listOpen);
            listButton.setAttribute('aria-pressed', String(listOpen));
            listButton.setAttribute('aria-label', listOpen ? 'Project list window open' : 'Switch to list view');
        }
        if (shuffleButton) shuffleButton.hidden = (aboutOpen || listOpen || projectOpen);
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
            enableDrag();

            runAfterInitialLoadAndPaint(() => {
                shuffleNodes();
                if (window.matchMedia("(max-width: 640px)").matches) {
                    const w = ensureList();
                    if (w && w.overlay.hidden) {
                        openOverlay(w.overlay, () => listContainer && listContainer.focus());
                    }
                }
            });
        })
        .catch(err => {
            console.error('Failed to load data/projects.json', err);
            desktop.innerHTML = '<p style="padding:1rem">Error loading projects, please try refreshing.</p>';
        });

    if (aboutButton) {
        aboutButton.addEventListener('click', (e) => {
            e.preventDefault();
            const w = ensureAbout();
            if (!w) return;
            if (w.overlay.hidden) {
                openOverlay(w.overlay);
            } else {
                closeOverlay(w.overlay);
            }
        });
    }

    if (listButton) {
        listButton.addEventListener('click', (e) => {
            e.preventDefault();
            const w = ensureList();
            if (!w) return;
            if (w.overlay.hidden) {
                openOverlay(w.overlay, () => listContainer && listContainer.focus());
            } else {
                closeOverlay(w.overlay);
            }
        });
    }

    if (shuffleButton) {
        shuffleButton.addEventListener('click', () => {
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

    function showListDescription(row, text) {
        listContainer.querySelectorAll('.list-description').forEach(el => el.remove());
        const desc = document.createElement('li');
        desc.className = 'list-description';
        desc.textContent = text;
        listContainer.insertBefore(desc, row.nextSibling);
    }

    function bindListInteractions() {
        if (!listContainer) return;
        listContainer.tabIndex = 0;
        listContainer.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li || !listContainer.contains(li)) return;
            const item = allItems.find(it => it.link === li.dataset.link);
            if (!item) return;
            const isDownload = isItemDownload(item);
            const isExternal = isItemExternal(item);

            const nameSpan = e.target.closest('.name');
            if (nameSpan) {
                e.preventDefault();
                e.stopPropagation();
                closeContextMenus();
                selectRow(li);
                const menu = document.createElement('div');
                menu.className = 'node-menu';
                const rect = nameSpan.getBoundingClientRect();
                const left = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                const top = e.pageY || (rect.bottom + window.scrollY);
                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;

                const viewProj = document.createElement('button');
                viewProj.textContent = isDownload ?
                    'Download Project' :
                    isExternal ?
                        'View Project (New Tab)' :
                        'View Project';
                viewProj.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.remove();
                    triggerItemAction(item);
                });
                menu.appendChild(viewProj);

                if (hasValue(item.description)) {
                    const viewDesc = document.createElement('button');
                    const existingDesc = li.nextElementSibling?.classList.contains('list-description');
                    viewDesc.textContent = existingDesc ? 'Hide Description' : 'View Description';
                    viewDesc.addEventListener('click', (e) => {
                        e.stopPropagation();
                        menu.remove();
                        selectRow(li);
                        if (existingDesc) {
                            li.nextElementSibling.remove();
                        } else {
                            listContainer.querySelectorAll('.list-description').forEach(el => el.remove());
                            showListDescription(li, item.description);
                        }
                    });
                    menu.appendChild(viewDesc);
                }

                mountContextMenu(menu);
                return;
            }

            const creatorSpan = e.target.closest('.creator');
            if (creatorSpan) {
                e.preventDefault();
                e.stopPropagation();
                closeContextMenus();
                if (Array.isArray(item.creatorLinks) && item.creatorLinks.length > 0) {
                    const rect = creatorSpan.getBoundingClientRect();
                    const x = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
                    const y = e.pageY || (rect.bottom + window.scrollY);
                    showCreatorLinksMenu(x, y, item.creatorLinks);
                } else if (item.creatorLink) {
                    window.open(item.creatorLink, '_blank', 'noopener');
                }
                return;
            }

            e.stopPropagation();
            selectRow(li);
            closeContextMenus();
            const menu = document.createElement('div');
            menu.className = 'node-menu';
            const rect = li.getBoundingClientRect();
            const left = e.pageX || (rect.left + rect.width / 2 + window.scrollX);
            const top = e.pageY || (rect.bottom + window.scrollY);
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;

            const viewProj = document.createElement('button');
            viewProj.textContent = isDownload ?
                'Download Project' :
                isExternal ?
                    'View Project (New Tab)' :
                    'View Project';
            viewProj.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.remove();
                triggerItemAction(item);
            });
            menu.appendChild(viewProj);

            if (hasValue(item.description)) {
                const viewDesc = document.createElement('button');
                const existingDesc = li.nextElementSibling?.classList.contains('list-description');
                viewDesc.textContent = existingDesc ? 'Hide Description' : 'View Description';
                viewDesc.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menu.remove();
                    if (existingDesc) {
                        li.nextElementSibling.remove();
                    } else {
                        listContainer.querySelectorAll('.list-description').forEach(el => el.remove());
                        showListDescription(li, item.description);
                    }
                });
                menu.appendChild(viewDesc);
            }

            mountContextMenu(menu);
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
