const STORE = "prey.wtf.v1";

const DEFAULT_LUA = `-- Prey.Wtf cloud config (demo)
-- Visual editor only. Nothing here is executed remotely.

getgenv().Prey = {
  Combat = {
    SilentAim = {
      Enabled = true,
      HitChance = 100,
      Waitpart = "ClosestPart", -- ClosestPart | UpperTorso | Head
      ClosestPoint = { Enabled = true, Scale = 0.16 },
      Prediction = { Enabled = false, X = 4, Y = 4, Z = 8 },
      Sensor = {
        UseNoBarrelSS = false,
        Resolver = false,
        ClientConfirmer = false,
      },
    },
    AimAssist = {
      Enabled = false,
      Smoothness = 6.16,
      Mode = "Always", -- FOV | Toggle | Always
      ClosestPoint = { Name = "ClosestPart", Scale = 0.35 },
      LookingStyle = { Style = "Quadratic", Direction = "InOut" },
    },
    Triggerbot = {
      Enabled = false,
      Distance = 0.15,
      Type = "Toggle", -- Hold | Toggle
      HitPart = "Torso",
      Prediction = { X = 8, Y = 8, Z = 8 },
    },
  },
  Visuals = {
    InstanceCheck = { Enabled = false },
    FOV = { Enabled = true, Radius = 80, Filled = false },
  },
}
`;

const seedPeople = [
  ["SHO PM", "last seen"],
  ["stiky", "yoooo"],
  ["born", "chat im him"],
  ["jottatod", "tuff"],
  ["Jak", "wsg"],
  ["lilgoldent", "uh"],
  ["born", "hi guys"],
  ["born", "how we doing"],
  ["born", "💀"],
  ["nas", "N"],
  ["jottatod", "12"],
  ["genbuu8", "hello"],
  ["xk", "n word"],
  ["Osgid", "yn"],
  ["Osgid", " Moogy"],
  ["Punishere", "yoooo"],
];

const defaultState = () => ({
  user: {
    name: "imasexfreak",
    role: "UNIQUE CUSTOMER",
    id: "ENCRYPTED",
    balance: 106,
    key: "ok-" + cryptoRandom(28),
    hwid: "D8E-B4D9-****-G8CT",
    ip: "hidden",
    country: "United States",
    discord: { linked: true, tag: "Welcome-here_750", id: "750" },
    status: "ACTIVE",
    orders: 1,
    configName: "Default",
  },
  theme: { build: "abyss", color: "", custom: "Abyss Theme" },
  unlocked: false,
  configs: [
    { id: "default", name: "Default", lua: DEFAULT_LUA, updated: Date.now() },
  ],
  activeConfig: "default",
  messages: [
    { user: "SHO PM", text: "a", at: hoursAgo(5) },
    { user: "stiky", text: "yoooo", at: hoursAgo(4.8) },
    { user: "born", text: "chat im him", at: hoursAgo(4.2) },
    { user: "jottatod", text: "tuff", at: hoursAgo(3.9) },
    { user: "Jak", text: "wsg", at: hoursAgo(3.5) },
    { user: "lilgoldent", text: "uh", at: hoursAgo(3.1) },
    { user: "born", text: "hi guys", at: hoursAgo(2.8) },
    { user: "born", text: "how we doing", at: hoursAgo(2.4) },
    { user: "nas", text: "N", at: hoursAgo(1.6) },
    { user: "genbuu8", text: "hello", at: hoursAgo(1.1) },
    { user: "Punishere", text: "yoooo", at: hoursAgo(0.4) },
  ],
  session: { used: true, started: Date.now() - 3600_000 },
  passwordSet: false,
});

function hoursAgo(h) {
  return Date.now() - h * 3600_000;
}

function cryptoRandom(n) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) out += chars[buf[i] % chars.length];
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

let state = load();
let route = "home";
let chatFilter = "everyone";

const view = document.getElementById("view");
const rail = document.getElementById("rail");
const toasts = document.getElementById("toasts");

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  toasts.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function applyTheme() {
  document.body.className = `theme-${state.theme.build} ${state.theme.color ? "color-" + state.theme.color : ""}`;
  document.getElementById("chip-name").textContent = state.user.name;
  document.getElementById("chip-status").textContent = `ID · ${state.user.id}`;
  document.getElementById("chip-bal").textContent = `$${Number(state.user.balance).toFixed(2)}`;
  paintAvatar(document.getElementById("chip-avatar"), state.user.name);
}

