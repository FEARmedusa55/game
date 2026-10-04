(() => {
  const LS = "megathread-site-v1";
  const $ = (s) => document.querySelector(s);
  let site, base;

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const safeUrl = (u) => (/^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u);

  function inline(t) {
    t = esc(t);
    return t
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img alt="${a}" src="${safeUrl(u)}">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => {
        const ext = /^https?:/i.test(u);
        return `<a href="${safeUrl(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  }

  function md(src) {
    const lines = src.replace(/\r/g, "").split("\n");
    let out = "", i = 0;
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
      if (/^---+$/.test(l.trim())) { out += "<hr>"; i++; continue; }
      if (/^>/.test(l)) {
        const q = [];
        while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
        let cls = "", tag = "";
        const t = q[0].match(/^\[!(IMPORTANT|NOTE)\]$/i);
        if (t) { q.shift(); cls = t[1].toLowerCase(); tag = `<span class="tag">${t[1].toUpperCase()}</span>`; }
        out += `<blockquote class="${cls}">${tag}${md(q.join("\n"))}</blockquote>`;
        continue;
      }
      if (/^\s*[-*]\s+/.test(l)) {
        out += "<ul>";
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) out += `<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`;
        out += "</ul>"; continue;
      }
      if (/^\s*\d+\.\s+/.test(l)) {
        out += "<ol>";
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) out += `<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ""))}</li>`;
        out += "</ol>"; continue;
      }
      const p = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|---+$|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) p.push(lines[i++]);
      out += `<p>${inline(p.join(" "))}</p>`;
    }
    return out;
  }

  const pageId = () => (location.hash.match(/^#\/([\w-]+)/) || [])[1] || site.pages[0]?.id;

  function render() {
    document.title = site.title;
    $("#brand").textContent = site.title;
    const d = $("#discord");
    d.textContent = site.discord?.label || "";
    d.href = site.discord?.url || "#";
    d.style.display = site.discord?.label ? "" : "none";
    $("#footer").textContent = site.footer || "";
    const id = pageId();
    $("#nav").innerHTML = site.pages.map((p) => `<a href="#/${p.id}" class="${p.id === id ? "on" : ""}">${esc(p.title)}</a>`).join("");
    const pg = site.pages.find((p) => p.id === id) || site.pages[0];
    $("#content").innerHTML = pg ? md(pg.body) : "<p>No pages yet.</p>";
    $("#sidebar").innerHTML = site.sidebar.map((c) => `<section class="card"><h3>${esc(c.title)}</h3>${md(c.body)}</section>`).join("");
  }

  /* ---------- storage ---------- */
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(site)); } catch {} };
  async function load() {
    base = await fetch("content/site.json", { cache: "no-store" }).then((r) => r.json());
    try { const s = localStorage.getItem(LS); site = s ? JSON.parse(s) : structuredClone(base); } catch { site = structuredClone(base); }
  }

  /* ---------- editor ---------- */
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
  function field(label, val, path, area) {
    return `<label>${label}</label>${area ? `<textarea data-p="${path}">${esc(val)}</textarea>` : `<input data-p="${path}" value="${esc(val)}">`}`;
  }
  function editorHtml() {
    const pageItems = site.pages.map((p, i) => `<div class="item">${field("Title", p.title, `pages.${i}.title`)}${field("ID (used in link #/id)", p.id, `pages.${i}.id`)}${field("Content (Markdown)", p.body, `pages.${i}.body`, 1)}
      <div class="row"><button class="btn" data-a="up" data-k="pages" data-i="${i}">↑</button><button class="btn" data-a="down" data-k="pages" data-i="${i}">↓</button><button class="btn red" data-a="del" data-k="pages" data-i="${i}">Delete</button></div></div>`).join("");
    const sideItems = site.sidebar.map((c, i) => `<div class="item">${field("Box title", c.title, `sidebar.${i}.title`)}${field("Box content (Markdown)", c.body, `sidebar.${i}.body`, 1)}
      <div class="row"><button class="btn" data-a="up" data-k="sidebar" data-i="${i}">↑</button><button class="btn" data-a="down" data-k="sidebar" data-i="${i}">↓</button><button class="btn red" data-a="del" data-k="sidebar" data-i="${i}">Delete</button></div></div>`).join("");
    return `<div class="row"><button class="btn green" data-a="close">✔ Done</button><button class="btn" data-a="export">⬇ Export JSON</button><label class="btn" style="margin:0">⬆ Import<input type="file" id="imp" accept=".json" hidden></label><button class="btn red" data-a="reset">Reset</button></div>
      <p style="font-size:14px">Changes show live and save in <b>your browser only</b>. To publish for everyone: <b>Export JSON</b> → replace <code>content/site.json</code> in the repo → commit to <code>main</code>.</p>
      <h2>Site</h2>${field("Site title", site.title, "title")}${field("Footer", site.footer, "footer")}${field("Button label", site.discord.label, "discord.label")}${field("Button URL", site.discord.url, "discord.url")}
      <h2>Pages (nav)</h2>${pageItems}<button class="btn" data-a="add" data-k="pages">+ Add page</button>
      <h2>Sidebar boxes</h2>${sideItems}<button class="btn" data-a="add" data-k="sidebar">+ Add box</button>`;
  }
  function setPath(path, v) {
    const k = path.split("."); let o = site;
    while (k.length > 1) o = o[k.shift()];
    o[k[0]] = v;
  }
  function openEditor(keepScroll) {
    const ed = $("#editor"), y = ed.scrollTop;
    ed.hidden = false; ed.innerHTML = editorHtml(); ed.scrollTop = keepScroll ? y : 0;
  }
  function wireEditor() {
    const ed = $("#editor");
    ed.addEventListener("input", (e) => {
      const p = e.target.dataset.p; if (!p) return;
      let v = e.target.value;
      if (/\.id$/.test(p)) v = slug(v);
      setPath(p, v); save();
      if (/\.id$/.test(p) && location.hash !== "#/" + v) { /* keep current page */ }
      render();
    });
    ed.addEventListener("change", (e) => {
      if (e.target.id !== "imp") return;
      const f = e.target.files[0]; if (!f) return;
      f.text().then((t) => { try { site = JSON.parse(t); save(); render(); openEditor(); } catch { alert("Invalid JSON file"); } });
    });
    ed.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const { a, k, i } = b.dataset, n = +i;
      if (a === "close") ed.hidden = true;
      else if (a === "export") {
        const l = document.createElement("a");
        l.href = URL.createObjectURL(new Blob([JSON.stringify(site, null, 2)], { type: "application/json" }));
        l.download = "site.json"; l.click();
      } else if (a === "reset") { if (confirm("Discard your local edits?")) { site = structuredClone(base); save(); render(); openEditor(); } }
      else if (a === "add") {
        if (k === "pages") { let id = "page", c = 1; while (site.pages.some((p) => p.id === id)) id = "page-" + ++c; site.pages.push({ id, title: "New page", body: "# New page\n\nWrite here." }); }
        else site.sidebar.push({ title: "New box", body: "Content here." });
        save(); render(); openEditor(true);
      } else if (a === "del") { site[k].splice(n, 1); save(); render(); openEditor(true); }
      else if (a === "up" || a === "down") {
        const j = a === "up" ? n - 1 : n + 1;
        if (j >= 0 && j < site[k].length) { [site[k][n], site[k][j]] = [site[k][j], site[k][n]]; save(); render(); openEditor(true); }
      }
    });
  }

  /* ---------- falling leaves + clouds ---------- */
  function ambience() {
    const c = document.querySelector(".clouds");
    for (let i = 0; i < 6; i++) {
      const e = document.createElement("i");
      e.style.cssText = `top:${5 + Math.random() * 35}%;width:${50 + Math.random() * 40}px;animation-duration:${70 + Math.random() * 80}s;animation-delay:-${Math.random() * 120}s;opacity:${.5 + Math.random() * .4}`;
      c.appendChild(e);
    }
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const cv = $("#leaves"), x = cv.getContext("2d"), cols = ["#4caf50", "#81c784", "#2e7d32", "#c0ca33", "#e6a23c"];
    let W, H, L = [];
    const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    size(); addEventListener("resize", size);
    const mk = (y) => ({ x: Math.random() * W, y: y ?? -10, s: 4 + Math.random() * 6, vy: .4 + Math.random() * .8, ph: Math.random() * 6, col: cols[(Math.random() * cols.length) | 0] });
    for (let i = 0; i < 28; i++) L.push(mk(Math.random() * H));
    (function tick(t) {
      x.clearRect(0, 0, W, H);
      for (const l of L) {
        l.y += l.vy; l.x += Math.sin(t / 900 + l.ph) * .6 + .25;
        if (l.y > H + 10 || l.x > W + 10) Object.assign(l, mk(), { x: Math.random() * W });
        x.fillStyle = l.col; x.globalAlpha = .75; x.fillRect(l.x | 0, l.y | 0, l.s, l.s);
      }
      requestAnimationFrame(tick);
    })(0);
  }

  (async () => {
    await load();
    render(); wireEditor(); ambience();
    addEventListener("hashchange", () => { render(); $("#nav").classList.remove("open"); scrollTo(0, 0); });
    $("#editToggle").onclick = () => ($("#editor").hidden ? openEditor() : ($("#editor").hidden = true));
    $("#menuBtn").onclick = () => $("#nav").classList.toggle("open");
  })();
})();
