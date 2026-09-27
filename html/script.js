const isBrowserPreview = typeof GetParentResourceName !== "function";
let vehicles = [];
let activeFilter = "all";

window.addEventListener("message", event => {
    const data = event.data;
    if (data.action === "VehicleList") {
        vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
        document.getElementById("garage-header").textContent = data.garageLabel || "Garage";
        render();
        displayUI();
    }
});

document.addEventListener("keydown", event => { if (event.key === "Escape") closeGarageMenu(); });
document.getElementById("close-btn").addEventListener("click", closeGarageMenu);

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        render();
    });
});
document.getElementById("search").addEventListener("input", render);

function postNui(endpoint, payload) {
    if (isBrowserPreview) return Promise.resolve("ok");
    return fetch(`https://qb-garages/${endpoint}`, {
        method:"POST",
        headers:{"Content-Type":"application/json; charset=UTF-8"},
        body:JSON.stringify(payload)
    }).then(response => response.json());
}
function closeGarageMenu() {
    document.getElementById("garage-shell").style.display = "none";
    postNui("closeGarage", {}).catch(() => {});
}
function displayUI() { document.getElementById("garage-shell").style.display = "flex"; }

function getStatus(v) {
    if (v.state === 2) return {text:"Impound", className:"impound", disabled:true};
    if (v.state === 0) return {text:"Out", className:"out", disabled:false};
    if (v.depotPrice > 0 && v.type === "public") return {text:"Depot", className:"out", disabled:true};
    if (v.depotPrice > 0 && v.type === "depot") return {text:"$" + Number(v.depotPrice).toFixed(0), className:"stored", disabled:false};
    return {text:"Take Out", className:"stored", disabled:false};
}
function clamp(value,max) {
    const n = Number(value) || 0;
    return Math.max(0,Math.min(100,(n/max)*100));
}
function metric(label,value,max) {
    const percent = Math.round(clamp(value,max));
    const tone = percent < 35 ? "danger" : percent < 65 ? "warn" : "";
    return `<div class="metric"><div class="metric-head"><span>${label}</span><strong>${percent}%</strong></div><div class="bar ${tone}"><span style="width:${percent}%"></span></div></div>`;
}
function carSvg() {
    return `<svg viewBox="0 0 180 70" aria-hidden="true"><path d="M23 45l8-20c2-5 6-8 12-9l30-5c5-1 11-1 16 1l28 10c5 2 9 6 11 11l5 12H23zm16-21-6 14h35V20l-21 4c-4 0-7 0-8 0zm35-5v19h36l-8-12c-1-2-4-4-7-5l-17-5c-1 0-2 0-4 0zM43 57a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm78 0a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/></svg>`;
}
function createVehicleCard(v) {
    const status = getStatus(v);
    const balance = Number(v.balance) || 0;
    const card = document.createElement("article");
    card.className = "vehicle-card";
    card.innerHTML = `
        <div class="vehicle-top"><div class="vehicle-title"><h3>${escapeHtml(v.vehicleLabel || v.vehicle || "Unknown Vehicle")}</h3><span class="plate">${escapeHtml(v.plate || "NO PLATE")}</span></div><span class="status ${status.className}">${status.text}</span></div>
        <div class="vehicle-art">${carSvg()}</div>
        <div class="metrics">${metric("Fuel",v.fuel,100)}${metric("Engine",v.engine,1000)}${metric("Body",v.body,1000)}</div>
        <div class="card-bottom"><div class="finance">${balance > 0 ? "Finance: <strong>$" + balance.toFixed(0) + "</strong>" : "Finance: <strong>Paid off</strong>"}</div><button class="drive-btn" ${status.disabled ? "disabled" : ""}>${status.text}</button></div>`;
    card.querySelector(".drive-btn").addEventListener("click", () => takeAction(v,status));
    return card;
}
function takeAction(v,status) {
    if (status.disabled) return;
    const vehicleData = {vehicle:v.vehicle,garage:v.garage,index:v.index,plate:v.plate,type:v.type,depotPrice:v.depotPrice,stats:{fuel:v.fuel,engine:v.engine,body:v.body}};
    if (status.text === "Out") {
        postNui("trackVehicle",v.plate).then(data => { if(data === "ok") closeGarageMenu(); });
    } else if (v.depotPrice > 0) {
        postNui("takeOutDepo",vehicleData).then(data => { if(data === "ok") closeGarageMenu(); });
    } else {
        postNui("takeOutVehicle",vehicleData).then(data => { if(data === "ok") closeGarageMenu(); });
    }
}
function render() {
    const query = document.getElementById("search").value.trim().toLowerCase();
    const container = document.getElementById("vehicle-container");
    const empty = document.getElementById("empty");
    const stored = vehicles.filter(v => v.state === 1);
    const out = vehicles.filter(v => v.state === 0);
    document.getElementById("vehicle-count").textContent = vehicles.length;
    document.getElementById("stored-count").textContent = stored.length;
    document.getElementById("all-count").textContent = vehicles.length;
    document.getElementById("stored-filter-count").textContent = stored.length;
    document.getElementById("out-count").textContent = out.length;
    const filtered = vehicles.filter(v => {
        const matchesFilter = activeFilter === "all" || (activeFilter === "stored" && v.state === 1) || (activeFilter === "out" && v.state === 0);
        const text = ((v.vehicleLabel || "") + " " + (v.vehicle || "") + " " + (v.plate || "")).toLowerCase();
        return matchesFilter && text.includes(query);
    });
    container.replaceChildren(...filtered.map(createVehicleCard));
    empty.style.display = filtered.length ? "none" : "flex";
}
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g,char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

if (isBrowserPreview) {
    document.body.classList.add("browser-preview");
    vehicles = [
        {vehicle:"sultan",vehicleLabel:"Karin Sultan RS",plate:"SIFO 01",state:1,fuel:92,engine:910,body:760,garage:"Legion Square",type:"public",index:"legion",depotPrice:0,balance:0},
        {vehicle:"buffalo",vehicleLabel:"Bravado Buffalo",plate:"SIFO 22",state:1,fuel:74,engine:840,body:930,garage:"Legion Square",type:"public",index:"legion",depotPrice:0,balance:1250},
        {vehicle:"zentorno",vehicleLabel:"Pegassi Zentorno",plate:"SIFO 77",state:0,fuel:38,engine:620,body:480,garage:"Legion Square",type:"public",index:"legion",depotPrice:500,balance:0},
        {vehicle:"baller",vehicleLabel:"Gallivanter Baller",plate:"SIFO 09",state:1,fuel:58,engine:420,body:640,garage:"Legion Square",type:"public",index:"legion",depotPrice:0,balance:0}
    ];
    document.getElementById("garage-header").textContent = "Legion Square";
    render();
    displayUI();
}