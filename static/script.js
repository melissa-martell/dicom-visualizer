// Variables from the page
const value1 = document.querySelector("#value1");
const slice_index = document.querySelector("#slice");
const value2 = document.querySelector("#value2");
const window_center = document.querySelector("#window_center");
const value3 = document.querySelector("#value3");
const window_width = document.querySelector("#window_width");
const dicom_image = document.querySelector("#dicom_image");

// Generate de value on the scream
value1.textContent = slice_index.value;
value2.textContent = window_center.value;
value3.textContent = window_width.value;

slice_index.addEventListener("input", (event) => {
  value1.textContent = event.target.value;
  updateImage()
});
window_center.addEventListener("input", (event) => {
  value2.textContent = event.target.value;
  updateImage()
});
window_width.addEventListener("input", (event) => {
  value3.textContent = event.target.value;
  updateImage()
});

//Generate image on the scremm when changing the range values

// Variables para control de peticiones
let currentRequest = null;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms entre peticiones (evita saturar)

async function updateImage()
{
// Throttling: evitar peticiones demasiado frecuentes
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        return; // Esperar al menos MIN_REQUEST_INTERVAL ms entre peticiones
    }
    
    // Cancelar petición anterior si todavía está en progreso
    if (currentRequest) {
        // Podríamos cancelar con AbortController si quisiéramos
        return;
    }
    
    lastRequestTime = now;

    try
    {
        //Get current values
        const slice = slice_index.value;
        const ww = window_width.value;
        const wc = window_center.value;

        console.log("Updating image width values: ", {slice, ww, wc});

        //Send data to flask
        const response = await fetch("/generate_image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                slice_index: parseInt(slice),
                window_center: parseInt(wc),
                window_width: parseInt(ww)
            })
        });

        //Verify answer
        if(!response.ok)
        {
            throw new Error(`Error: ${response.status}`);
        }

        // Obtain Json data
        const data = await response.json();

        //Update image if succesfull
        if (data.success)
        {
            dicom_image.src = `data:image/png;base64,${data.image_data}`;
            console.log("Image updated successfully");
        }
        else
        {
            console.error("Backend error: ", data.error || "Unknown error");
            alert("Error generating image: " + (data.error || "Unknown error"));
        }
    }
    catch (error)
    {
        console.error("Fetch error details:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        alert("Failed to update image. Please check console for details.");
    }
    finally
    {
        currentRequest = null;
    }
}


