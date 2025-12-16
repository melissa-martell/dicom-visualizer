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

// Add max atribute to slices
document.getElementById("slice").max = total_slices - 1;

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

let current_slice_hu = decodeHUFromBase64(pixel_array_b64);

let windowing_slice = applyWindowingAndDisplay(input_wc, input_ww);


// Export btn functionality
document.getElementById("export_btn").addEventListener("click", function(event) {
    event.preventDefault();
    const current_slice = parseInt(document.getElementById("slice").value);
    const current_wc = parseFloat(input_wc_el.value);
    const current_ww = parseFloat(input_ww_el.value);

    exportView(current_slice, current_ww, current_wc);
});

// Zoom in btn funcitionality
document.getElementById("zoom_in-btn").addEventListener("click", function(){
    scale *= 1.2;
    if(scale > 10) {
        scale = 10;
    }
    renderImage();
});

// Zoom out btn funcitionality
document.getElementById("zoom_out-btn").addEventListener("click", function(){
    scale /= 1.2;
    if(scale < 1.2) {
        scale = 1;
    }
    renderImage();
});

// Reset btn functionality
document.getElementById("reset-btn").addEventListener("click", function(){
    scale = 1;
    originX = 0;
    originY = 0;
    renderImage();
});

// Wheel event
canvas.addEventListener('wheel', function(e) {
    e.preventDefault();

    const zoomSpeed = 0.1; // Un poco más lento para mejor control
    const direction = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = 1 + (direction * zoomSpeed);

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Solo aplicamos la lógica de movimiento de origen si el zoom no está en el límite mínimo
    if (!(scale <= 1 && direction === -1)) {
        originX = mouseX - (mouseX - originX) * zoomFactor;
        originY = mouseY - (mouseY - originY) * zoomFactor;
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

// Panning
canvas.addEventListener("mousedown", function(e) {
    if(scale > 1) isDragging = true;

    const rect = canvas.getBoundingClientRect();
    x_move = e.clientX - rect.left;
    y_move = e.clientY - rect.top;

    canvas.style.cursor = 'grabbing'
});

canvas.addEventListener("mouseup", function(e) {
    isDragging = false;
    canvas.style.cursor = 'crosshair'
});

window.addEventListener("mousemove", function(e) {
    const rect = canvas.getBoundingClientRect();

    if(isDragging) {
        let deltax = (e.clientX - rect.left) - x_move;
        let deltay = (e.clientY - rect.top) - y_move;

        x_move = e.clientX - rect.left;
        y_move = e.clientY - rect.top;

        originX += deltax;
        originY += deltay;

        // Control de fronteras X
        if (originX > 0) originX = 0;
        let limiteX = canvas.width - (width * scale);
        if (originX < limiteX) originX = limiteX;

        // Control de fronteras Y
        if (originY > 0) originY = 0;
        let limiteY = canvas.width - (width * scale);
        if (originY < limiteY) originY = limiteY;

        renderImage();
    } 
});

// Change inputs value and apply windowing
document.getElementById("slice").addEventListener("input", function() {
    value_slice.textContent = this.value;
    let index_int = parseInt(this.value)
    // Logic to get new slice
    getNewSlice(index_int);
});

document.getElementById("window_center").addEventListener("input", function() {
    value_wc.textContent = this.value;
    // Logic to change windowing
    updateWindowing();
});

document.getElementById("window_width").addEventListener("input", function() {
    value_ww.textContent = this.value;
    // Logic to change windowing
    updateWindowing();
});

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

        const index = i * 4;

        pixelData[index] = intensity_gray; // R
        pixelData[index + 1] = intensity_gray; // G
        pixelData[index + 2] = intensity_gray; // B
        pixelData[index + 3] = 255; // A
    }

    currentImageData = imageData;
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
    ctx.clearRect(0, 0, canvas.width, canvas.heigth);
    ctx.save()

    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = heigth;
    tempCanvas.getContext("2d").putImageData(currentImageData, 0 , 0);

    ctx.drawImage(tempCanvas, 0 ,0);

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