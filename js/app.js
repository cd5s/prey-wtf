const STORE = "prey.wtf.v3";

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
  ["gg", "a"],
  ["n0hv", "yoooo"],
  ["ben", "chat im him"],
  ["justatest", "tuff"],
  ["Jah", "son"],
  ["lifepelaez1", "uh"],
  ["born", "hi guys"],
  ["born", "how we doing"],
  ["born", "💀"],
  ["nes", "hi"],
  ["justatest", ":?"],
  ["gorehill", "hello"],
  ["xx", "yo"],
  ["Oqjd", "yo"],
  ["Oqjd", "neegy"],
  ["Punchzxz", "yooo"],
  ["canonninja", "hi"],
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
  messages: seedPeople.map(([user, text], i) => ({
    user,
    text,
    at: hoursAgo(seedPeople.length - i),
  })),
  session: { used: true, started: Date.now() - 3600_000 },
  passwordSet: false,
  armor: {
    webhook: "",
    botName: "Prey.Wtf Bot",
    preset: "heavy",
    options: { ...LuauArmor.PRESETS.heavy },
    input: `-- Paste Luau here
local msg = "Protected by Prey.Wtf"
print(msg)
`,
    output: "",
    queue: [],
    botOnline: true,
  },
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
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      user: { ...base.user, ...(parsed.user || {}) },
      theme: { ...base.theme, ...(parsed.theme || {}) },
      armor: { ...base.armor, ...(parsed.armor || {}), options: { ...base.armor.options, ...(parsed.armor?.options || {}) } },
      discord: parsed.user?.discord ? undefined : base.user.discord,
    };
  } catch {
    return defaultState();
  }
}

function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

let state = load();
let route = "home";

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
    armor: renderArmor,
  };
}

