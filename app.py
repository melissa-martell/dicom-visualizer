from flask import Flask, session, request, render_template, jsonify, send_file
from flask_session import Session
import os
from dicom import DicomProcessor, bytes_to_base64, _get_downloads_folder
import secrets
import io
import time

# Configure application
app = Flask(__name__)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = secrets.token_hex(32)
Session(app)

    
@app.route("/", methods=["GET", "POST"])
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
                return render_template("viewer.html", error="Could not read file")

        finally:
            pass
    else:
        return render_template("index.html")


@app.route("/export", methods=["POST"])
def export():
    if 'dicom_filepath' not in session:
        return "Please upload a DICOM file first", 400
    
    slice_index = int(request.form.get('slice_index', 0))
    ww = int(request.form.get('window_width', 2000))
    wc = int(request.form.get('window_center', 500))

    session['slice_index'] = slice_index
    session['window_center'] = wc
    session['window_width'] = ww

    filepath = session['dicom_filepath']

     # Verificar que el archivo todavía existe
    if not os.path.exists(filepath):
        session.clear()  # Limpiar sesión obsoleta
        return "Your upload expired. Please upload again.", 400
    
     # Crear NUEVO processor (no usar el viejo)
    processor = DicomProcessor(filepath)
    if not processor.load_dicom():
        return "Error loading DICOM file", 500
    
    image = processor.process_slice_to_image(
            slice_index=slice_index,
            window_center=wc,
            window_width=ww
        )
    
    # 2. Convertir a bytes
    img_bytes = io.BytesIO()
    image.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"dicom_slice_{slice_index}_{timestamp}.png"

    return send_file(
        img_bytes,
        mimetype='image/png',
        as_attachment=True,
        download_name=filename
    )



@app.route("/generate_image", methods=["POST"])
def generate_image():
    if 'dicom_filepath' not in session:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    
    # Obtain data from json
    try:
        data = request.get_json();
        
        slice_index = int(data.get("slice_index"))
        ww = int(data.get("window_width"))
        wc = int(data.get("window_center"))

        session["slice_index"] = slice_index
        session["window_width"] = ww
        session["window_center"] = wc

        processor = DicomProcessor(session["dicom_filepath"])

        if not processor.load_dicom():
            return jsonify({"success": False, "error": "Faild to load DICOM"}), 500
        
        # Verufy that slice exits
        total_slices = processor.get_total_slices()

        if session["slice_index"] >= total_slices or slice_index < 0:
            return jsonify({"success": False, 
                            "error": f"Slice {slice_index} out of range 0-{total_slices - 1}"
                            }), 400

        # Generate image with new parameters
        image = processor.process_slice_to_image(
            slice_index = slice_index, 
            window_center=wc, 
            window_width=ww
        )

        if image is None:
            return jsonify({'success': False, 'error': 'Failed to process image'}), 500
        
        img_str = bytes_to_base64(image)

        return jsonify({
            'success': True,
            'image_data': img_str,
            'slice_index': slice_index,
            'window_center': wc,
            'window_width': ww
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500