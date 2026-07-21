const SHEET_ID = "1zZGWjxfYOj6QF8Xlgo_82dI2GaFxQtYQQ-1KvNNmZIQ";

const HOJAS = [
    "FAAC",
    "Centurion",
    "Merik",
    "Erreka",
    "Rossi",
    "Azteca",
    "Allmatic",
    "Controles",
    "Herrajes",
    "Centrales y tarjetas electronicas",
    "Dispositivos y accesorios electronicos",
    "Control de Acceso",
    "Resortes",
    "Refacciones"
];

// Tiempo de vida del cache en localStorage (en minutos)
const CACHE_MINUTOS = 1;

let data = {};
let currentSheet = HOJAS[0];

const tabs = document.getElementById("tabs");
const products = document.getElementById("products");
const search = document.getElementById("search");

/**
 * Obtiene los datos de una hoja, usando cache en localStorage si sigue vigente.
 * Si no hay cache o está vencido, hace fetch a la API y actualiza el cache.
 */
async function fetchConCache(hoja) {

    const key = `sheet_${hoja}`;

    try {

        const cacheRaw = localStorage.getItem(key);

        if (cacheRaw) {

            const cache = JSON.parse(cacheRaw);
            const vigente = (Date.now() - cache.timestamp) < CACHE_MINUTOS * 60 * 1000;

            if (vigente) {
                return cache.data;
            }

        }

    } catch (error) {
        console.warn(`No se pudo leer cache de ${hoja}:`, error);
    }

    const response = await fetch(
        `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(hoja)}`
    );

    const json = await response.json();

    try {

        localStorage.setItem(
            key,
            JSON.stringify({ data: json, timestamp: Date.now() })
        );

    } catch (error) {
        // Si localStorage está lleno o no disponible, seguimos sin cache
        console.warn(`No se pudo guardar cache de ${hoja}:`, error);
    }

    return json;
}

/**
 * Carga los datos de una hoja específica (si no están ya en memoria).
 */
async function cargarHoja(hoja) {

    if (data[hoja]) return; // ya está en memoria, no hace falta pedirla de nuevo

    try {
        data[hoja] = await fetchConCache(hoja);
    } catch (error) {
        console.error(`Error cargando ${hoja}:`, error);
        data[hoja] = [];
    }

}

/**
 * Carga inicial: solo trae la hoja activa para que la página se sienta
 * instantánea. El resto se carga bajo demanda al cambiar de pestaña.
 */
async function cargarDatosIniciales() {

    products.innerHTML = "<p style='color:white;'>Cargando productos...</p>";

    renderTabs();

    await cargarHoja(currentSheet);

    renderProducts();

}

function renderTabs() {

    tabs.innerHTML = "";

    HOJAS.forEach(sheet => {

        const btn = document.createElement("div");

        btn.className =
            "tab" +
            (sheet === currentSheet ? " active" : "");

        btn.textContent = sheet;

        btn.onclick = async () => {

            currentSheet = sheet;
            renderTabs();

            const yaEstabaCargada = !!data[sheet];

            if (!yaEstabaCargada) {
                products.innerHTML = "<p style='color:white;'>Cargando productos...</p>";
            }

            await cargarHoja(sheet);
            renderProducts();

        };

        tabs.appendChild(btn);

    });
}

function obtenerValor(obj, posiblesNombres) {

    for (const nombre of posiblesNombres) {

        if (obj[nombre] !== undefined) {
            return obj[nombre];
        }

    }

    return null;
}

function renderProducts() {

    const term = search.value.toLowerCase();

    const filtrados = (data[currentSheet] || []).filter(producto => {

        const descripcion = obtenerValor(
            producto,
            [
                "Descripcion",
                "Descripción",
                "DESCRIPCION",
                "DESCRIPCIÓN"
            ]
        );

        if (!descripcion) return false;

        return descripcion
            .toLowerCase()
            .includes(term);

    });

    // Armamos todas las tarjetas en memoria (DocumentFragment) y las
    // insertamos al DOM de una sola vez, evitando reflows repetidos.
    const fragment = document.createDocumentFragment();

    filtrados.forEach(producto => {

        const descripcion = obtenerValor(
            producto,
            [
                "Descripcion",
                "Descripción",
                "DESCRIPCION",
                "DESCRIPCIÓN"
            ]
        );

        const inventario =
            obtenerValor(
                producto,
                [
                    "Inventario",
                    "INVENTARIO"
                ]
            ) || 0;

        const precioRaw =
            obtenerValor(
                producto,
                [
                    "Precio",
                    "PRECIO"
                ]
            ) || 0;

        const precio = Math.round(
            Number(
                String(precioRaw)
                    .replace(/\$/g, "")
                    .replace(/,/g, "")
            ) || 0
        );

        const rutaImagen = `Imagenes/${encodeURIComponent(descripcion)}.png`;

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <h3>${descripcion}</h3>

            <div class="card-content">

                <div class="card-info">
                    <p>
                        <strong>Inventario:</strong>
                        ${inventario}
                    </p>

                    <p class="precio">
                        <strong>Precio:</strong>
                        $${precio.toLocaleString("es-MX")}
                    </p>
                </div>

                <img src="${rutaImagen}" alt="${descripcion}" class="product-image" loading="lazy" decoding="async" onerror="this.style.display='none'">

            </div>
        `;

        fragment.appendChild(card);

    });

    products.innerHTML = "";

    if (filtrados.length === 0) {

        products.innerHTML = `
            <div class="card">
                <h3>No se encontraron productos</h3>
            </div>
        `;

    } else {

        products.appendChild(fragment);

    }
}

// Debounce en la búsqueda: espera 200ms después de que el usuario deja
// de escribir antes de volver a renderizar, para no recalcular en cada tecla.
let debounceTimer;

search.addEventListener("input", () => {

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderProducts, 200);

});

cargarDatosIniciales();
