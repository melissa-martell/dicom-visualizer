from flask import Flask, session, request, render_template, jsonify, send_file
from flask_session import Session
import pydicom
import helpers
import base64
import numpy as np
import os
import secrets
import io
import time

# Configure application
app = Flask(__name__)

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = secrets.token_hex(32)
Session(app)

# Global diccionary
hu_array = {}

    
@app.route("/", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        # Obtain the file
        dicom_file = request.files["dicom_file"]
        dicom_name = dicom_file.filename

        # Validate if the user input a file
        error_msg = helpers.validate_input(dicom_file)
        
        if error_msg:
            return jsonify({"success": False, "error": error_msg}), 500

        try:
            # Read dicom file
            dicom_data = pydicom.dcmread(dicom_file)
            # Anonymize dicom data
            helpers.anonymize_dicom(dicom_data)
            # Get dicom hu array
            pixel_array = dicom_data.pixel_array
            # Secret session id
            session_id = secrets.token_hex(32)
            
            # Verify slices of dicom file
            if len(pixel_array.shape) == 3:
                total_slices = pixel_array.shape[0]
                slice_index = 0
                first_slice = pixel_array[0]
            else:
                total_slices = 1
                slice_index = 0
                first_slice = pixel_array

            # Storage small data on session
            session["filename"] = dicom_name
            session["total_slices"] = total_slices
            session["slice_index"] = slice_index
            session["session_id"] = session_id

            # Storage uh values on global dictionary
            hu_array[session_id] = {
                                "pixel_array": pixel_array,
                                "filename": dicom_name,
                                "timestamp": time.time()
                                }

            # Convert npy array into int16
            int16_slice = first_slice.astype(np.int16)
            bytes_slice = int16_slice.tobytes()
            base64_slice = base64.b64encode(bytes_slice).decode("ascii")
            
            return jsonify({"success": True, 
                            "session_id": session_id,
                            "first_slice_b64": base64_slice,
                            "shape": first_slice.shape,
                            "dtype": "int16",
                            "filename": dicom_name,
                            "total_slices": total_slices
                            })

        except Exception as e:
            # Registrar el error en el servidor
            app.logger.error(f"Error processing DICOM file: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Could not process the DICOM file. Please ensure it is a valid DICOM file."
                }), 500
    else:
        return render_template("index.html")


#@app.route("/export", methods=["POST"])
#def export():
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



#@app.route("/generate_image", methods=["POST"])
#def generate_image():
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