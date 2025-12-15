from flask import Flask, session, request, render_template, jsonify, send_file
from flask_session import Session
import pydicom
import helpers
import secrets

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
        dicom_file = request.files.get("dicom_file")
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
            # Slice index
            slice_index = 0
            

            if len(pixel_array.shape) == 3:
                total_slices = pixel_array.shape[0]
                first_slice = pixel_array[0]
            else:
                total_slices = 1
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
                                }

            # Convert npy array into base64
            base64_slice = helpers.get_base64(first_slice)
            
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

@app.route("/viewer")
def viewer():
    return render_template("viewer.html", filename=session["filename"])

@app.route("/get_slice", methods=["POST"])
def get_slice():
    try:
        data = request.get_json()
        session_id = data.get("session_id")

        if session_id not in hu_array:
            return jsonify({"success": False,
                            "error": "Session expired. Please upload file again."
                            }), 400

        slice_index = data.get("slice_index")

        if slice_index < 0 or slice_index >= session["total_slices"]:
            return jsonify({"success": False,
                            "error": "Could not get slice index."
                            }), 400

        session_dict = hu_array[session_id]
        pixel_array = session_dict["pixel_array"]
        n_slice = pixel_array[slice_index]

        base64_slice = helpers.get_base64(n_slice)

        return jsonify({"success": True, 
                        "session_id": session_id,
                        "slice_index": slice_index,
                        "shape": n_slice.shape,
                        "dtype": "int16",
                        "slice_b64": base64_slice
                        })
    
    except Exception as e:
        return jsonify({"success": False,
                        "error": f"Internal server error: {str(e)}"
                        }), 500

@app.route("/export", methods=["POST"])
def export():
    try:
        data = request.get_json()
        session_id = data.get("session_id")

        if session_id not in hu_array:
            return jsonify({"success": False,
                            "error": "Session expired. Please upload file again."
                            }), 400

        slice_index = int(data.get("current_slice"))
        wc = float(data.get("wc"))
        ww = float(data.get("ww"))

        session_dict = hu_array[session_id]
        pixel_array = session_dict["pixel_array"]

        if len(pixel_array.shape) == 3:
            pixel_array = pixel_array[slice_index]

        helpers.apply_windowing_and_save_png(pixel_array, wc, ww)

        return jsonify({"success": True, 
                        "message": f"View parameters saved for slice {slice_index}."
                        })
    
    except Exception as e:
        app.logger.error(f"Error during export: {str(e)}")
        return jsonify({"success": False, "error": "Internal server error during export."}), 500
