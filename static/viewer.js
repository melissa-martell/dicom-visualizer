// Real time values
const value_slice = document.getElementById("value_slice");
const value_wc = document.getElementById("value_wc");
const value_ww = document.getElementById("value_ww");

// Inputs
const input_slice = parseInt(document.getElementById("slice").value);
const input_wc_el = document.getElementById("window_center");
const input_ww_el = document.getElementById("window_width");
const input_wc = parseFloat(input_wc_el.value);
const input_ww = parseFloat(input_ww_el.value);

// Session Storage
const data_json = sessionStorage.getItem("dicom_data");
const data = JSON.parse(data_json);

// Access to data on Session Storage
const session_id = data["session_id"];
const total_slices = data["total_slices"];
const shape = data["shape"];
const width = shape[1];
const heigth = shape[0];
const pixel_array_b64 = data["first_slice_b64"];
const pixel_spacing = data["pixel_spacing"];
const modality = data["modality"];
const series_description = data["series_description"];
const study_description = data["study_description"];
const body_part = data["body_part"];
const admitting_diagnoses = data["admitting_diagnoses"];

// Add max atribute to slices
document.getElementById("slice").max = total_slices - 1;

// Add content to page
document.getElementById("modality").textContent = "Modality: " + modality;
document.getElementById("series_description").textContent ="Series Description: " + series_description;
document.getElementById("study_description").textContent ="Study Description: " + study_description;
document.getElementById("body_part").textContent ="Body Part: " + body_part;
document.getElementById("admitting_diagnoses").textContent ="Admitting Diagnoses: " + admitting_diagnoses;

// Canvas
const canvas = document.getElementById("dicom_image");
const ctx = canvas.getContext("2d");
canvas.width = width;
canvas.height = heigth;
let currentImageData = null;
let scale = 1;
let originX = 0;
let originY = 0;

// Panning variables
let isDragging = false;
let x_move = 0;
let y_move = 0;

// Ruler Variables
let spacing_x = pixel_spacing[0];
let spacing_y = pixel_spacing[1];
let currentMeasurement = null;
let ruler_active = false;
let isDrawing = false;

// HU variables
let hu_active = false;
let current_hu = null;

// LUT varibles
let lut_active = false;

// ROI variables
let roi_active = false;
let current_roi = null;
let isArc = false;
let roi_values = null;
let metrics = null;
let finish_draw = true;

let current_slice_hu = decodeHUFromBase64(pixel_array_b64);

let windowing_slice = applyWindowingAndDisplay(input_wc, input_ww);

// LUT btn
document.getElementById("lut-btn").addEventListener("click", function(){
    lut_active = true;
    this.classList.toggle("active-btn");
    updateWindowing();

    if(!this.classList.contains("active-btn")) {
        lut_active = false;
        updateWindowing();
    }

});

// ROI btn
document.getElementById("roi_btn").addEventListener("click", function() {
    isDragging = false;
    ruler_active = false;
    hu_active = false;
    document.getElementById("ruler_btn").classList.remove("active-btn");
    document.getElementById("info_ruler_container").style.display = "none";
    currentMeasurement = null;
    document.getElementById("hu_btn").classList.remove("active-btn");
    document.getElementById("info_probe_container").style.display = "none";
    current_hu = null;

    roi_active = true;
    dicom_image.style.cursor = "default";
    this.classList.toggle("active-btn");
    renderImage();

    // Check if it's not active-btn
    if(!this.classList.contains("active-btn")) {
        roi_active = false;
        current_roi = null;
        if(scale != 1) {
            isDragging = true;
        }
        document.getElementById("info_roi_container").style.display = "none";
        renderImage();
        return;
    }
});

