async function fetchFile(file) {
    const formData = new FormData();

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
}

// INPUT FILE
document.querySelector("#submit_btn").addEventListener("click", async function(event) {
    
    event.preventDefault();

    const Inputfile = document.querySelector("#dicom_file");
    const file = Inputfile.files[0];

    if (!file) {
        document.querySelector("#error").textContent = "Please select a DICOM file";
        return;
    }

    fetchFile(file);

});

// DRAG AND DROP FUNCTIONS
document.querySelector("#drop_zone").addEventListener("drop", async function(e) {
    let file = null;

    e.preventDefault();

    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === "file") {
          file = e.dataTransfer.items[i].getAsFile();
        }
      }
    } 
    else {
      for (var i = 0; i < e.dataTransfer.files.length; i++) {
        file = e.dataTransfer.files[i];
      }
    }

    if (!file) {
        document.querySelector("#error").textContent = "Please select a DICOM file";
        return;
    }
    
    fetchFile(file);

    removeDragData(e);
})

document.querySelector("#drop_zone").addEventListener("dragover", async function(e) {
    e.preventDefault();
});

function removeDragData(e) {
  console.log("Removing drag data");

  if (e.dataTransfer.items) {
    e.dataTransfer.items.clear();
  } 
  else {
    e.dataTransfer.clearData();
  }
}