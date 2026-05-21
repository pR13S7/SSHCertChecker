function esc(str) {
  return String(str ?? "N/A")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function parseCert() {
  const pem = document.getElementById("pem-input").value.trim();
  const errorMsg = document.getElementById("error-msg");
  errorMsg.classList.add("hidden");

  if (!pem) {
    showError("Please paste a PEM-encoded certificate");
    return;
  }

  const btn = document.getElementById("parse-btn");
  btn.disabled = true;
  btn.textContent = "Parsing...";

  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pem }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to parse certificate");
    }

    renderResult(await res.json());
  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Parse Certificate";
  }
}

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function renderRows(rows) {
  return rows.map(([label, value]) =>
    `<div class="info-row">
      <span class="info-label">${esc(label)}</span>
      <span class="info-value" title="${esc(value)}">${esc(value)}</span>
    </div>`
  ).join("");
}

function renderResult(data) {
  document.getElementById("input-section").classList.add("hidden");
  document.getElementById("header").classList.add("mb-2");
  document.getElementById("result-section").classList.remove("hidden");

  const badge = document.getElementById("status-badge");
  if (data.is_expired) {
    badge.textContent = "Expired";
    badge.className = "badge-expired px-2.5 py-0.5 rounded-full text-xs font-medium";
  } else if (data.days_remaining < 30) {
    badge.textContent = `Expires in ${data.days_remaining} days`;
    badge.className = "badge-warning px-2.5 py-0.5 rounded-full text-xs font-medium";
  } else {
    badge.textContent = `Valid (${data.days_remaining} days)`;
    badge.className = "badge-ok px-2.5 py-0.5 rounded-full text-xs font-medium";
  }

  document.getElementById("col-subject").innerHTML = renderRows([
    ["Common Name", data.subject?.commonName],
    ["Organization", data.subject?.organizationName],
    ["Country", data.subject?.countryName],
    ["Valid From", formatDate(data.not_before)],
    ["Valid Until", formatDate(data.not_after)],
  ]);

  document.getElementById("col-issuer").innerHTML = renderRows([
    ["Issuer", data.issuer?.commonName || data.issuer?.organizationName],
    ["Issuer Org", data.issuer?.organizationName],
    ["Serial Number", data.serial_number],
    ["Version", data.version],
    ["Self-Signed", data.is_self_signed ? "Yes" : "No"],
  ]);

  document.getElementById("col-crypto").innerHTML = renderRows([
    ["Signature Algorithm", data.signature_algorithm],
    ["Public Key", formatKey(data.public_key)],
    ["SHA-256", data.fingerprints?.sha256],
    ["SHA-1", data.fingerprints?.sha1],
  ]);

  const sanExt = (data.extensions || []).find(e => e.san);
  const sanSection = document.getElementById("san-section");
  const bottomGrid = document.getElementById("bottom-grid");

  if (sanExt?.san?.length > 0) {
    sanSection.classList.remove("hidden");
    bottomGrid.classList.remove("single");
    document.getElementById("san-list").innerHTML = sanExt.san.map(name =>
      `<span class="san-tag">${esc(name)}</span>`
    ).join("");
  } else {
    sanSection.classList.add("hidden");
    bottomGrid.classList.add("single");
  }

  document.getElementById("extensions-list").innerHTML = (data.extensions || []).map(ext =>
    `<div class="ext-row">
      <span class="ext-name">${esc(ext.name)}</span>
      <span class="ext-flag${ext.critical ? " critical" : ""}">${ext.critical ? "Critical" : "Non-critical"}</span>
    </div>`
  ).join("");
}

function formatDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return isNaN(d) ? "N/A" : d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatKey(key) {
  if (!key) return "N/A";
  if (key.bits) return `${key.type} ${key.bits}-bit${key.curve ? " (" + key.curve + ")" : ""}`;
  return key.type || "N/A";
}

function reset() {
  document.getElementById("input-section").classList.remove("hidden");
  document.getElementById("result-section").classList.add("hidden");
  document.getElementById("header").classList.remove("mb-2");
  document.getElementById("san-section").classList.add("hidden");
  document.getElementById("bottom-grid").classList.remove("single");
  document.getElementById("pem-input").value = "";
  document.getElementById("error-msg").classList.add("hidden");
}