// HU btn
document.getElementById("hu_btn").addEventListener("click", function() {
    isDragging = false;
    ruler_active = false;
    document.getElementById("ruler_btn").classList.remove("active-btn");
    document.getElementById("info_ruler_container").style.display = "none";
    currentMeasurement = null;
    roi_active = false;
    document.getElementById("roi_btn").classList.remove("active-btn");
    document.getElementById("info_roi_container").style.display = "none";
    current_roi = null;

    hu_active = true;
    dicom_image.style.cursor = "default";
    this.classList.toggle("active-btn");
    renderImage();

    // Check if it's not active-btn
    if(!this.classList.contains("active-btn")) {
        hu_active = false;
        current_hu = null;
        if(scale != 1) {
            isDragging = true;
        }
        document.getElementById("info_probe_container").style.display = "none";
        renderImage();
        return;
    }
});

// Ruler btn
document.getElementById("ruler_btn").addEventListener("click", function() {
    // Stop panning
    isDragging = false;
    hu_active = false;
    document.getElementById("hu_btn").classList.remove("active-btn");
    document.getElementById("info_probe_container").style.display = "none";
    current_hu = null;
    roi_active = false;
    document.getElementById("roi_btn").classList.remove("active-btn");
    document.getElementById("info_roi_container").style.display = "none";

    current_roi = null;

    // Start ruler
    ruler_active = true;
    dicom_image.style.cursor = "default";
    this.classList.toggle("active-btn")

    renderImage();

    // Check if it's not active-btn
    if(!this.classList.contains("active-btn")) {
        ruler_active = false;
        currentMeasurement = null;
        current_hu = null;
        document.getElementById("info_ruler_container").style.display = "none";
        if(scale != 1) {
            isDragging = true;
        }
        renderImage();
        return;
    }
});

// Get real coordenates on canvas
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    
    const contentRatio = canvas.width / canvas.height;
    const containerRatio = rect.width / rect.height;
    
    let actualWidth, actualHeight, offsetX = 0, offsetY = 0;

    if (containerRatio > contentRatio) {
        actualHeight = rect.height;
        actualWidth = actualHeight * contentRatio;
        offsetX = (rect.width - actualWidth) / 2;
    } 
    else {
        actualWidth = rect.width;
        actualHeight = actualWidth / contentRatio;
        offsetY = (rect.height - actualHeight) / 2;
    }

    const visualX = (e.clientX - rect.left - offsetX);
    const visualY = (e.clientY - rect.top - offsetY);

    const scaleX = canvas.width / actualWidth;
    const scaleY = canvas.height / actualHeight;

    return {
        x: visualX * scaleX,
        y: visualY * scaleY
    };
}

canvas.addEventListener("mousedown", function(e) {
    const mouse = getMousePos(e);

    if(ruler_active) {
        currentMeasurement = null;
        document.getElementById("info_ruler_container").style.display = "none";

        renderImage();

        isDrawing = true;

        currentMeasurement = {
            x1: (mouse.x - originX) / scale,
            y1: (mouse.y - originY) / scale,
            x2: (mouse.x - originX) / scale,
            y2: (mouse.y - originY) / scale
        };
    }
    else if(hu_active) {
        current_hu = null;
        document.getElementById("info_probe_container").style.display = "none";

        let x = Math.floor((mouse.x - originX) / scale);
        let y = Math.floor((mouse.y - originY) / scale);

        const index = (y * width) + x;
        hu_value = current_slice_hu[index];

        current_hu = {
            x: x,
            y: y,
            value: hu_value
        }

        renderImage();
        
    }
    else if (roi_active) {
        current_roi = null;
        document.getElementById("info_roi_container").style.display = "none";

        renderImage();

        isArc = true;
        finish_draw = false;

        let centerX = (mouse.x - originX) / scale;
        let centerY = (mouse.y - originY) / scale;

        current_roi = {
            centerX: centerX,
            centerY: centerY,
            radio: 0
        }

    }
    else if (scale > 1) {
        // Panning
        isDragging = true;
        hu_active = false;

        x_move = mouse.x;
        y_move = mouse.y;

        canvas.style.cursor = 'grabbing';
    }
});

