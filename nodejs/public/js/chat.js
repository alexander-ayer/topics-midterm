(() => {
  const logEl = document.getElementById("chatLog");
  const inputEl = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");

  function formatTime(sqliteTs) {
    // "YYYY-MM-DD HH:MM:SS" -> Date
    const d = new Date(sqliteTs.replace(" ", "T") + "Z");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderMessage(m) {
    const color = m.user.profileColor || "rgba(107,74,46,0.75)";
    const name = m.user.displayName || "Unknown";
    const time = formatTime(m.createdAt);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.padding = "8px 6px";
    row.style.borderBottom = "1px solid rgba(107,74,46,0.10)";

    const badge = document.createElement("div");
    badge.style.flex = "0 0 36px";
    badge.style.width = "36px";
    badge.style.height = "36px";
    badge.style.borderRadius = "999px";
    badge.style.border = "2px solid rgba(107,74,46,0.20)";
    badge.style.background = "#fffaf0";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.fontWeight = "800";
    badge.style.color = color;
    badge.textContent = (name[0] || "?").toUpperCase();

    const body = document.createElement("div");
    body.style.flex = "1";

    const meta = document.createElement("div");
    meta.style.display = "flex";
    meta.style.gap = "10px";
    meta.style.alignItems = "baseline";

    const who = document.createElement("div");
    who.style.fontWeight = "800";
    who.style.color = color;
    who.textContent = name;

    const ts = document.createElement("div");
    ts.style.fontSize = "0.85rem";
    ts.style.opacity = "0.7";
    ts.textContent = time;

    const text = document.createElement("div");
    text.style.marginTop = "2px";
    text.textContent = m.content;

    const socket = io({ transports: ["websocket", "polling"] });

    socket.on("chat:new", ({ message }) => {
      if (message) renderMessage(message);
    });

    meta.appendChild(who);
    meta.appendChild(ts);
    body.appendChild(meta);
    body.appendChild(text);

    row.appendChild(badge);
    row.appendChild(body);

    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function loadHistory() {
    const res = await fetch("/api/chat/history?limit=50", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return;

    const data = await res.json();
    (data.messages || []).forEach(renderMessage);
  }

  async function sendMessage() {
  const content = (inputEl.value || "").trim();
  if (!content) return;

  inputEl.value = "";

  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    inputEl.value = content;
    return;
  }
}


  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  loadHistory();
})();
