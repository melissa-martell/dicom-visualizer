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
async function dropHandler(ev) {
    console.log("Dragged files...");
    let file = null;

    ev.preventDefault();

    if (ev.dataTransfer.items) {
      for (let i = 0; i < ev.dataTransfer.items.length; i++) {
        if (ev.dataTransfer.items[i].kind === "file") {
          file = ev.dataTransfer.items[i].getAsFile();
        }
      }
    } 
    else {
      for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        let file = ev.dataTransfer.files[i];
      }
    }

    if (!file) {
        document.querySelector("#error").textContent = "Please select a DICOM file";
        return;
    }
    
    fetchFile(file);

    removeDragData(ev);
}

function dragOverHandler(ev) {
  console.log("File(s) in drop zone");

  ev.preventDefault();
}

function removeDragData(ev) {
  console.log("Removing drag data");

  if (ev.dataTransfer.items) {
    ev.dataTransfer.items.clear();
  } else {
    ev.dataTransfer.clearData();
  }
}