function render() {
  applyTheme();
  document.getElementById("user-chip").classList.toggle("hidden", route === "broadcast" || route === "configs" || route === "armor");
  document.getElementById("discord-fab").classList.toggle("hidden", route === "configs" || route === "armor");
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
  page.querySelector("#get-script").onclick = () => setRoute("armor");
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

function renderArmor() {
  const a = state.armor;
  const page = el(`<section class="page armor-page"></section>`);
  page.innerHTML = `
    <div class="armor-layout">
      <article class="armor-panel">
        <div class="armor-head">
          <strong>LuauArmor</strong>
          <div class="armor-tabs" id="presets"></div>
          <div class="head-btns">
            <button class="btn tiny" id="armor-load-config">Load config</button>
            <button class="btn tiny" id="armor-clear">Clear</button>
          </div>
        </div>
        <div class="armor-editors">
          <div class="armor-editor">
            <label>Input · Luau source</label>
            <textarea id="armor-in" spellcheck="false"></textarea>
          </div>
          <div class="armor-editor">
            <label>Output · Obfuscated</label>
            <textarea id="armor-out" readonly spellcheck="false"></textarea>
          </div>
        </div>
        <div class="armor-stats" id="armor-stats"></div>
        <div class="armor-actions">
          <button class="btn white" id="armor-run">Obfuscate</button>
          <button class="btn" id="armor-copy">Copy output</button>
          <button class="btn" id="armor-download">Download .lua</button>
          <button class="btn white" id="armor-bot">Send to bot</button>
        </div>
      </article>
      <aside class="armor-side">
        <div class="armor-side-head">
          <div>
            <h3>Bot & passes</h3>
            <p><span class="status-dot ${a.botOnline ? "live" : ""}"></span> ${a.botOnline ? "Connected (local)" : "Offline"}</p>
          </div>
        </div>
        <div class="field"><label>Discord webhook</label><input id="armor-webhook" placeholder="https://discord.com/api/webhooks/..." value="${esc(a.webhook)}" /></div>
        <div class="field"><label>Bot name</label><input id="armor-botname" value="${esc(a.botName)}" /></div>
        <div class="armor-options" id="armor-options"></div>
        <div class="kicker" style="padding:0 12px 8px">Queue</div>
        <div class="queue-list" id="armor-queue"></div>
      </aside>
    </div>
  `;

  const presets = ["light", "medium", "heavy", "maximum"];
  const presetBox = page.querySelector("#presets");
  presets.forEach((p) => {
    const btn = el(`<button class="${a.preset === p ? "active" : ""}">${p}</button>`);
    btn.onclick = () => {
      a.preset = p;
      a.options = { ...LuauArmor.PRESETS[p], preset: p };
      save();
      render();
    };
    presetBox.appendChild(btn);
  });

  const optKeys = [
    ["strings", "Encrypt strings"],
    ["rename", "Rename identifiers"],
    ["numbers", "Obfuscate numbers"],
    ["junk", "Insert junk code"],
    ["flow", "Control-flow wrap"],
    ["minify", "Minify"],
    ["wrap", "Loadstring wrapper"],
  ];
  const optBox = page.querySelector("#armor-options");
  optKeys.forEach(([key, label]) => {
    const row = el(`<label class="opt"><span>${label}</span><input type="checkbox" data-opt="${key}" ${a.options[key] ? "checked" : ""} /></label>`);
    row.querySelector("input").onchange = (e) => {
      a.options[key] = e.target.checked;
      save();
    };
    optBox.appendChild(row);
  });

  const input = page.querySelector("#armor-in");
  const output = page.querySelector("#armor-out");
  input.value = a.input || "";
  output.value = a.output || "";

  input.oninput = () => {
    a.input = input.value;
    save();
  };

  page.querySelector("#armor-webhook").oninput = (e) => {
    a.webhook = e.target.value;
    save();
  };
  page.querySelector("#armor-botname").oninput = (e) => {
    a.botName = e.target.value;
    save();
  };

  const statsBox = page.querySelector("#armor-stats");
  if (a.lastStats) {
    statsBox.innerHTML = `
      <div class="stat"><span>Input</span><strong>${a.lastStats.inputBytes}b</strong></div>
      <div class="stat"><span>Output</span><strong>${a.lastStats.outputBytes}b</strong></div>
      <div class="stat"><span>Strings</span><strong>${a.lastStats.stringsHidden}</strong></div>
      <div class="stat"><span>Preset</span><strong>${esc(a.lastStats.preset)}</strong></div>
    `;
  }

  const queueBox = page.querySelector("#armor-queue");
  (a.queue.length ? a.queue : [{ status: "idle", text: "No jobs yet — obfuscate to queue" }]).slice(0, 12).forEach((job) => {
    const cls = job.status === "done" ? "ok" : job.status === "failed" ? "fail" : job.status === "running" ? "pending" : "";
    queueBox.appendChild(el(`<div class="queue-item"><span class="${cls}">${esc(job.status || "idle")}</span> · ${esc(job.text || "")}</div>`));
  });

  function obfuscateInput() {
    const opts = { ...a.options, preset: a.preset, junkCount: LuauArmor.PRESETS[a.preset]?.junkCount ?? 8 };
    const result = LuauArmor.obfuscate(input.value, opts);
    a.output = result.output;
    a.lastStats = result.stats;
    output.value = result.output;
    a.queue.unshift({ status: "done", text: `${result.stats.inputBytes}→${result.stats.outputBytes}b · ${a.preset}`, at: Date.now() });
    a.queue = a.queue.slice(0, 20);
    save();
    return result;
  }

  page.querySelector("#armor-run").onclick = () => {
    try {
      obfuscateInput();
      toast("Obfuscated");
      render();
    } catch (err) {
      toast(err.message || "Obfuscation failed");
    }
  };
  page.querySelector("#armor-copy").onclick = () => copy(a.output || output.value, "Obfuscated script copied");
  page.querySelector("#armor-download").onclick = () => {
    if (!a.output) return toast("Obfuscate first");
    const blob = new Blob([a.output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "protected.lua";
    link.click();
    URL.revokeObjectURL(url);
    toast("Downloaded protected.lua");
  };
  page.querySelector("#armor-clear").onclick = () => {
    a.input = "";
    a.output = "";
    save();
    render();
  };
  page.querySelector("#armor-load-config").onclick = () => {
    a.input = currentConfig().lua;
    save();
    toast("Loaded active cloud config");
    render();
  };
  page.querySelector("#armor-bot").onclick = async () => {
    try {
      if (!a.output) obfuscateInput();
    } catch (err) {
      return toast(err.message || "Obfuscation failed");
    }
    const job = { status: "running", text: "Posting to Discord bot…", at: Date.now() };
    a.queue.unshift(job);
    save();
    render();
    try {
      await LuauArmor.sendToBot(a.webhook, {
        botName: a.botName,
        user: state.user.name,
        preset: a.preset,
        inputBytes: a.lastStats?.inputBytes || a.input.length,
        outputBytes: a.output.length,
        preview: a.output,
      });
      job.status = "done";
      job.text = "Sent to Discord webhook";
      toast("Bot received obfuscated script");
    } catch (err) {
      job.status = "failed";
      job.text = err.message || "Bot send failed";
      toast(job.text);
    }
    save();
    render();
  };

  return page;
}

function messageRow(m) {
  return el(`<div class="feed-row"><b>${esc(m.user)}</b><time>${fmtTime(m.at)}</time><span>${esc(m.text)}</span></div>`);
}

function renderBroadcast() {
  const page = el(`<section class="page broadcast-page"></section>`);
  page.innerHTML = `
    <div class="broadcast-head">
      <div class="title">Broadcast</div>
      <div class="subtitle">Chat with everyone</div>
    </div>
    <article class="broadcast-board">
      <div class="feed-list" id="msgs"></div>
      <form class="composer" id="composer">
        <input name="text" placeholder="Type a message..." autocomplete="off" />
        <button class="btn white" type="submit">Send</button>
      </form>
    </article>
  `;
  const msgs = page.querySelector("#msgs");
  state.messages.slice(-40).forEach((m) => msgs.appendChild(messageRow(m)));
  msgs.scrollTop = msgs.scrollHeight;
  page.querySelector("#composer").onsubmit = (e) => {
    e.preventDefault();
    const input = e.target.text;
    const text = input.value.trim();
    if (!text) return;
    const msg = { user: state.user.name, text, at: Date.now() };
    state.messages.push(msg);
    save();
    input.value = "";
    msgs.appendChild(messageRow(msg));
    msgs.scrollTop = msgs.scrollHeight;
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
document.getElementById("history-btn").onclick = () => setRoute("broadcast");

route = location.hash.replace("#", "") || "home";
if (!pages()[route]) route = "home";
applyTheme();
render();

setInterval(() => {
  if (route !== "broadcast") return;
  if (Math.random() > 0.4) return;
  const [user, text] = seedPeople[Math.floor(Math.random() * seedPeople.length)];
  const last = state.messages[state.messages.length - 1];
  if (last && last.user === user && last.text === text) return;
  const msg = { user, text, at: Date.now() };
  state.messages.push(msg);
  if (state.messages.length > 80) state.messages = state.messages.slice(-80);
  save();
  const box = document.getElementById("msgs");
  if (!box) return;
  box.appendChild(messageRow(msg));
  box.scrollTop = box.scrollHeight;
}, 14000);