function paintAvatar(el, name) {
  if (!el) return;
  el.textContent = (name || "?").slice(0, 1).toUpperCase();
  el.style.background = `linear-gradient(145deg, hsl(${hash(name) % 360} 42% 42%), #1a2a48)`;
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function copy(text, label = "Copied") {
  navigator.clipboard.writeText(text).then(() => toast(label)).catch(() => toast("Copy failed"));
}

function setRoute(next) {
  route = next;
  location.hash = next;
  render();
}

function currentConfig() {
  return state.configs.find((c) => c.id === state.activeConfig) || state.configs[0];
}

function pages() {
  return {
    home: renderHome,
    settings: renderSettings,
    security: renderSecurity,
    profile: renderProfile,
    broadcast: renderBroadcast,
    configs: renderConfigs,
  };
}

function render() {
  applyTheme();
  const showChrome = route !== "broadcast";
  document.getElementById("user-chip").classList.toggle("hidden", !showChrome || route === "configs");
  document.getElementById("discord-fab").classList.toggle("hidden", route === "broadcast" || route === "configs");
  rail.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.route === route));
  document.getElementById("settings-btn").classList.toggle("active", route === "settings");
  const fn = pages()[route] || renderHome;
  view.innerHTML = "";
  view.appendChild(fn());
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderHome() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div class="kicker">Dashboard layout</div>
    <div class="stack">
      <article class="card pad-lg welcome">
        <div class="avatar" id="home-av"></div>
        <div class="meta">
          <div class="kicker">Welcome back</div>
          <h2>${esc(u.name)}</h2>
          <div class="badge">${esc(u.role)}</div>
        </div>
      </article>
      <article class="card">
        <div class="key-row">
          <div class="kicker">🔑 License key</div>
          <button class="btn tiny" data-copy="key">Copy</button>
        </div>
        <div class="key-box"><code>${esc(u.key)}</code></div>
        <p class="hint">Share to redeem · Click copy to clipboard</p>
      </article>
    </div>
    <p class="foot">Built in 2026</p>
  `;
  paintAvatar(page.querySelector("#home-av"), u.name);
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key, "License key copied");
  return page;
}

function renderSettings() {
  const u = state.user;
  const builds = ["prey", "noreint", "eclipse", "noir", "obsidian", "abyss"];
  const colors = [
    ["soft-pink", "♡ Soft pink"],
    ["sakura", "♡ Sakura petal"],
    ["strawberry", "♡ Strawberry milk"],
    ["emerald", "♣ Emerald green"],
  ];
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="title">Settings</div>
      <div class="subtitle">Staring into the byte locks</div>
      <div class="grid-settings">
        <article class="card">
          <div class="kicker">Builds</div>
          <div class="builds" id="builds"></div>
          <div class="field">
            <label>Custom theme picker</label>
            <select id="custom-theme">
              <option>Abyss Theme</option>
              <option>Midnight Tide</option>
              <option>Void Glass</option>
              <option>Carbon Drift</option>
            </select>
          </div>
        </article>
        <article class="card">
          <div class="kicker">Account info</div>
          <strong style="display:block;margin:6px 0 10px">${esc(u.name)}</strong>
          <div class="kicker">Key</div>
          <div class="key-box" style="margin-top:8px">
            <code>${esc(u.key)}</code>
            <button class="btn tiny" data-copy="key">Copy</button>
          </div>
          <button class="btn white" id="get-script" style="margin-top:12px">Get script</button>
        </article>
        <article class="card">
          <div class="kicker">Account security</div>
          <div class="field"><label>Current password</label><input type="password" id="pw-cur" /></div>
          <div class="field"><label>New password</label><input type="password" id="pw-new" /></div>
          <div class="field"><label>Confirmation password</label><input type="password" id="pw-conf" /></div>
          <button class="btn white" id="pw-save">Change</button>
        </article>
        <article class="card">
          <div class="kicker">Color themes</div>
          <div class="themes" id="colors" style="margin-top:10px"></div>
        </article>
      </div>
    </div>
  `;
  const buildBox = page.querySelector("#builds");
  builds.forEach((b) => {
    const btn = el(`<button class="build ${state.theme.build === b ? "active" : ""}"><i class="dot"></i>${b}</button>`);
    btn.onclick = () => {
      state.theme.build = b;
      save();
      applyTheme();
      render();
    };
    buildBox.appendChild(btn);
  });
  const colorBox = page.querySelector("#colors");
  colors.forEach(([id, label]) => {
    const btn = el(`<button class="theme ${state.theme.color === id ? "active" : ""}">${label}</button>`);
    btn.onclick = () => {
      state.theme.color = state.theme.color === id ? "" : id;
      save();
      applyTheme();
      render();
    };
    colorBox.appendChild(btn);
  });
  page.querySelector("#custom-theme").value = state.theme.custom;
  page.querySelector("#custom-theme").onchange = (e) => {
    state.theme.custom = e.target.value;
    save();
    toast("Theme saved · " + e.target.value);
  };
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key, "Key copied");
  page.querySelector("#get-script").onclick = () => {
    const snippet = `-- Prey.Wtf loader (demo / local only)
print("Prey.Wtf · ${u.name}")
print("key · ${u.key}")
print("This dashboard does not fetch or execute remote scripts.")`;
    copy(snippet, "Loader copied to clipboard");
  };
  page.querySelector("#pw-save").onclick = () => {
    const a = page.querySelector("#pw-new").value;
    const b = page.querySelector("#pw-conf").value;
    if (!a || a.length < 6) return toast("Use at least 6 characters");
    if (a !== b) return toast("Passwords do not match");
    state.passwordSet = true;
    save();
    toast("Password updated");
    page.querySelectorAll("input").forEach((i) => (i.value = ""));
  };
  return page;
}

