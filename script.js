const WMO = { 0: ["Bezchmurnie", "☀️"], 1: ["Prawie bezchmurnie", "🌤️"], 2: ["Częściowe zachmurzenie", "⛅"], 3: ["Zachmurzenie całkowite", "☁️"], 45: ["Mgła", "🌫️"], 48: ["Mgła szronna", "🌫️"], 51: ["Mżawka lekka", "🌦️"], 53: ["Mżawka", "🌦️"], 55: ["Mżawka gęsta", "🌧️"], 61: ["Deszcz lekki", "🌧️"], 63: ["Deszcz", "🌧️"], 65: ["Deszcz silny", "🌧️"], 71: ["Śnieg lekki", "🌨️"], 73: ["Śnieg", "❄️"], 75: ["Śnieg obfity", "❄️"], 80: ["Przelotny deszcz", "🌦️"], 81: ["Deszcz przelotny", "🌧️"], 82: ["Gwałtowny deszcz", "⛈️"], 95: ["Burza", "⛈️"], 96: ["Burza z gradem", "⛈️"], 99: ["Burza z silnym gradem", "⛈️"] };
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

let cities = JSON.parse(localStorage.getItem("cities") || "[]");
let activeCity = null;
let suggestTimer;

const api = async (url) => (await fetch(url)).json();

// --- INICJALIZACJA ---
(function init() {
    renderCityList();
    detectLocation();
    if (cities.length) selectCity(cities[0].name);

    const input = document.getElementById("cityInput");
    input.addEventListener("input", onCityInput);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") document.querySelector(".suggestion-item")?.click();
    });
})();

async function detectLocation() {
    navigator.geolocation?.getCurrentPosition(async ({ coords: { latitude: lat, longitude: lon } }) => {
        const data = await api(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const name = data.address.city || data.address.town || "Twoja lokalizacja";
        if (!cities.some(c => c.name === name)) {
            cities = [{ name, lat, lon, isAuto: true }, ...cities.filter(c => !c.isAuto)];
            saveAndRender();
            if (!activeCity) selectCity(name);
        }
    });
}

// --- POBIERANIE DANYCH ---
async function fetchWeather(lat, lon) {
    return api(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
}

// --- OBSŁUGA WYSZUKIWARKI ---
async function onCityInput(e) {
    clearTimeout(suggestTimer);
    const val = e.target.value.trim();
    const box = document.getElementById("suggestions");
    if (val.length < 2) return box.innerHTML = "";

    suggestTimer = setTimeout(async () => {
        const { results } = await api(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=pl&format=json`);
        box.innerHTML = (results || []).map(r => `
            <div class="suggestion-item" onclick="addCityFromSearch('${r.name}', ${r.latitude}, ${r.longitude})">
                ${r.name}${r.country ? ", " + r.country : ""}
            </div>
        `).join('');
    }, 300);
}

function addCityFromSearch(name, lat, lon) {
    if (!cities.some(c => c.name === name)) cities.push({ name, lat, lon });
    document.getElementById("cityInput").value = "";
    document.getElementById("suggestions").innerHTML = "";
    saveAndRender();
    selectCity(name);
}

// --- LOGIKA MIAST ---
async function selectCity(name) {
    activeCity = name;
    renderCityList();
    const city = cities.find(c => c.name === name);
    if (city) {
        const w = await fetchWeather(city.lat, city.lon);
        if (w) renderMain(name, w);
    }
}

function removeCity(name) {
    cities = cities.filter(c => c.name !== name);
    activeCity = (activeCity === name) ? (cities[0]?.name || null) : activeCity;
    saveAndRender();
    activeCity ? selectCity(activeCity) : clearMain();
}

// --- RENDERING ---
function renderCityList() {
    const list = document.getElementById("cityList");
    list.innerHTML = cities.map(city => `
        <div class="city-item ${city.name === activeCity ? 'active' : ''}" onclick="selectCity('${city.name}')">
            <div class="city-left">
                <div class="city-name">${city.isAuto ? '📍 ' : ''}${city.name}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px">
                <div class="city-temp" id="t-${city.name.replace(/\s+/g, '-')}">...</div>
                ${city.isAuto ? '' : `<div class="city-remove" onclick="event.stopPropagation(); removeCity('${city.name}')">×</div>`}
            </div>
        </div>
    `).join('');

    cities.forEach(async c => {
        const w = await fetchWeather(c.lat, c.lon);
        const el = document.getElementById(`t-${c.name.replace(/\s+/g, '-')}`);
        if (el && w) el.textContent = Math.round(w.current.temperature_2m) + "°";
    });
}

function renderMain(name, { current: cur, daily }) {
    const [desc, icon] = WMO[cur.weathercode] || ["Nieznana", "🌡️"];
    
    document.getElementById("heroBlock").innerHTML = `
        <div class="hero-city">${name}</div>
        <div style="display:flex;align-items:flex-end;gap:16px">
            <div class="hero-temp">${Math.round(cur.temperature_2m)}°</div>
            <div style="padding-bottom:16px;color:rgba(255,255,255,0.55);font-size:18px">${icon} ${desc}</div>
        </div>`;

    document.getElementById("forecastStrip").innerHTML = daily.time.map((date, i) => `
        <div class="fc-day">
            <div class="fc-label">${i === 0 ? "Dziś" : DAYS_PL[new Date(date).getDay()]}</div>
            <div class="fc-icon">${WMO[daily.weathercode[i]]?.[1] || "🌡️"}</div>
            <div class="fc-temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>
        </div>
    `).join('');

    const tiles = [
        { label: "Odczuwalna", value: Math.round(cur.apparent_temperature) + "°C", icon: "🌡️" },
        { label: "Wilgotność", value: cur.relativehumidity_2m + "%", icon: "💧" },
        { label: "Wiatr", value: Math.round(cur.windspeed_10m) + " km/h", icon: "💨" },
        { label: "Opady", value: (cur.precipitation || 0).toFixed(1) + " mm", icon: "🌧️" }
    ];

    document.getElementById("tilesGrid").innerHTML = tiles.map(t => `
        <div class="tile">
            <div style="font-size:22px;margin-bottom:6px">${t.icon}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px">${t.label}</div>
            <div style="color:white;font-size:20px;font-weight:300">${t.value}</div>
        </div>
    `).join('');
}

function clearMain() {
    ["heroBlock", "forecastStrip", "tilesGrid"].forEach(id => document.getElementById(id).innerHTML = "");
}

function saveAndRender() {
    localStorage.setItem("cities", JSON.stringify(cities));
    renderCityList();
}