canvas.addEventListener("mousemove", function(e) {
    const mouse = getMousePos(e);

    if(ruler_active && isDrawing) {
        // Ruler
        currentMeasurement.x2 = (mouse.x - originX) / scale;
        currentMeasurement.y2 = (mouse.y - originY) / scale;

        renderImage();
    }
    else if(isDragging) {
        // Panning
        let deltax = mouse.x - x_move;
        let deltay = mouse.y - y_move;

        x_move = mouse.x;
        y_move = mouse.y;

        originX += deltax;
        originY += deltay;

        // Control de fronteras X
        if (originX > 0) originX = 0;
        let limiteX = canvas.width - (width * scale);
        if (originX < limiteX) originX = limiteX;

        // Control de fronteras Y
        if (originY > 0) originY = 0;
        let limiteY = canvas.height - (heigth * scale);
        if (originY < limiteY) originY = limiteY;

        constrainBoundaries()
        renderImage();
    } 
    else if(roi_active && isArc) {
        let finalX = (mouse.x - originX) / scale;
        let finalY = (mouse.y - originY) / scale;

        const radio = Math.sqrt(((finalX - current_roi.centerX) * spacing_x) ** 2 + ((finalY - current_roi.centerY) * spacing_y) ** 2);

        current_roi.radio = Math.floor(radio);

        renderImage();
    }
});

canvas.addEventListener("mouseup", function() {
    if(ruler_active) {
        // Ruler
        isDrawing = false;
    }
    else if(roi_active) {
        metrics = calculateROIMetrics(current_roi);
        finish_draw = true;
        renderImage();
        isArc = false;

    }
    else {
        // Panning
        isDragging = false;
        canvas.style.cursor = 'crosshair'
    }
});

// Obtain real mouse coordenates
function canvasToScreenPos(canvasX, canvasY) {
    const rect = canvas.getBoundingClientRect();
    
    const transformedX = (canvasX * scale) + originX;
    const transformedY = (canvasY * scale) + originY;

    const contentRatio = canvas.width / canvas.height;
    const containerRatio = rect.width / rect.height;
    
    let actualWidth, actualHeight, offsetX = 0, offsetY = 0;
    if (containerRatio > contentRatio) {
        actualHeight = rect.height;
        actualWidth = actualHeight * contentRatio;
        offsetX = (rect.width - actualWidth) / 2;
    } else {
        actualWidth = rect.width;
        actualHeight = actualWidth / contentRatio;
        offsetY = (rect.height - actualHeight) / 2;
    }

    const screenX = (transformedX * (actualWidth / canvas.width)) + rect.left + offsetX;
    const screenY = (transformedY * (actualHeight / canvas.height)) + rect.top + offsetY;

    return { x: screenX, y: screenY };
}

// Calculate ROI metrics
function calculateROIMetrics(roi) {

    if (!roi || roi.radio <= 0) {
        return { mean: 0, min: 0, max: 0, area: 0 };
    }
    
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;

    // Determinamos los límites de la caja que contiene al círculo
    const startX = Math.floor(roi.centerX - roi.radio);
    const endX = Math.ceil(roi.centerX + roi.radio);
    const startY = Math.floor(roi.centerY - roi.radio);
    const endY = Math.ceil(roi.centerY + roi.radio);

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            // Verificar que el píxel esté dentro de la imagen
            if (x >= 0 && x < width && y >= 0 && y < heigth) {
                
                // Teorema de Pitágoras: ¿Está el píxel dentro del círculo?
                const dx = x - roi.centerX;
                const dy = y - roi.centerY;
                if (dx * dx + dy * dy <= roi.radio * roi.radio) {
                    
                    const val = current_slice_hu[y * width + x];
                    
                    sum += val;
                    if (val < min) min = val;
                    if (val > max) max = val;
                    count++;
                }
            }
        }
    }

    return {
        mean: (sum / count).toFixed(2),
        min: min,
        max: max,
        area: (count * spacing_x * spacing_y).toFixed(2) // Area en mm²
    };
}