function renderSecurity() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="title">Security</div>
      <div class="subtitle">Manage your sessions & devices</div>
      <div class="grid-2">
        <article class="card">
          <div class="kicker">Device info</div>
          <div class="field" style="margin-top:12px"><label>HWID</label><div class="key-box" style="margin:0"><code>${esc(u.hwid)}</code></div></div>
          <div class="field"><label>Last IP</label><div class="key-box" style="margin:0"><code>${esc(u.ip)}</code></div></div>
          <div class="field"><label>Last country</label><div class="key-box" style="margin:0"><code>${esc(u.country)}</code></div></div>
        </article>
        <article class="card">
          <div class="kicker">Sessions</div>
          <div class="stat-row">
            <div class="stat"><span>Session</span><strong>${state.session.used ? "Used" : "Idle"}</strong></div>
            <div class="stat"><span>Since</span><strong>${fmtTime(state.session.started)}</strong></div>
          </div>
          <p class="hint">If you switched devices or your executor changed, reset your HWID to regain access.</p>
          <button class="btn white" id="reset-hwid" style="margin-top:14px">Reset HWID</button>
        </article>
      </div>
    </div>
  `;
  page.querySelector("#reset-hwid").onclick = () => {
    state.user.hwid = randHwid();
    state.session = { used: true, started: Date.now() };
    save();
    toast("HWID reset");
    render();
  };
  return page;
}

function randHwid() {
  const chunk = () => cryptoRandom(4).slice(0, 4).toUpperCase();
  return `${chunk()}-${chunk()}-****-${chunk()}`;
}

function renderProfile() {
  const u = state.user;
  const page = el(`<section class="page center"></section>`);
  page.innerHTML = `
    <div>
      <div class="kicker">👤 Profile</div>
      <div class="subtitle">Your account overview</div>
      <div class="grid-2">
        <article class="card">
          <div class="kicker">☁ Cloud Config</div>
          <div class="subtitle" style="margin-bottom:10px">Manage your saved layouts</div>
          <div class="stat-row">
            <div class="stat"><span>Active config</span><strong>${esc(currentConfig().name)}</strong></div>
            <div class="stat"><span>Total configs</span><strong>${state.configs.length}</strong></div>
          </div>
          <button class="btn white" data-route="configs">View & edit configs</button>
          <div class="kicker" style="margin:16px 0 8px">Linked account</div>
          <div class="card" style="padding:14px;box-shadow:none">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong>${u.discord.linked ? "Discord Connected" : "Not linked"}</strong>
                <p class="hint" style="margin:4px 0 0">${u.discord.linked ? esc(u.discord.tag) : "Connect to sync"}</p>
              </div>
              <span class="ok">${u.discord.linked ? "●" : "○"}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
              <span class="hint">Connected ${esc(u.discord.id)}</span>
              <button class="btn tiny" id="toggle-dc">${u.discord.linked ? "Unlink" : "Link"}</button>
            </div>
          </div>
        </article>
        <article class="card">
          <div class="welcome" style="margin-bottom:12px">
            <div class="avatar" id="pf-av"></div>
            <div>
              <h2 style="font-size:16px">${esc(u.name)}</h2>
              <div class="badge">${esc(u.role)}</div>
            </div>
          </div>
          <div class="kicker">License key</div>
          <div class="key-box">
            <code>${esc(u.key)}</code>
            <button class="btn tiny" data-copy="key">Copy</button>
          </div>
          <div class="pills">
            <div class="pill"><span>Status</span><strong class="ok">${esc(u.status)}</strong></div>
            <div class="pill"><span>Order</span><strong>${u.orders}</strong></div>
            <div class="pill"><span>Config</span><strong>${esc(u.configName)}</strong></div>
          </div>
          <div class="kicker">Discord user id</div>
          <div class="inline" style="margin-top:8px">
            <input id="dc-id" placeholder="e.g. 123456789" value="${esc(u.discord.id)}" />
            <button class="btn white" id="dc-save">Link</button>
          </div>
          <p class="hint">Find your ID in your Discord profile bio.</p>
        </article>
      </div>
    </div>
  `;
  paintAvatar(page.querySelector("#pf-av"), u.name);
  page.querySelector("[data-route=configs]").onclick = () => setRoute("configs");
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key);
  page.querySelector("#toggle-dc").onclick = () => {
    u.discord.linked = !u.discord.linked;
    save();
    toast(u.discord.linked ? "Discord linked" : "Discord unlinked");
    render();
  };
  page.querySelector("#dc-save").onclick = () => {
    const id = page.querySelector("#dc-id").value.trim();
    if (!id) return toast("Enter a Discord id");
    u.discord.id = id;
    u.discord.linked = true;
    u.discord.tag = `user_${id}`;
    save();
    toast("Discord id saved");
    render();
  };
  return page;
}

function renderConfigs() {
  if (!state.unlocked) {
    const page = el(`<section class="page"></section>`);
    page.innerHTML = `
      <div class="locked">
        <div>
          <div class="pulse"></div>
          <p>Waiting for script execution…</p>
          <p class="hint">Unlock to load a saved cloud config</p>
          <button class="btn" id="unlock">Unlock preview</button>
        </div>
      </div>
    `;
    page.querySelector("#unlock").onclick = () => {
      state.unlocked = true;
      save();
      toast("Preview unlocked");
      render();
    };
    return page;
  }

  const cfg = currentConfig();
  const page = el(`<section class="page" style="padding:72px 110px 24px 28px"></section>`);
  page.innerHTML = `
    <div class="editor-wrap">
      <article class="editor-card">
        <div class="editor-head">
          <strong>Prey.Wtf</strong>
          <div class="head-btns">
            <button class="btn tiny" id="reset">Reset</button>
            <button class="btn tiny" id="exec">Execute</button>
          </div>
        </div>
        <div class="editor-body">
          <pre class="gutter" id="gutter"></pre>
          <textarea id="lua" spellcheck="false">${esc(cfg.lua)}</textarea>
        </div>
      </article>
      <aside class="side-card">
        <div class="side-head">
          <div>
            <h3>Cloud Configs</h3>
            <p>Autosaved to this browser</p>
          </div>
          <div class="add-row">
            <input id="cfg-name" placeholder="Config name" />
            <button class="btn tiny" id="cfg-add">+</button>
          </div>
        </div>
        <div class="config-list" id="cfg-list"></div>
      </aside>
    </div>
  `;
  const ta = page.querySelector("#lua");
  const gutter = page.querySelector("#gutter");
  const syncGutter = () => {
    const n = ta.value.split("\n").length;
    gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
  };
  syncGutter();
  ta.addEventListener("input", () => {
    cfg.lua = ta.value;
    cfg.updated = Date.now();
    save();
    syncGutter();
  });
  page.querySelector("#reset").onclick = () => {
    cfg.lua = DEFAULT_LUA;
    save();
    toast("Config reset");
    render();
  };
  page.querySelector("#exec").onclick = () => {
    toast("Queued locally · " + cfg.name);
  };
  const list = page.querySelector("#cfg-list");
  state.configs.forEach((c) => {
    const row = el(`<button class="cfg ${c.id === cfg.id ? "active" : ""}"><span>${esc(c.name)}</span><small>${new Date(c.updated).toLocaleDateString()}</small></button>`);
    row.onclick = () => {
      state.activeConfig = c.id;
      state.user.configName = c.name;
      save();
      render();
    };
    list.appendChild(row);
  });
  page.querySelector("#cfg-add").onclick = () => {
    const name = page.querySelector("#cfg-name").value.trim() || "New config";
    const id = cryptoRandom(8);
    state.configs.push({ id, name, lua: DEFAULT_LUA, updated: Date.now() });
    state.activeConfig = id;
    state.user.configName = name;
    save();
    toast("Config created");
    render();
  };
  return page;
}

function renderBroadcast() {
  const u = state.user;
  const people = [{ name: "everyone", preview: "chat with everyone" }, ...seedPeople.map(([name, preview]) => ({ name, preview }))];
  const page = el(`<section class="broadcast"></section>`);
  const filtered = chatFilter === "everyone"
    ? state.messages
    : state.messages.filter((m) => m.user.toLowerCase() === chatFilter.toLowerCase());

  page.innerHTML = `
    <aside class="chat-rail">
      <h4>Broadcast</h4>
      <div class="sub">Chat with everyone</div>
      <div class="people" id="people"></div>
    </aside>
    <div class="chat-main">
      <div class="chat-top">
        <div class="title">Broadcast</div>
        <div class="head-btns">
          <button class="btn tiny" id="bc-reset">Reset</button>
          <button class="btn tiny" id="bc-exec">Execute</button>
        </div>
      </div>
      <article class="card pad-lg welcome">
        <div class="avatar" id="bc-av"></div>
        <div class="meta">
          <div class="kicker">Welcome back</div>
          <h2>${esc(u.name)}</h2>
          <div class="badge">${esc(u.role)}</div>
        </div>
      </article>
      <article class="card" style="margin-top:12px">
        <div class="key-row">
          <div class="kicker">🔑 License key</div>
          <button class="btn tiny" data-copy="key">Copy</button>
        </div>
        <div class="key-box"><code>${esc(u.key)}</code></div>
        <p class="hint">Have to love / can copy to clipboard</p>
      </article>
      <div class="messages" id="msgs" style="margin-top:12px"></div>
      <form class="composer" id="composer">
        <input name="text" placeholder="Type a message" autocomplete="off" />
        <button class="btn white" type="submit">Send</button>
      </form>
    </div>
  `;
  paintAvatar(page.querySelector("#bc-av"), u.name);
  const peopleEl = page.querySelector("#people");
  people.forEach((p, i) => {
    const active = (p.name === "everyone" && chatFilter === "everyone") || p.name === chatFilter;
    const row = el(`<button class="person ${active ? "active" : ""}"><b>${esc(p.name)}</b><span>${i === 0 ? "LIVE" : fmtTime(Date.now())}</span><em>${esc(p.preview)}</em></button>`);
    row.onclick = () => {
      chatFilter = p.name === "everyone" ? "everyone" : p.name;
      render();
    };
    peopleEl.appendChild(row);
  });
  const msgs = page.querySelector("#msgs");
  filtered.slice(-40).forEach((m) => {
    msgs.appendChild(el(`<div class="msg"><div><span class="who">${esc(m.user)}</span><span class="when">${fmtTime(m.at)}</span></div><p>${esc(m.text)}</p></div>`));
  });
  msgs.scrollTop = msgs.scrollHeight;
  page.querySelector("[data-copy=key]").onclick = () => copy(u.key);
  page.querySelector("#bc-reset").onclick = () => {
    state.messages = defaultState().messages;
    save();
    toast("Chat reset");
    render();
  };
  page.querySelector("#bc-exec").onclick = () => toast("Nothing to execute in broadcast");
  page.querySelector("#composer").onsubmit = (e) => {
    e.preventDefault();
    const input = e.target.text;
    const text = input.value.trim();
    if (!text) return;
    state.messages.push({ user: state.user.name, text, at: Date.now() });
    save();
    input.value = "";
    render();
    const box = document.getElementById("msgs");
    if (box) box.scrollTop = box.scrollHeight;
  };
  return page;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (btn) {
    e.preventDefault();
    setRoute(btn.dataset.route);
  }
});

window.addEventListener("hashchange", () => {
  const next = location.hash.replace("#", "") || "home";
  if (next !== route) {
    route = pages()[next] ? next : "home";
    render();
  }
});

document.getElementById("notify-btn").onclick = () => toast("No new notifications");

route = location.hash.replace("#", "") || "home";
if (!pages()[route]) route = "home";
applyTheme();
render();

setInterval(() => {
  if (route !== "broadcast") return;
  if (Math.random() > 0.35) return;
  const [user, text] = seedPeople[Math.floor(Math.random() * seedPeople.length)];
  const last = state.messages[state.messages.length - 1];
  if (last && last.user === user && last.text === text) return;
  state.messages.push({ user, text, at: Date.now() });
  if (state.messages.length > 80) state.messages = state.messages.slice(-80);
  save();
  render();
}, 14000);
