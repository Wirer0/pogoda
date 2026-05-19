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
let draggedCityIndex = null;

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
    
    // Szybkie i bezpieczne czyszczenie zawartości
    box.replaceChildren(); 
    
    if (val.length < 1) return;

    const wyniki = DB_CITIES.filter(m => m.name.toLowerCase().includes(val));
    const template = document.getElementById("suggestion-template");

    wyniki.forEach(r => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".suggestion-item");
        
        item.textContent = r.name;
        item.addEventListener("click", () => addCityFromSearch(r.name));
        
        box.appendChild(clone);
    });
}

function addCityFromSearch(name) {
    const miastoZBazy = DB_CITIES.find(m => m.name === name);
    
    if (miastoZBazy && !cities.some(c => c.name === name)) {
        cities.push(miastoZBazy);
        localStorage.setItem("cities", JSON.stringify(cities));
    }
    
    document.getElementById("cityInput").value = "";
    document.getElementById("suggestions").replaceChildren();
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

function renderCityList() {
    const list = document.getElementById("cityList");
    if (!list) return;
    
    list.replaceChildren();
    const template = document.getElementById("city-item-template");

    cities.forEach((city, index) => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".city-item");
        
        if (city.name === activeCity) {
            item.classList.add('active');
        }
        item.dataset.index = index;
        
        item.querySelector(".city-name").textContent = city.name;
        item.querySelector(".city-temp").textContent = `${city.temp}°`;

        const removeBtn = item.querySelector(".city-remove");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            removeCity(city.name);
        });

        item.addEventListener("click", () => selectCity(city.name));
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        list.appendChild(clone);
    });
}

function removeCity(name) {
    if (cities.length <= 1) {
        alert("Nie możesz usunąć ostatniego miasta na liście!");
        return;
    }
    cities = cities.filter(c => c.name !== name);
    localStorage.setItem("cities", JSON.stringify(cities));

    if (activeCity === name) {
        selectCity(cities[0].name);
    } else {
        renderCityList();
    }
}

function renderMain(city) {
    const hero = document.getElementById("heroBlock");
    if (hero) {
        hero.replaceChildren();
        const heroTemplate = document.getElementById("hero-template");
        
        if (heroTemplate) {
            const clone = heroTemplate.content.cloneNode(true);
            clone.querySelector(".hero-city").textContent = city.name;
            clone.querySelector(".hero-temp").textContent = `${city.temp}°`;
            clone.querySelector(".hero-desc").textContent = `${city.icon} ${city.desc}`;
            hero.appendChild(clone);
        }
    }

    const grid = document.getElementById("tilesGrid");
    if (grid) {
        grid.replaceChildren();
        const tileTemplate = document.getElementById("tile-template");
        
        if (tileTemplate) {
            const t = city.details;
            const tiles = [
                { label: "Odczuwalna", value: t.felt + "°C", icon: "🌡️" },
                { label: "Wilgotność", value: t.hum + "%", icon: "💧" },
                { label: "Wiatr", value: t.wind + " km/h", icon: "💨" },
                { label: "Opady", value: t.rain + " mm", icon: "🌧️" }
            ];

            tiles.forEach(tile => {
                const clone = tileTemplate.content.cloneNode(true);
                clone.querySelector(".tile-icon").textContent = tile.icon;
                clone.querySelector(".tile-label").textContent = tile.label;
                clone.querySelector(".tile-value").textContent = tile.value;
                grid.appendChild(clone);
            });
        }
    }
}

// --- Obsługa Drag & Drop ---
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