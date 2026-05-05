const DB_CITIES = [
    { 
        name: "Białystok", temp: 20, desc: "Mżawka gęsta", icon: "🌧️",
        details: { felt: 21, hum: 76, wind: 8, rain: 0.3 }
    },
    { 
        name: "Warszawa", temp: 27, desc: "Bezchmurnie", icon: "☀️",
        details: { felt: 29, hum: 40, wind: 10, rain: 0 }
    },
    { 
        name: "Kraków", temp: 27, desc: "Słonecznie", icon: "☀️",
        details: { felt: 28, hum: 42, wind: 5, rain: 0 }
    }
];

let cities = JSON.parse(localStorage.getItem("cities")) || [...DB_CITIES];
let activeCity = cities[0].name;

function init() {
    console.log("Aplikacja startuje...");
    renderCityList();
    selectCity(activeCity);

    const input = document.getElementById("cityInput");
    if (input) {
        input.addEventListener("input", onCityInput);
    }
}

init();

function onCityInput(e) {
    const val = e.target.value.trim().toLowerCase();
    const box = document.getElementById("suggestions");
    
    if (val.length < 1) {
        box.innerHTML = "";
        return;
    }

    const wyniki = DB_CITIES.filter(m => m.name.toLowerCase().includes(val));
    
    box.innerHTML = wyniki.map(r => `
        <div class="suggestion-item" onclick="addCityFromSearch('${r.name}')">
            ${r.name}
        </div>
    `).join('');
}

function addCityFromSearch(name) {
    const miastoZBazy = DB_CITIES.find(m => m.name === name);
    
    if (miastoZBazy && !cities.some(c => c.name === name)) {
        cities.push(miastoZBazy);
        localStorage.setItem("cities", JSON.stringify(cities));
    }
    
    document.getElementById("cityInput").value = "";
    document.getElementById("suggestions").innerHTML = "";
    selectCity(name);
}

function selectCity(name) {
    activeCity = name;
    renderCityList();
    const city = cities.find(c => c.name === name);
    if (city) {
        renderMain(city);
    }
}
let draggedCityIndex = null;
function renderCityList() {
const list = document.getElementById("cityList");
    if (!list) return;
    list.innerHTML = cities.map((city, index) => `
        <div class="city-item ${city.name === activeCity ? 'active' : ''}" 
             draggable="true" 
             data-index="${index}"
             onclick="selectCity('${city.name}')">
            <span class="city-name">${city.name}</span>
            <div class="city-temp">${city.temp}°</div>
        </div>
    `).join('');
    const items = list.querySelectorAll('.city-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function renderMain(city) {
    const hero = document.getElementById("heroBlock");
    if (hero) {
        hero.innerHTML = `
            <div class="hero-city">${city.name}</div>
            <div style="display:flex;align-items:flex-end;gap:16px">
                <div class="hero-temp">${city.temp}°</div>
                <div style="padding-bottom:16px;color:rgba(255,255,255,0.7);font-size:18px">${city.icon} ${city.desc}</div>
            </div>`;
    }

    const grid = document.getElementById("tilesGrid");
    if (grid) {
        const t = city.details;
        const tiles = [
            { label: "Odczuwalna", value: t.felt + "°C", icon: "🌡️" },
            { label: "Wilgotność", value: t.hum + "%", icon: "💧" },
            { label: "Wiatr", value: t.wind + " km/h", icon: "💨" },
            { label: "Opady", value: t.rain + " mm", icon: "🌧️" }
        ];

        grid.innerHTML = tiles.map(tile => `
            <div class="tile">
                <div style="font-size:22px;margin-bottom:6px">${tile.icon}</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px">${tile.label}</div>
                <div style="color:white;font-size:20px;font-weight:300">${tile.value}</div>
            </div>
        `).join('');
    }
}

function handleDragStart(e) {
    draggedCityIndex = Number(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    return false;
}
function handleDragEnter(e) {
    e.preventDefault();
    if (Number(e.currentTarget.dataset.index) !== draggedCityIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}
function handleDrop(e) {
    e.stopPropagation(); 
    
    const dropIndex = Number(e.currentTarget.dataset.index);
    if (draggedCityIndex !== null && draggedCityIndex !== dropIndex) {
        const draggedCity = cities.splice(draggedCityIndex, 1)[0];
        cities.splice(dropIndex, 0, draggedCity);
        localStorage.setItem("cities", JSON.stringify(cities));
        renderCityList();
    }
    return false;
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    const items = document.querySelectorAll('.city-item');
    items.forEach(item => item.classList.remove('drag-over'));
    draggedCityIndex = null;
}