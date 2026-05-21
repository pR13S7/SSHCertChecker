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

    const data = await res.json();
    renderResult(data);
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
    `<div class="info-row flex justify-between gap-3 py-1.5">
      <span class="text-[11px] text-slate-500 shrink-0">${label}</span>
      <span class="text-[11px] text-slate-300 font-mono text-right break-all" title="${value}">${value}</span>
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
    ["Common Name", data.subject.commonName || "N/A"],
    ["Organization", data.subject.organizationName || "N/A"],
    ["Country", data.subject.countryName || "N/A"],
    ["Valid From", formatDate(data.not_before)],
    ["Valid Until", formatDate(data.not_after)],
  ]);

  document.getElementById("col-issuer").innerHTML = renderRows([
    ["Issuer", data.issuer.commonName || data.issuer.organizationName || "N/A"],
    ["Issuer Org", data.issuer.organizationName || "N/A"],
    ["Serial Number", data.serial_number],
    ["Version", data.version],
    ["Self-Signed", data.is_self_signed ? "Yes" : "No"],
  ]);

  document.getElementById("col-crypto").innerHTML = renderRows([
    ["Signature Algorithm", data.signature_algorithm],
    ["Public Key", formatKey(data.public_key)],
    ["SHA-256", data.fingerprints.sha256],
    ["SHA-1", data.fingerprints.sha1],
  ]);

  const sanExt = data.extensions.find(e => e.san);
  const sanSection = document.getElementById("san-section");
  const bottomGrid = document.getElementById("bottom-grid");
  const extensionsSection = document.getElementById("extensions-section");

  if (sanExt && sanExt.san.length > 0) {
    sanSection.classList.remove("hidden");
    extensionsSection.classList.remove("col-span-2");
    bottomGrid.className = "grid grid-cols-2 gap-4 mt-4 shrink-0";
    document.getElementById("san-list").innerHTML = sanExt.san.map(name =>
      `<span class="text-[11px] font-mono text-slate-300">${name}</span>`
    ).join("");
  } else {
    sanSection.classList.add("hidden");
    extensionsSection.classList.add("col-span-2");
    bottomGrid.className = "grid grid-cols-1 gap-4 mt-4 shrink-0";
  }

  document.getElementById("extensions-list").innerHTML = data.extensions.map(ext =>
    `<div class="flex justify-between gap-2 py-0.5">
      <span class="text-[11px] text-slate-400 truncate">${ext.name}</span>
      <span class="text-[11px] shrink-0 ${ext.critical ? 'text-yellow-400' : 'text-slate-600'}">${ext.critical ? 'Critical' : 'Non-critical'}</span>
    </div>`
  ).join("");
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatKey(key) {
  if (key.bits) return `${key.type} ${key.bits}-bit${key.curve ? ' (' + key.curve + ')' : ''}`;
  return key.type;
}

function reset() {
  document.getElementById("input-section").classList.remove("hidden");
  document.getElementById("result-section").classList.add("hidden");
  document.getElementById("header").classList.remove("mb-2");
  document.getElementById("san-section").classList.add("hidden");
  document.getElementById("extensions-section").classList.remove("col-span-2");
  document.getElementById("pem-input").value = "";
  document.getElementById("error-msg").classList.add("hidden");
}
