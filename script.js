const WMO = { 0: ["Bezchmurnie", "☀️"], 1: ["Prawie bezchmurnie", "🌤️"], 2: ["Częściowe zachmurzenie", "⛅"], 3: ["Zachmurzenie całkowite", "☁️"], 45: ["Mgła", "🌫️"], 48: ["Mgła szronna", "🌫️"], 51: ["Mżawka lekka", "🌦️"], 53: ["Mżawka", "🌦️"], 55: ["Mżawka gęsta", "🌧️"], 61: ["Deszcz lekki", "🌧️"], 63: ["Deszcz", "🌧️"], 65: ["Deszcz silny", "🌧️"], 71: ["Śnieg lekki", "🌨️"], 73: ["Śnieg", "❄️"], 75: ["Śnieg obfity", "❄️"], 80: ["Przelotny deszcz", "🌦️"], 81: ["Deszcz przelotny", "🌧️"], 82: ["Gwałtowny deszcz", "⛈️"], 95: ["Burza", "⛈️"], 96: ["Burza z gradem", "⛈️"], 99: ["Burza z silnym gradem", "⛈️"] };
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

let cities = JSON.parse(localStorage.getItem("cities") || "[]");
let activeCity = null;
let suggestTimer;

// Nowe zmienne globalne dla widoków i statystyk
let currentView = 'dashboard'; 
let currentWeatherData = null;
let weatherChart = null; 

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

  // Obsługa nawigacji
  document.getElementById("nav-dashboard").addEventListener("click", (e) => switchTab(e, 'dashboard'));
  document.getElementById("nav-stats").addEventListener("click", (e) => switchTab(e, 'stats'));
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
  // Zaktualizowany URL: dodano precipitation_sum do daily
  return api(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
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

// --- NAWIGACJA ---
function switchTab(e, viewName) {
  e.preventDefault();
  currentView = viewName;
  
  // Zmiana aktywnej klasy w menu
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  e.target.classList.add('active');

  // Ponowne wyrenderowanie widoku
  renderCurrentView();
}

// --- LOGIKA MIAST ---
async function selectCity(name) {
  activeCity = name;
  renderCityList();
  const city = cities.find(c => c.name === name);
  if (city) {
    const w = await fetchWeather(city.lat, city.lon);
    if (w) {
      currentWeatherData = w;
      renderCurrentView();
    }
  }
}

function removeCity(name) {
  cities = cities.filter(c => c.name !== name);
  activeCity = (activeCity === name) ? (cities[0]?.name || null) : activeCity;
  saveAndRender();
  if (activeCity) {
    selectCity(activeCity);
  } else {
    currentWeatherData = null;
    document.querySelector(".main").innerHTML = "";
  }
}

// --- ZARZĄDZANIE WIDOKAMI ---
function renderCurrentView() {
  if (!currentWeatherData || !activeCity) return;
  
  const mainContainer = document.querySelector(".main");
  
  if (currentView === 'dashboard') {
    // Generujemy szkielet pulpitu
    mainContainer.innerHTML = `
      <div id="heroBlock"></div>
      <div class="forecast-strip" id="forecastStrip"></div>
      <div class="section-title">Szczegóły pogody</div>
      <div class="tiles-grid" id="tilesGrid"></div>
    `;
    renderMain(activeCity, currentWeatherData);
  } else if (currentView === 'stats') {
    renderStats(activeCity, currentWeatherData);
  }
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

function renderStats(name, { daily }) {
  const mainContainer = document.querySelector(".main");
  
  const maxTemps = daily.temperature_2m_max;
  const minTemps = daily.temperature_2m_min;
  
  const precipSum = daily.precipitation_sum ? daily.precipitation_sum.reduce((a, b) => a + b, 0) : 0;

  mainContainer.innerHTML = `
    <div class="hero-city">${name} - Statystyki (7 dni)</div>
    
    <div class="stats-summary" style="margin-top: 20px;">
      <div class="stat-box">
        <div class="stat-box-title">Średnia Max Temp.</div>
        <div class="stat-box-value">${(maxTemps.reduce((a,b)=>a+b,0)/maxTemps.length).toFixed(1)}°C</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Średnia Min Temp.</div>
        <div class="stat-box-value">${(minTemps.reduce((a,b)=>a+b,0)/minTemps.length).toFixed(1)}°C</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-title">Prognozowane opady</div>
        <div class="stat-box-value">${precipSum.toFixed(1)} mm</div>
      </div>
    </div>

    <div class="section-title">Amplituda temperatur</div>
    <div class="chart-container">
      <canvas id="weatherChart"></canvas>
    </div>
  `;

  const labels = daily.time.map(date => {
    const d = new Date(date);
    return `${DAYS_PL[d.getDay()]} (${d.getDate()}.${d.getMonth() + 1})`;
  });

  const ctx = document.getElementById('weatherChart').getContext('2d');
  
  if (weatherChart) {
    weatherChart.destroy();
  }

  Chart.defaults.color = 'rgba(255, 255, 255, 0.5)';
  Chart.defaults.font.family = "'Inter', sans-serif";

  weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Max Temperatura (°C)',
          data: maxTemps,
          borderColor: '#ff5f57',
          backgroundColor: 'rgba(255, 95, 87, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Min Temperatura (°C)',
          data: minTemps,
          borderColor: '#4a9eff',
          backgroundColor: 'rgba(74, 158, 255, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function saveAndRender() {
  localStorage.setItem("cities", JSON.stringify(cities));
  renderCityList();
}