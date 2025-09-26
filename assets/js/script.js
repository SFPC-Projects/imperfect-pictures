(function () {
    const byId = (id) => document.getElementById(id);
    const canvas = byId('canvas');
    const listUl = byId('listUl');
    const yearOut = byId('year');
    const randomizeBtn = byId('randomizeBtn');
    const listViewLink = byId('listViewLink');
    const canvasViewLink = byId('canvasViewLink');

    yearOut.textContent = new Date().getFullYear();

    // Simple router between canvas and list via query param
    const url = new URL(window.location.href);
    const view = url.searchParams.get('view') || 'canvas';
    setView(view);

    listViewLink.addEventListener('click', (e) => { /* allow default */ });
    canvasViewLink.addEventListener('click', (e) => { /* allow default */ });

    // Data load
    fetch('data/projects.json', { cache: 'no-store' })
        .then(r => r.json())
        .then(items => {
            renderCanvas(items);
            renderList(items);
            // initial random placement unless saved
            if (!restorePositions(items)) randomizePositions();
            enableDrag();
        })
        .catch(err => {
            console.error('Failed to load data/projects.json', err);
            canvas.innerHTML = '<p style="padding:1rem">Could not load projects.json</p>';
        });

    function setView(mode) {
        const canvasSec = byId('canvas');
        const listSec = byId('list');
        if (mode === 'list') {
            listSec.hidden = false; canvasSec.hidden = true;
            listViewLink.hidden = true; canvasViewLink.hidden = false;
        } else {
            listSec.hidden = true; canvasSec.hidden = false;
            listViewLink.hidden = false; canvasViewLink.hidden = true;
        }
    }

    function renderCanvas(items) {
        canvas.innerHTML = '';
        items.forEach((item, idx) => {
            const node = document.createElement('figure');
            node.className = 'node';
            node.dataset.id = item.id ?? String(idx);

            // Anchor wraps image; caption sits below
            const a = document.createElement('a');
            a.className = 'thumb';
            a.href = item.href;
            a.target = item.target ?? '_blank';
            a.rel = 'noopener noreferrer';
            a.tabIndex = 0;
            a.setAttribute('aria-label', `${item.title} by ${item.creator}`);

            const img = document.createElement('img');
            img.alt = `${item.title} — ${item.creator}`;
            img.src = item.image;
            if (item.width) img.style.width = item.width + 'px';
            if (item.height) img.style.height = item.height + 'px';
            img.draggable = false;

            const cap = document.createElement('figcaption');
            cap.className = 'caption';
            cap.innerHTML = `<div class="creator">${escapeHtml(item.creator)}</div>
                       <div class="title">${escapeHtml(item.title)}</div>`;

            a.appendChild(img);
            node.appendChild(a);
            node.appendChild(cap);
            canvas.appendChild(node);

            // keyboard: Enter/Space opens link
            node.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    a.click();
                    ev.preventDefault();
                }
            });
            node.tabIndex = 0;
        });

        randomizeBtn.onclick = randomizePositions;
    }

    function renderList(items) {
        listUl.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${item.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} — ${escapeHtml(item.creator)}</a>`;
            listUl.appendChild(li);
        });
    }

    function randomizePositions() {
        const nodes = Array.from(canvas.querySelectorAll('.node'));
        const { width: cw, height: ch } = canvas.getBoundingClientRect();
        let z = 1;
        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const w = rect.width || 220;
            const h = rect.height || 180;
            const x = Math.max(4, Math.random() * (cw - w - 8));
            const y = Math.max(4, Math.random() * (ch - h - 8));
            setPos(node, x, y);
            node.style.zIndex = String(z++);
        });
        savePositions();
    }

    function enableDrag() {
        let active = null;
        let startX = 0, startY = 0, origX = 0, origY = 0;
        let zTop = 1000;

        const onPointerDown = (e) => {
            const node = e.target.closest('.node');
            if (!node) return;

            active = node;
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
            // position relative to canvas
            let nx = origX + dx;
            let ny = origY + dy;

            // Constrain inside canvas
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

        // Prevent default ghost image drag from the <img>
        canvas.addEventListener('dragstart', (e) => e.preventDefault());
    }

    // Position helpers (we use translate for smoother paint)
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
            data[n.dataset.id] = { x: Number(n.dataset.x || 0), y: Number(n.dataset.y || 0), z: Number(n.style.zIndex || 1) };
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
            const key = n.dataset.id ?? String(idx);
            const s = saved[key];
            if (s) {
                setPos(n, s.x || 0, s.y || 0);
                n.style.zIndex = String(s.z || 1);
                appliedAny = true;
            }
        });
        return appliedAny;
    }

    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }
})();