// Draw ROI
function draw_roi() {
    if (!current_roi) return;
    ctx.save();
    
    // 4. Dibujar el círculo
    ctx.beginPath();
    ctx.arc(current_roi.centerX, current_roi.centerY, current_roi.radio, 0, 2 * Math.PI); 
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    if(finish_draw) {
        const unit = (data.modality === "CT") ? "HU" : "val";
        
        // Creamos un array de strings para manejar las líneas
        const lines = [
            `Max: ${metrics.max} ${unit}`,
            `Min: ${metrics.min} ${unit}`,
            `Mean: ${metrics.mean} ${unit}`,
            `Area: ${metrics.area} mm²`
        ];

        let real_metrics = canvasToScreenPos(current_roi.centerX, current_roi.centerY - current_roi.radio);

        document.getElementById("info_roi_container").style.display = "block";
        document.getElementById("info_roi_container").style.top = (real_metrics.y - 70) + "px";
        document.getElementById("info_roi_container").style.left = (real_metrics.x -60) + "px";
        document.getElementById("info_roi_container").style.color = "#0ff";
        const children = document.getElementById("info_roi_container").children;

        for(let i = 0; i < lines.length; i++) {
            children[i].textContent = lines[i];
        }

    }

    ctx.restore();
}
// Draw hu probe
function draw_hu() {
    ctx.save();

    const unit = (data.modality === "CT") ? "HU" : "val";
    const text = `${current_hu.value} ${unit}`;

    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    ctx.moveTo(current_hu.x - 3 / scale, current_hu.y);
    ctx.lineTo(current_hu.x + 3 / scale, current_hu.y);
    ctx.moveTo(current_hu.x, current_hu.y - 3 / scale);
    ctx.lineTo(current_hu.x, current_hu.y + 3 / scale);
    ctx.stroke();

    let real_metrics = canvasToScreenPos(current_hu.x, current_hu.y);

    document.getElementById("info_probe_container").style.display = "block";
    document.getElementById("info_probe_container").style.top = (real_metrics.y - 40) + "px";
    document.getElementById("info_probe_container").style.left = (real_metrics.x - 40) + "px";
    document.getElementById("info_probe_container").style.color = "#0f0";
    document.getElementById("info_probe_container").textContent = text;

    ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2) {
    // 1. Cálculo de distancia real (en mm)
    const distance = Math.sqrt(((x2 - x1) * spacing_x) ** 2 + ((y2 - y1) * spacing_y) ** 2);
    const distStr = distance.toFixed(2) + " mm";

    // 2. Configuración de estilo y guardado de estado
    ctx.save(); // Guardamos el estado para no afectar otros dibujos
    
    // Dibujamos la línea primero (sin sombras)
    ctx.beginPath();
    ctx.strokeStyle = "#ff0";
    ctx.lineWidth = 2 / scale; // Grosor constante aunque haya zoom
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    let real_metrics = canvasToScreenPos(x2, y2);

    document.getElementById("info_ruler_container").style.display = "block";
    document.getElementById("info_ruler_container").style.top = (real_metrics.y + 5) + "px";
    document.getElementById("info_ruler_container").style.left = (real_metrics.x + 10) + "px";
    document.getElementById("info_ruler_container").textContent = distStr;

    ctx.restore(); // Restauramos el estado original del canvas
}


// Export btn functionality
document.getElementById("export_btn").addEventListener("click", function(event) {
    const current_slice = parseInt(document.getElementById("slice").value);
    const current_wc = parseFloat(input_wc_el.value);
    const current_ww = parseFloat(input_ww_el.value);

    exportView(current_slice, current_ww, current_wc);
});

