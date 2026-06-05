const WMO = { 0: ["Bezchmurnie", "☀️"], 1: ["Prawie bezchmurnie", "🌤️"], 2: ["Częściowe zachmurzenie", "⛅"], 3: ["Zachmurzenie całkowite", "☁️"], 45: ["Mgła", "🌫️"], 48: ["Mgła szronna", "🌫️"], 51: ["Mżawka lekka", "🌦️"], 53: ["Mżawka", "🌦️"], 55: ["Mżawka gęsta", "🌧️"], 61: ["Deszcz lekki", "🌧️"], 63: ["Deszcz", "🌧️"], 65: ["Deszcz silny", "🌧️"], 71: ["Śnieg lekki", "🌨️"], 73: ["Śnieg", "❄️"], 75: ["Śnieg obfity", "❄️"], 80: ["Przelotny deszcz", "🌦️"], 81: ["Deszcz przelotny", "🌧️"], 82: ["Gwałtowny deszcz", "⛈️"], 95: ["Burza", "⛈️"], 96: ["Burza z gradem", "⛈️"], 99: ["Burza z silnym gradem", "⛈️"] };
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

let cities = JSON.parse(localStorage.getItem("cities") || "[]");
let activeCity = null;
let suggestTimer;
let currentView = 'dashboard'; 
let currentWeatherData = null;
let weatherChart = null; 

const api = async (url) => (await fetch(url)).json();

(function init() {
  renderCityList();
  detectLocation();
  if (cities.length) selectCity(cities[0].name);

  const input = document.getElementById("cityInput");
  input.addEventListener("input", onCityInput);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const firstSuggestion = document.querySelector(".suggestion-item");
      if(firstSuggestion) firstSuggestion.click();
    }
  });

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

async function fetchWeather(lat, lon) {
  return api(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
}

async function onCityInput(e) {
  clearTimeout(suggestTimer);
  const val = e.target.value.trim();
  const box = document.getElementById("suggestions");
  
  if (val.length < 2) {
    box.replaceChildren();
    return;
  }

  suggestTimer = setTimeout(async () => {
    const { results } = await api(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=pl&format=json`);
    box.replaceChildren(); 
    
    const tpl = document.getElementById('tpl-suggestion');
    (results || []).forEach(r => {
      const clone = tpl.content.cloneNode(true);
      const item = clone.querySelector('.suggestion-item');
      item.textContent = `${r.name}${r.country ? ", " + r.country : ""}`;
      
      item.addEventListener('click', () => addCityFromSearch(r.name, r.latitude, r.longitude));
      
      box.appendChild(clone);
    });
  }, 300);
}

function addCityFromSearch(name, lat, lon) {
  if (!cities.some(c => c.name === name)) cities.push({ name, lat, lon });
  document.getElementById("cityInput").value = "";
  document.getElementById("suggestions").replaceChildren();
  saveAndRender();
  selectCity(name);
}

function switchTab(e, viewName) {
  e.preventDefault();
  currentView = viewName;
  
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  e.target.classList.add('active');

  renderCurrentView();
}

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
    document.getElementById("mainContent").replaceChildren();
  }
}

function renderCurrentView() {
  if (!currentWeatherData || !activeCity) return;
  
  const mainContainer = document.getElementById("mainContent");
  mainContainer.replaceChildren(); 
  
  if (currentView === 'dashboard') {
    const tplDashboard = document.getElementById('tpl-dashboard').content.cloneNode(true);
    mainContainer.appendChild(tplDashboard);
    renderMain(activeCity, currentWeatherData);
  } else if (currentView === 'stats') {
    const tplStats = document.getElementById('tpl-stats').content.cloneNode(true);
    mainContainer.appendChild(tplStats);
    renderStats(activeCity, currentWeatherData);
  }
}

function renderCityList() {
  const list = document.getElementById("cityList");
  list.replaceChildren();

  const tpl = document.getElementById('tpl-city-item');

  cities.forEach(city => {
    const clone = tpl.content.cloneNode(true);
    const itemEl = clone.querySelector('.city-item');
    const nameEl = clone.querySelector('.city-name');
    const tempEl = clone.querySelector('.city-temp');
    const removeBtn = clone.querySelector('.city-remove');

    if (city.name === activeCity) {
      itemEl.classList.add('active');
    }

    nameEl.textContent = `${city.isAuto ? '📍 ' : ''}${city.name}`;
    tempEl.id = `t-${city.name.replace(/\s+/g, '-')}`;

    itemEl.addEventListener('click', () => selectCity(city.name));

    if (city.isAuto) {
      removeBtn.remove(); 
    } else {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCity(city.name);
      });
    }

    list.appendChild(clone);

    fetchWeather(city.lat, city.lon).then(w => {
      const el = document.getElementById(`t-${city.name.replace(/\s+/g, '-')}`);
      if (el && w) el.textContent = Math.round(w.current.temperature_2m) + "°";
    });
  });
}

function renderMain(name, { current: cur, daily }) {
  const [desc, icon] = WMO[cur.weathercode] || ["Nieznana", "🌡️"];
  
  document.querySelector(".hero-city").textContent = name;
  document.querySelector(".hero-temp").textContent = `${Math.round(cur.temperature_2m)}°`;
  document.querySelector(".hero-desc").textContent = `${icon} ${desc}`;

  const strip = document.getElementById("forecastStrip");
  const tplDay = document.getElementById('tpl-forecast-day');
  
  daily.time.forEach((date, i) => {
    const clone = tplDay.content.cloneNode(true);
    clone.querySelector('.fc-label').textContent = i === 0 ? "Dziś" : DAYS_PL[new Date(date).getDay()];
    clone.querySelector('.fc-icon').textContent = WMO[daily.weathercode[i]]?.[1] || "🌡️";
    clone.querySelector('.fc-temp').textContent = `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`;
    strip.appendChild(clone);
  });

  const grid = document.getElementById("tilesGrid");
  const tplTile = document.getElementById('tpl-tile');
  
  const tilesData = [
    { label: "Odczuwalna", value: Math.round(cur.apparent_temperature) + "°C", icon: "🌡️" },
    { label: "Wilgotność", value: cur.relativehumidity_2m + "%", icon: "💧" },
    { label: "Wiatr", value: Math.round(cur.windspeed_10m) + " km/h", icon: "💨" },
    { label: "Opady", value: (cur.precipitation || 0).toFixed(1) + " mm", icon: "🌧️" }
  ];

  tilesData.forEach(t => {
    const clone = tplTile.content.cloneNode(true);
    clone.querySelector('.tile-icon').textContent = t.icon;
    clone.querySelector('.tile-label').textContent = t.label;
    clone.querySelector('.tile-value').textContent = t.value;
    grid.appendChild(clone);
  });
}

function renderStats(name, { daily }) {
  const maxTemps = daily.temperature_2m_max;
  const minTemps = daily.temperature_2m_min;
  const precipSum = daily.precipitation_sum ? daily.precipitation_sum.reduce((a, b) => a + b, 0) : 0;

  document.querySelector(".stats-title").textContent = `${name} - Statystyki (7 dni)`;
  document.getElementById("statAvgMax").textContent = `${(maxTemps.reduce((a,b)=>a+b,0)/maxTemps.length).toFixed(1)}°C`;
  document.getElementById("statAvgMin").textContent = `${(minTemps.reduce((a,b)=>a+b,0)/minTemps.length).toFixed(1)}°C`;
  document.getElementById("statPrecip").textContent = `${precipSum.toFixed(1)} mm`;

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
      plugins: { legend: { position: 'top' } },
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
