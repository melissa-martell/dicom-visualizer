from flask import Flask, request, render_template
import os
import io
import base64
from dicom import DicomProcessor, _get_downloads_folder

# Configure application
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")
    
@app.route("/upload", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        # Obtain the file
        dicom_file = request.files["dicom_file"]

        # Validate if the user input a file
        error_msg = None
        
        if 'dicom_file' not in request.files:
            error_msg = "No file field in request"
        elif dicom_file.filename == '':
            error_msg = "Please select a DICOM file"
        elif not dicom_file.filename.lower().endswith('.dcm'):
            error_msg = "File must be .dcm format"
        
        if error_msg:
            return render_template("upload.html", error=error_msg)

        # Temporary storage to the archive
        filepath = os.path.join(_get_downloads_folder(), dicom_file.filename)
        dicom_file.save(filepath)

        try:
            processor = DicomProcessor(filepath)
            if processor.load_dicom():
                processed_image = processor.process_slice_to_image()

                buffered = io.BytesIO()
                processed_image.save(buffered, format="PNG")
                image_bytes = buffered.getvalue()
                img_str = base64.b64encode(image_bytes).decode('utf-8')
                
                return render_template("viewer.html", image_data=img_str)
            else:
                return render_template("error.html", error_name="Could not read file")

        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
    else:
        return render_template("upload.html")