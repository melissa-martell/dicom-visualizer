document.querySelector("#submit_btn").addEventListener("click", async function(event) {
    
    event.preventDefault();

    const formData = new FormData();
    const Inputfile = document.querySelector("#dicom_file");
    const file = Inputfile.files[0];

    if (!file) {
        document.querySelector("#error").textContent = "Please select a DICOM file";
        return;
    }

    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.dcm')) {
        document.querySelector("#error").textContent = "Please select a .dcm file";
        return;
    }

    formData.append("dicom_file", file);

    // Loading logic
    const loading = document.getElementById("loading_overlay");
    loading.classList.remove("loading_hidding");

    // Send data to server
    try{
        const response = await fetch("/", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if(data.success) {
            sessionStorage.setItem("dicom_data", JSON.stringify(data));
            loading.classList.add("loading_hidding");
            window.location.href = "/viewer";
        }
        else {
            document.querySelector("#error").textContent = data.error || "Upload failed";
            loading.classList.add("loading_hidding");
        }

    }
    catch(error) {
        document.querySelector("#error").textContent = `Error ${error}`;
    }

    
});

