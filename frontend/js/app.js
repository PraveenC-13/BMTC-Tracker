const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:8080"
  : ""; //voi paste railway link here

let dir = 1;
let stops = [];
let bO = 0;
let dO = 0;
let busO = 0;
let sharing = false;
let watchId = null;
let pollTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("t1").addEventListener("click", () => switchDir(1));
  document.getElementById("t2").addEventListener("click", () => switchDir(2));
  document.getElementById("sel-b").addEventListener("change", chgB);
  document.getElementById("sel-d").addEventListener("change", chgD);
  document.getElementById("eta-btn").addEventListener("click", getETA);
  document.getElementById("gps-btn").addEventListener("click", toggleGPS);

  switchDir(1);
});

function switchDir(d) {
  dir = d;
  document.getElementById("t1").className = "dir-toggle" + (d === 1 ? " active" : "");
  document.getElementById("t2").className = "dir-toggle" + (d === 2 ? " active" : "");
  bO = 0;
  dO = 0;
  busO = 0;
  hideETA();
  loadStops();
}

async function loadStops() {
  try {
    const r = await fetch(`${API}/stops?direction_id=${dir}`);
    if (!r.ok) throw new Error("Status " + r.status);
    stops = await r.json();
    document.getElementById("total-stops").innerHTML = `${stops.length} <small>stops</small>`;
    fillSel();
    renderRoute();
  } catch (e) {
    document.getElementById("rlist").innerHTML =
      `<div style="padding: 24px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">
        Station sequence unavailable. Verify Go service is active on :8080.
      </div>`;
  }
}

function fillSel() {
  const b = document.getElementById("sel-b");
  const d = document.getElementById("sel-d");
  b.innerHTML = '<option value="">Where are you boarding?</option>';
  d.innerHTML = '<option value="">Where are you heading?</option>';
  stops.forEach(s => {
    const o = `<option value="${s.StopOrder}">${s.StopOrder}. ${s.StopName}</option>`;
    b.innerHTML += o;
    d.innerHTML += o;
  });
}

function chgB() {
  bO = parseInt(document.getElementById("sel-b").value) || 0;
  renderRoute();
}

function chgD() {
  dO = parseInt(document.getElementById("sel-d").value) || 0;
  renderRoute();
}

async function getETA() {
  if (!bO || !dO) {
    alert("Please select both boarding and destination stations.");
    return;
  }
  if (bO >= dO) {
    alert("Destination stop must be ahead of your boarding point.");
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation is unsupported on this platform.");
    return;
  }

  const etaBtn = document.getElementById("eta-btn");
  etaBtn.innerHTML = `<span>Locating Bus...</span>`;
  etaBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      await sendPing(pos);
      await pollETA();

      etaBtn.innerHTML = `<span>Check Live Arrival</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      etaBtn.disabled = false;

      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(pollETA, 15000);
    },
    (err) => {
      etaBtn.innerHTML = `<span>Check Live Arrival</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
      etaBtn.disabled = false;
      alert("Location permission is needed to calculate live arrival.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

async function pollETA() {
  try {
    const r = await fetch(`${API}/eta?direction_id=${dir}`);
    if (!r.ok) {
      showNoData();
      return;
    }
    const data = await r.json();
    renderETA(data);
  } catch (e) {
    showNoData();
  }
}

function renderETA(data) {
  const cur = stops.find(s => s.StopName === data.current_stop);
  busO = cur ? cur.StopOrder : 0;
  const sps = data.next_stop_eta_sec || 180;
  const toB = Math.max(bO - busO, 0) * sps;
  const toD = Math.max(dO - busO, 0) * sps;

  document.getElementById("bus-at").textContent = data.current_stop;
  document.getElementById("lbl-b").textContent = stops.find(s => s.StopOrder === bO)?.StopName || "";
  document.getElementById("lbl-d").textContent = stops.find(s => s.StopOrder === dO)?.StopName || "";
  
  const minToB = toB <= 0 ? "NOW" : Math.ceil(toB / 60);
  const minToD = toD <= 0 ? "ARRIVED" : Math.ceil(toD / 60) + " min";
  
  document.getElementById("eta-b").textContent = minToB;
  document.getElementById("eta-d").textContent = minToD;

  document.getElementById("eta-card").className = "glass-surface eta-console show";
  document.getElementById("nodata").className = "glass-surface standby-message";
  renderRoute();
}

function hideETA() {
  document.getElementById("eta-card").className = "glass-surface eta-console";
  document.getElementById("nodata").className = "glass-surface standby-message";
}

function showNoData() {
  document.getElementById("eta-card").className = "glass-surface eta-console";
  document.getElementById("nodata").className = "glass-surface standby-message show";
}

function renderRoute() {
  if (!stops.length) return;
  let html = "";
  stops.forEach((s, i) => {
    const o = s.StopOrder;
    const last = i === stops.length - 1;
    let dc = "node-dot", nc = "node-name", lc = "node-connector", tag = "";

    if (busO > 0 && o < busO) {
      dc += " past";
      lc += " past";
    } else if (o === busO) {
      dc += " cur";
      nc += " cur";
      tag = '<span class="node-tag bus">Bus Here</span>';
      lc += " highlight";
    }

    if (o === bO && o !== busO) {
      dc = "node-dot board";
      nc = "node-name board";
      tag = '<span class="node-tag you">Pickup</span>';
    }
    if (o === bO && o === busO) {
      tag = '<span class="node-tag bus">Pickup + Bus</span>';
    }
    if (o === dO && o !== bO) {
      dc = "node-dot dest";
      nc = "node-name dest";
      tag = '<span class="node-tag dst">Drop-off</span>';
    }
    if (o === busO + 1 && busO > 0 && o !== bO && o !== dO) {
      tag = '<span class="node-tag nxt">Approaching</span>';
    }

    html += `<div class="node-row">
      <div class="node-spine">
        <div class="${dc}"></div>
        ${!last ? `<div class="${lc}"></div>` : ""}
      </div>
      <div class="node-data">
        <div class="${nc}">${s.StopName}</div>
        ${tag}
      </div>
    </div>`;
  });
  document.getElementById("rlist").innerHTML = html;
}

function toggleGPS() {
  sharing ? stopGPS() : startGPS();
}

function startGPS() {
  if (!navigator.geolocation) {
    alert("Geolocation unsupported.");
    return;
  }
  navigator.geolocation.getCurrentPosition(() => {
    sharing = true;
    const btn = document.getElementById("gps-btn");
    btn.classList.add("active");
    document.getElementById("gps-lbl").textContent = "Broadcasting Location (Live)";
    watchId = navigator.geolocation.watchPosition(sendPing, null, {
      enableHighAccuracy: true,
      maximumAge: 10000
    });
  }, () => alert("Location permission required to broadcast bus coordinates."));
}

function stopGPS() {
  sharing = false;
  if (watchId) navigator.geolocation.clearWatch(watchId);
  const btn = document.getElementById("gps-btn");
  btn.classList.remove("active");
  document.getElementById("gps-lbl").textContent = "Broadcast Bus Location";
}

async function sendPing(pos) {
  let id = sessionStorage.getItem("bmtc_id");
  if (!id) {
    id = "web-" + Math.random().toString(36).substr(2, 10);
    sessionStorage.setItem("bmtc_id", id);
  }
  try {
    await fetch(`${API}/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: id,
        direction_id: dir,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed_mps: pos.coords.speed || 0,
        heading: pos.coords.heading || 0,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn("Telemetry ping omitted", e);
  }
}