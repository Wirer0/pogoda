const WMO = {
  0:"Bezchmurnie",1:"Prawie bezchmurnie",2:"Częściowe zachmurzenie",3:"Zachmurzenie całkowite",
  45:"Mgła",48:"Mgła szronna",
  51:"Mżawka lekka",53:"Mżawka",55:"Mżawka gęsta",
  61:"Deszcz lekki",63:"Deszcz",65:"Deszcz silny",
  71:"Śnieg lekki",73:"Śnieg",75:"Śnieg obfity",
  80:"Przelotny deszcz",81:"Deszcz przelotny",82:"Gwałtowny deszcz",
  95:"Burza",96:"Burza z gradem",99:"Burza z silnym gradem"
};
const WMO_ICON = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",
  45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",
  61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"❄️",75:"❄️",
  80:"🌦️",81:"🌧️",82:"⛈️",
  95:"⛈️",96:"⛈️",99:"⛈️"
};
const DAYS_PL = ["Nd","Pn","Wt","Śr","Cz","Pt","So"];

let cities = JSON.parse(localStorage.getItem("cities") || "[]");
let activeCity = null;

(async function init() {
  renderCityList();
  detectLocation();
  if (cities.length > 0) selectCity(cities[0].name);

  document.getElementById("cityInput").addEventListener("input", onCityInput);
  document.getElementById("cityInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const val = e.target.value.trim();
      if (val) addCityByName(val);
    }
  });
})();

async function detectLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    // reverse geocode
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pl`
    );
    const data = await res.json();
    const name =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      "Twoja lokalizacja";

    if (cities.find(c => c.name.toLowerCase() === name.toLowerCase())) return;

    const city = { name, lat, lon, isAuto: true };
    cities = [city, ...cities.filter(c => !c.isAuto)];
    saveAndRender();
    if (!activeCity) selectCity(name);
  }, () => {/* permission denied – silent */});
}

// WEATHER API (Open-Meteo)
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,precipitation` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    return await res.json();
  } catch { return null; }
}

async function geocodeCity(name) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=pl&format=json`
  );
  const data = await res.json();
  return data.results || [];
}

async function addCityByName(name) {
  const results = await geocodeCity(name);
  if (!results.length) return;
  const r = results[0];
  const cityName = r.name;
  if (cities.find(c => c.name.toLowerCase() === cityName.toLowerCase())) {
    selectCity(cityName); return;
  }
  const weather = await fetchWeather(r.latitude, r.longitude);
  const city = { name: cityName, lat: r.latitude, lon: r.longitude };
  cities.push(city);
  saveAndRender();
  selectCity(cityName);
  document.getElementById("cityInput").value = "";
  document.getElementById("suggestions").innerHTML = "";
}

let suggestTimer;
async function onCityInput(e) {
  clearTimeout(suggestTimer);
  const val = e.target.value.trim();
  const box = document.getElementById("suggestions");
  if (val.length < 2) { box.innerHTML = ""; return; }
  suggestTimer = setTimeout(async () => {
    const results = await geocodeCity(val);
    box.innerHTML = "";
    results.slice(0, 5).forEach(r => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = `${r.name}${r.country ? ", " + r.country : ""}`;
      div.addEventListener("click", () => {
        document.getElementById("cityInput").value = "";
        box.innerHTML = "";
        addCityByName(r.name);
      });
      box.appendChild(div);
    });
  }, 300);
}

async function selectCity(name) {
  activeCity = name;
  renderCityList();
  const city = cities.find(c => c.name === name);
  if (!city) return;
  const w = await fetchWeather(city.lat, city.lon);
  if (w) renderMain(name, w);
}

function removeCity(name) {
  cities = cities.filter(c => c.name !== name);
  if (activeCity === name) {
    activeCity = cities[0]?.name || null;
  }
  saveAndRender();
  if (activeCity) selectCity(activeCity);
  else clearMain();
}

function renderCityList() {
  const list = document.getElementById("cityList");
  list.innerHTML = "";

  cities.forEach(city => {
    const item = document.createElement("div");
    item.className = "city-item" + (city.name === activeCity ? " active" : "");

    const removeHtml = city.isAuto ? "" : `<div class="city-remove">×</div>`;

    item.innerHTML = `
      <div class="city-left">
        <div class="city-name">${city.isAuto ? "📍 " : ""}${city.name}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px">
        <div class="city-temp">...</div>
        ${removeHtml}
      </div>
    `;

    item.onclick = (e) => {
      if (e.target.classList.contains('city-remove')) return;
      selectCity(city.name);
    };

    const removeBtn = item.querySelector('.city-remove');
    if (removeBtn) {
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeCity(city.name);
      };
    }

    list.appendChild(item);

    fetchWeather(city.lat, city.lon).then(w => {
      if (w) {
        const tempDiv = item.querySelector('.city-temp');
        if (tempDiv) tempDiv.textContent = Math.round(w.current.temperature_2m) + "°";
      }
    });
  });
}

function renderMain(name, w) {
  const cur = w.current;
  const daily = w.daily;

  const hero = document.getElementById("heroBlock");
  hero.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="hero-city">${name}</div>
      <div style="display:flex;align-items:flex-end;gap:16px">
        <div class="hero-temp">${Math.round(cur.temperature_2m)}°</div>
        <div style="padding-bottom:16px;color:rgba(255,255,255,0.55);font-size:18px">
          ${WMO_ICON[cur.weathercode] || ""} ${WMO[cur.weathercode] || ""}
        </div>
      </div>
    </div>`;

  const strip = document.getElementById("forecastStrip");
  strip.innerHTML = "";
  const today = new Date();
  daily.time.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const label = i === 0 ? "Dziś" : DAYS_PL[d.getDay()];
    const div = document.createElement("div");
    div.className = "fc-day";
    div.innerHTML = `
      <div class="fc-label">${label}</div>
      <div class="fc-icon">${WMO_ICON[daily.weathercode[i]] || "🌡️"}</div>
      <div class="fc-temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>`;
    strip.appendChild(div);
  });

  const grid = document.getElementById("tilesGrid");
  const tiles = [
    { label: "Odczuwalna", value: Math.round(cur.apparent_temperature) + "°C", icon: "🌡️" },
    { label: "Wilgotność", value: cur.relativehumidity_2m + "%", icon: "💧" },
    { label: "Wiatr", value: Math.round(cur.windspeed_10m) + " km/h", icon: "💨" },
    { label: "Opady", value: (cur.precipitation || 0).toFixed(1) + " mm", icon: "🌧️" },
    { label: "Maks. dziś", value: Math.round(daily.temperature_2m_max[0]) + "°C", icon: "🔺" },
    { label: "Min. dziś", value: Math.round(daily.temperature_2m_min[0]) + "°C", icon: "🔻" },
  ];
  grid.innerHTML = "";
  tiles.forEach(t => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div style="font-size:22px;margin-bottom:6px">${t.icon}</div>
      <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px">${t.label}</div>
      <div style="color:white;font-size:20px;font-weight:300">${t.value}</div>`;
    grid.appendChild(tile);
  });
}

function clearMain() {
  document.getElementById("heroBlock").innerHTML = "";
  document.getElementById("forecastStrip").innerHTML = "";
  document.getElementById("tilesGrid").innerHTML = "";
}

function saveAndRender() {
  localStorage.setItem("cities", JSON.stringify(cities));
  renderCityList();
}