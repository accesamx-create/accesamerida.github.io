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
    "Refacciones"
];

let data = {};
let currentSheet = HOJAS[0];

const tabs = document.getElementById("tabs");
const products = document.getElementById("products");
const search = document.getElementById("search");

async function cargarDatos() {

    products.innerHTML = "<p style='color:white;'>Cargando productos...</p>";

    for (const hoja of HOJAS) {

        try {

            const response = await fetch(
                `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(hoja)}`
            );

            data[hoja] = await response.json();

        } catch (error) {

            console.error(`Error cargando ${hoja}:`, error);
            data[hoja] = [];

        }
    }

    renderTabs();
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

        btn.onclick = () => {
            currentSheet = sheet;
            renderTabs();
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

    products.innerHTML = "";

    (data[currentSheet] || [])

        .filter(producto => {

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

        })

        .forEach(producto => {

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

            // --- NUEVO: Generamos la ruta de la imagen ---
            // Usamos encodeURIComponent para que los espacios y caracteres raros no rompan la URL
            const rutaImagen = `Imagenes/${encodeURIComponent(descripcion)}.png`;

            const card = document.createElement("div");

            card.className = "card";

            // --- NUEVO: Agregamos la etiqueta <img> ---
            // El atributo onerror oculta la imagen si por alguna razón no se encuentra en la carpeta
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
                    
                    <img src="${rutaImagen}" alt="${descripcion}" class="product-image" onerror="this.style.display='none'">
                    
                </div>
            `;
            products.appendChild(card);

        });

    if (products.innerHTML === "") {

        products.innerHTML = `
            <div class="card">
                <h3>No se encontraron productos</h3>
            </div>
        `;

    }
}

search.addEventListener("input", renderProducts);

cargarDatos();