// Zoom in btn functionality
document.getElementById("zoom_in-btn").addEventListener("click", function(){
    const zoomFactor = 1.2;
    const nextScale = scale * zoomFactor;

    if (nextScale <= 10) {
        // Punto de referencia: Centro del canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Ajustamos el origen para que el zoom sea hacia el centro
        originX = centerX - (centerX - originX) * zoomFactor;
        originY = centerY - (centerY - originY) * zoomFactor;
        
        scale = nextScale;
        constrainBoundaries()
        renderImage();
    }
});

// Zoom out btn functionality
document.getElementById("zoom_out-btn").addEventListener("click", function(){
    const zoomFactor = 1 / 1.2;
    const nextScale = scale * zoomFactor;

    if (nextScale >= 1) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        originX = centerX - (centerX - originX) * zoomFactor;
        originY = centerY - (centerY - originY) * zoomFactor;

        scale = nextScale;
    } else {
        // Si bajamos de 1, reseteamos a la vista original
        scale = 1;
        originX = 0;
        originY = 0;
    }
    constrainBoundaries()
    renderImage();
});

// Reset btn functionality
document.getElementById("reset-btn").addEventListener("click", function(){
    scale = 1;
    originX = 0;
    originY = 0;
    
    input_wc_el.value = 500;
    input_ww_el.value = 2000;
    value_wc.value = 500;
    value_ww.value = 200;

    document.getElementById("info_roi_container").style.display = "none";
    document.getElementById("info_ruler_container").style.display = "none";
    document.getElementById("info_probe_container").style.display = "none";


    if(lut_active) {
        lut_active = false;
        document.getElementById("lut-btn").classList.toggle("active-btn");
    }
    if(ruler_active) {
        currentMeasurement = null
        ruler_active = false;
        document.getElementById("ruler_btn").classList.toggle("active-btn");
    }
    if(hu_active) {
        current_hu = null;
        hu_active = false;
        document.getElementById("hu_btn").classList.toggle("active-btn");
    }
    if(roi_active) {
        roi_active = false;
        current_roi = null;
        document.getElementById("roi_btn").classList.toggle("active-btn");
    }

    updateWindowing();
});

// Wheel event
canvas.addEventListener('wheel', function(e) {
    e.preventDefault();

    const zoomSpeed = 0.1; 
    const direction = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = 1 + (direction * zoomSpeed);

    let mouse = getMousePos(e)

    if (!(scale <= 1 && direction === -1)) {
        originX = mouse.x - (mouse.x - originX) * zoomFactor;
        originY = mouse.y - (mouse.y - originY) * zoomFactor;
        scale *= zoomFactor;
    }

    if (scale <= 1) {
        scale = 1;
        originX = 0;
        originY = 0;
    }
    
    if (scale > 10) scale = 10;

    renderImage();

}, { passive: false });

// Change inputs value and apply windowing
document.getElementById("slice").addEventListener("input", function() {
    value_slice.textContent = this.value;
    let index_int = parseInt(this.value)
    getNewSlice(index_int);
});

document.getElementById("window_center").addEventListener("input", function() {
    value_wc.textContent = this.value;
    updateWindowing();
});

document.getElementById("window_width").addEventListener("input", function() {
    value_ww.textContent = this.value;
    updateWindowing();
});

// Center the image after zoom
function constrainBoundaries() {
    const scaledWidth = width * scale;
    const scaledHeight = heigth * scale;

    if (scaledWidth <= canvas.width) {
        originX = (canvas.width - scaledWidth) / 2; 
    } else {
        if (originX > 0) originX = 0;
        let limiteX = canvas.width - scaledWidth;
        if (originX < limiteX) originX = limiteX;
    }

    if (scaledHeight <= canvas.height) {
        originY = (canvas.height - scaledHeight) / 2; 
    } else {
        if (originY > 0) originY = 0;
        let limiteY = canvas.height - scaledHeight;
        if (originY < limiteY) originY = limiteY;
    }
}

