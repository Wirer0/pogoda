const WMO = { 
  0: ["Bezchmurnie", "☀️"], 1: ["Prawie bezchmurnie", "🌤️"], 2: ["Częściowe zachmurzenie", "⛅"], 
  3: ["Zachmurzenie całkowite", "☁️"], 45: ["Mgła", "🌫️"], 48: ["Mgła szronna", "🌫️"], 
  51: ["Mżawka lekka", "🌦️"], 53: ["Mżawka", "🌦️"], 55: ["Mżawka gęsta", "🌧️"], 
  61: ["Deszcz lekki", "🌧️"], 63: ["Deszcz", "🌧️"], 65: ["Deszcz silny", "🌧️"], 
  71: ["Śnieg lekki", "🌨️"], 73: ["Śnieg", "❄️"], 75: ["Śnieg obfity", "❄️"], 
  80: ["Przelotny deszcz", "🌦️"], 81: ["Deszcz przelotny", "🌧️"], 82: ["Gwałtowny deszcz", "⛈️"], 
  95: ["Burza", "⛈️"], 96: ["Burza z gradem", "⛈️"], 99: ["Burza z silnym gradem", "⛈️"] 
};
const DAYS_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
const WeatherAPI = {
  async fetchJSON(url) {
    const response = await fetch(url);
    return response.json();
  },

  async fetchWeather(lat, lon) {
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    return this.fetchJSON(endpoint);
  },

  async searchCity(query) {
    const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pl&format=json`;
    return this.fetchJSON(endpoint);
  },

  async reverseGeocode(lat, lon) {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    return this.fetchJSON(endpoint);
  }
};
const WeatherApp = {
  cities: JSON.parse(localStorage.getItem("cities") || "[]"),
  activeCity: null,
  suggestTimer: null,
  currentView: 'dashboard',
  currentWeatherData: null,
  weatherChart: null,

  init() {
    this.renderCityList();
    this.detectLocation();
    
    if (this.cities.length) {
      this.selectCity(this.cities[0].name);
    }

    const input = document.getElementById("cityInput");
    input.addEventListener("input", (e) => this.onCityInput(e));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const firstSuggestion = document.querySelector(".suggestion-item");
        if (firstSuggestion) firstSuggestion.click();
      }
    });

    document.getElementById("nav-dashboard").addEventListener("click", (e) => this.switchTab(e, 'dashboard'));
    document.getElementById("nav-stats").addEventListener("click", (e) => this.switchTab(e, 'stats'));
  },

  detectLocation() {
    navigator.geolocation?.getCurrentPosition(async ({ coords: { latitude: lat, longitude: lon } }) => {
      try {
        const data = await WeatherAPI.reverseGeocode(lat, lon);
        const name = data.address.city || data.address.town || "Twoja lokalizacja";
        
        if (!this.cities.some(c => c.name === name)) {
          this.cities = [{ name, lat, lon, isAuto: true }, ...this.cities.filter(c => !c.isAuto)];
          this.saveAndRender();
          if (!this.activeCity) this.selectCity(name);
        }
      } catch (error) {
        console.error("Błąd lokalizacji:", error);
      }
    });
  },

  async onCityInput(e) {
    clearTimeout(this.suggestTimer);
    const val = e.target.value.trim();
    const box = document.getElementById("suggestions");
    
    if (val.length < 2) {
      box.replaceChildren();
      return;
    }

    this.suggestTimer = setTimeout(async () => {
      try {
        const { results } = await WeatherAPI.searchCity(val);
        box.replaceChildren(); 
        
        const tpl = document.getElementById('tpl-suggestion');
        (results || []).forEach(r => {
          const clone = tpl.content.cloneNode(true);
          const item = clone.querySelector('.suggestion-item');
          item.textContent = `${r.name}${r.country ? ", " + r.country : ""}`;
          
          item.addEventListener('click', () => this.addCityFromSearch(r.name, r.latitude, r.longitude));
          box.appendChild(clone);
        });
      } catch (error) {
        console.error("Błąd wyszukiwania miast:", error);
      }
    }, 300);
  },

  addCityFromSearch(name, lat, lon) {
    if (!this.cities.some(c => c.name === name)) {
      this.cities.push({ name, lat, lon });
    }
    document.getElementById("cityInput").value = "";
    document.getElementById("suggestions").replaceChildren();
    this.saveAndRender();
    this.selectCity(name);
  },

  switchTab(e, viewName) {
    e.preventDefault();
    this.currentView = viewName;
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    e.target.classList.add('active');

    this.renderCurrentView();
  },

  async selectCity(name) {
    this.activeCity = name;
    this.renderCityList();
    const city = this.cities.find(c => c.name === name);
    if (city) {
      try {
        const w = await WeatherAPI.fetchWeather(city.lat, city.lon);
        if (w) {
          this.currentWeatherData = w;
          this.renderCurrentView();
        }
      } catch (error) {
        console.error("Błąd pobierania pogody:", error);
      }
    }
  },
  removeCity(name) {
    this.cities = this.cities.filter(c => c.name !== name);
    this.activeCity = (this.activeCity === name) ? (this.cities[0]?.name || null) : this.activeCity;
    this.saveAndRender();
    
    if (this.activeCity) {
      this.selectCity(this.activeCity);
    } else {
      this.currentWeatherData = null;
      document.getElementById("mainContent").replaceChildren();
    }
  },
  renderCurrentView() {
    if (!this.currentWeatherData || !this.activeCity) return;
    
    const mainContainer = document.getElementById("mainContent");
    mainContainer.replaceChildren(); 
    
    if (this.currentView === 'dashboard') {
      const tplDashboard = document.getElementById('tpl-dashboard').content.cloneNode(true);
      mainContainer.appendChild(tplDashboard);
      this.renderMain(this.activeCity, this.currentWeatherData);
    } else if (this.currentView === 'stats') {
      const tplStats = document.getElementById('tpl-stats').content.cloneNode(true);
      mainContainer.appendChild(tplStats);
      this.renderStats(this.activeCity, this.currentWeatherData);
    }
  },
  renderCityList() {
    const list = document.getElementById("cityList");
    list.replaceChildren();

    const tpl = document.getElementById('tpl-city-item');

    this.cities.forEach(city => {
      const clone = tpl.content.cloneNode(true);
      const itemEl = clone.querySelector('.city-item');
      const nameEl = clone.querySelector('.city-name');
      const tempEl = clone.querySelector('.city-temp');
      const removeBtn = clone.querySelector('.city-remove');

      if (city.name === this.activeCity) {
        itemEl.classList.add('active');
      }

      nameEl.textContent = `${city.isAuto ? '📍 ' : ''}${city.name}`;
      
      const safeClassName = city.name.replace(/\s+/g, '-');
      tempEl.classList.add(`t-${safeClassName}`);

      itemEl.addEventListener('click', () => this.selectCity(city.name));

      if (city.isAuto) {
        removeBtn.remove(); 
      } else {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeCity(city.name);
        });
      }

      list.appendChild(clone);
      WeatherAPI.fetchWeather(city.lat, city.lon).then(w => {
        const el = list.querySelector(`.t-${safeClassName}`);
        if (el && w) el.textContent = Math.round(w.current.temperature_2m) + "°";
      }).catch(err => console.error("Mini-fetch error:", err));
    });
  },

  renderMain(name, { current: cur, daily }) {
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
  },

  renderStats(name, { daily }) {
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
    
    if (this.weatherChart) {
      this.weatherChart.destroy();
    }

    Chart.defaults.color = 'rgba(255, 255, 255, 0.5)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    this.weatherChart = new Chart(ctx, {
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
  },

  saveAndRender() {
    localStorage.setItem("cities", JSON.stringify(this.cities));
    this.renderCityList();
  }
};
WeatherApp.init();