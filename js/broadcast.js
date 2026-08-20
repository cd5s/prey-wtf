/* Shared broadcast hub — webhook relay + sync URL polling */
window.BroadcastHub = (function () {
  const BOT_USERS = [
    "gg", "n0hv", "ben", "justatest", "Jah", "lifepelaez1", "born", "nes",
    "gorehill", "xx", "Oqjd", "Punchzxz", "canonninja", "richv", "gig", "stiky",
    "jottatod", "lilgoldent", "genbuu8", "Punishere", "nas", "xk", "Osgid",
  ];
  const BOT_MSGS = [
    "yoooo", "chat im him", "tuff", "wsg", "hi guys", "how we doing", "hello",
    "yo", "lmao", "nah", "fr", "ts is tuff", "who online", "gg", "a", "son", "uh",
  ];

  let pollTimer = null;

  async function postMessage(webhook, user, text) {
    if (!webhook) return;
    await fetch(webhook.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Prey Broadcast",
        embeds: [{ title: "Broadcast", description: `**${user}**: ${text}`, color: 0x5865f2, timestamp: new Date().toISOString() }],
      }),
    }).catch(() => {});
  }

  async function pullSync(syncUrl) {
    if (!syncUrl) return null;
    try {
      const res = await fetch(syncUrl + (syncUrl.includes("?") ? "&" : "?") + "t=" + Date.now());
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : data.messages || null;
    } catch {
      return null;
    }
  }

  function mergeMessages(current, incoming) {
    const map = new Map();
    [...current, ...(incoming || [])].forEach((m) => {
      const k = `${m.user}|${m.text}|${m.at}`;
      map.set(k, m);
    });
    return [...map.values()].sort((a, b) => a.at - b.at).slice(-120);
  }

  function randomBotMessage() {
    return {
      user: BOT_USERS[(Math.random() * BOT_USERS.length) | 0],
      text: BOT_MSGS[(Math.random() * BOT_MSGS.length) | 0],
      at: Date.now(),
    };
  }

  function startPolling(state, onUpdate) {
    stopPolling();
    pollTimer = setInterval(async () => {
      const remote = await pullSync(state.broadcast?.syncUrl);
      if (remote?.length) {
        state.messages = mergeMessages(state.messages, remote);
        onUpdate?.();
      } else if (Math.random() > 0.55) {
        state.messages.push(randomBotMessage());
        if (state.messages.length > 120) state.messages = state.messages.slice(-120);
        onUpdate?.();
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  return { postMessage, pullSync, mergeMessages, randomBotMessage, startPolling, stopPolling, BOT_USERS };
})();
