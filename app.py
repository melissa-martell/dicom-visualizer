from flask import Flask, session, request, render_template
from flask_session import Session
import os
from dicom import DicomProcessor, _get_downloads_folder, bytes_to_base64
import secrets

# Configure application
app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

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
                slice_index = 0
                processed_image = processor.process_slice_to_image(slice_index=slice_index)

                img_str = bytes_to_base64(processed_image)

                 # GUARDAR EN SESIÓN (clave para exportar después)
                session['dicom_filepath'] = filepath
                session['original_filename'] = dicom_file.filename
                session['total_slices'] = int(processor.get_total_slices())

                return render_template("viewer.html", image_data=img_str, filename=dicom_file.filename, total_slices=session['total_slices'])
            else:
                return render_template("error.html", error_name="Could not read file")

        finally:
            pass
    else:
        return render_template("upload.html")


@app.route("/export", methods=["POST"])
def export():
    if 'dicom_filepath' not in session:
        return "Please upload a DICOM file first", 400
    
    session['slice_index'] = int(request.form.get('slice_index'))
    session['window_center'] = int(request.form.get('window_center'))
    session['window_width'] = int(request.form.get('window_width'))

    filepath = session['dicom_filepath']

     # Verificar que el archivo todavía existe
    if not os.path.exists(filepath):
        session.clear()  # Limpiar sesión obsoleta
        return "Your upload expired. Please upload again.", 400
    
     # Crear NUEVO processor (no usar el viejo)
    processor = DicomProcessor(filepath)
    if not processor.load_dicom():
        return "Error loading DICOM file", 500
    
    # Llamar a export_to_downloads
    export_path = processor.export_to_downloads(
        slice_index=session['slice_index'],
        window_center=session['window_center'],  # O usa valores de la sesión si tienes
        window_width=session['window_width']
    )

    return True