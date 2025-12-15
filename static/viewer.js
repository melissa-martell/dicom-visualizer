// Real time values
const value_slice = document.getElementById("value_slice");
const value_wc = document.getElementById("value_wc");
const value_ww = document.getElementById("value_ww");

// Inputs
const input_slice = parseInt(document.getElementById("slice").value);
const input_wc_el = document.getElementById("window_center");
const input_ww_el = document.getElementById("window_width");
const input_wc = parseFloat(document.getElementById("window_center").value);
const input_ww = parseFloat(document.getElementById("window_width").value);

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

let current_slice_hu = decodeHUFromBase64(pixel_array_b64);

let windowing_slice = applyWindowingAndDisplay(input_wc, input_ww);

document.getElementById("export_btn").addEventListener("click", function(event) {
    event.preventDefault();
    const current_slice = parseInt(document.getElementById("slice").value);
    const current_wc = parseFloat(input_wc_el.value);
    const current_ww = parseFloat(input_ww_el.value);

    exportView(current_slice, current_ww, current_wc);
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

    ctx.putImageData(imageData, 0, 0);
}

function updateWindowing() {
    const wc = parseFloat(input_wc_el.value);
    const ww = parseFloat(input_ww_el.value);

    if(ww == 0) {
        return;
    }

    applyWindowingAndDisplay(wc, ww);
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

        const result = await response.json();

        if (result.success) {
            alert(`Successful export. ${result.message}`);
            // Opcional: Redirigir o descargar un archivo si Flask lo genera
        } else {
            alert(`Export error: ${result.error}`);
        }
    }
    catch (error) {
        console.error("Error during export:", error);
        alert("Server connection error.");
    }
}