// Decode HU from base64
function  decodeHUFromBase64(base64String) {
    const pixel_array_bytes = atob(base64String);
    const array_buffer = new ArrayBuffer(pixel_array_bytes.length);
    const pixel_array_uint8 = new Uint8Array(array_buffer);

    for(let i = 0; i < pixel_array_bytes.length; i++) {
        pixel_array_uint8[i] = pixel_array_bytes.charCodeAt(i);
    }

    const pixel_array_hu = new Int16Array(array_buffer);

    return pixel_array_hu;
}

// Apply Windowing
function applyWindowingAndDisplay(wc, ww) {
    const window_min = wc - ww / 2;
    const window_max = wc + ww / 2;

    const imageData = ctx.createImageData(width, heigth);
    const pixelData = imageData.data;

    let intensity_gray;

    for(let i = 0; i < current_slice_hu.length; i++) {

        if(current_slice_hu[i] <= window_min) {
            intensity_gray = 0;
        }
        else if(current_slice_hu[i] >= window_max) {
            intensity_gray = 255;
        }
        else {
            intensity_gray = Math.round(
                ((current_slice_hu[i] - (wc- ww / 2)) / ww) * 255
            );
        }

        if(lut_active) {
            intensity_gray = 255 - intensity_gray;
        }

        const index = i * 4;

        pixelData[index] = intensity_gray; // R
        pixelData[index + 1] = intensity_gray; // G
        pixelData[index + 2] = intensity_gray; // B
        pixelData[index + 3] = 255; // A
    }

    currentImageData = imageData;
    constrainBoundaries();
    renderImage();
}

// Update windowing
function updateWindowing() {
    const wc = parseFloat(input_wc_el.value);
    const ww = parseFloat(input_ww_el.value);

    if(ww == 0) {
        return;
    }

    applyWindowingAndDisplay(wc, ww);
}

// Show image
function renderImage() {
    if(!currentImageData) return;

    // Clean canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save()

    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = heigth;
    tempCanvas.getContext("2d").putImageData(currentImageData, 0 , 0);

    ctx.drawImage(tempCanvas, 0 ,0);

    if(currentMeasurement) {
        if(!(currentMeasurement.x1 - currentMeasurement.x2 == 0)) {
            drawLine(ctx, currentMeasurement.x1, currentMeasurement.y1, currentMeasurement.x2, currentMeasurement.y2);
        }
    }

    if(current_hu) {
        draw_hu();
    }

    if(current_roi) {
        if (current_roi.radio > 1) {
            draw_roi();
        }
    }

    //  R, G, B from first pixel (index 0, 1, 2)
    const r = currentImageData.data[0];
    const g = currentImageData.data[1];
    const b = currentImageData.data[2];
    
    document.getElementById("container-total").style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    ctx.restore();
}

async function getNewSlice(slice_index) {
    try {
        const response = await fetch("/get_slice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                session_id: session_id,
                slice_index: slice_index
            })
        });

        if(!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();

        if(result.success) {
            const new_hu_array = decodeHUFromBase64(result.slice_b64);
            current_slice_hu = new_hu_array;
            updateWindowing();
        }
        else {
            document.querySelector("#error").textContent = result.error;
        }
    }
    catch(error) {
        console.error("Error fetching new slice:", error);
        document.querySelector("#error").textContent = `Error fetching slice: ${error.message}`;
    }
}

// Export as PNG
async function exportView(slice, ww, wc) {
    const export_data = {
        session_id: session_id,
        current_slice: slice,
        wc: wc,
        ww: ww
    };

    try {
        const response = await fetch("/export", {
            method: "POST",
            headers: {
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(export_data)
        });

        if (response.ok) {
            alert("Export successful. Check your exports folder.");
        } 
        else {
            const result = await response.json();

            if (result && result.error) {
                alert(`Export error: ${result.error}`);
            } 
            else {
                 alert(`Export error: Server returned status ${response.status}.`);
            }
        }
    }
    catch (error) {
        console.error("Error during export:", error);
        alert("Server connection error.");
    }
}