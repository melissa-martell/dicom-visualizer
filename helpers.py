import base64
import numpy as np
from PIL import Image
import os
import uuid
import time

SESSION_TIMEOUT = 3600

def validate_input(dicom_file):
    error_msg = None

    if dicom_file.filename == '':
        error_msg = "Please select a DICOM file"
    elif not dicom_file.filename.lower().endswith('.dcm'):
        error_msg = "File must be .dcm format"
    
    return error_msg

def anonymize_dicom(dicom):
    tags_to_remove = [
        (0x0010, 0x0010),  # Patient Name
        (0x0010, 0x0020),  # Patient ID
        (0x0010, 0x0030),  # Patient Birth Date
        (0x0010, 0x0040),  # Patient Sex
        (0x0008, 0x0080),  # Institution Name
        (0x0008, 0x0090),  # Referring Physician
        (0x0008, 0x1050),  # Performing Physician
        (0x0008, 0x0081),  # Institution Address
    ]
    for tag in tags_to_remove:
        if tag in dicom:
            dicom[tag].value = 'ANONYMOUS'
    return True

def get_base64(array):
    int16_slice = array.astype(np.int16)
    bytes_slice = int16_slice.tobytes()
    base64_slice = base64.b64encode(bytes_slice).decode("ascii")
    
    return base64_slice        

def apply_windowing_and_save_png(current_hu_slice, wc, ww):
    window_min = wc - ww / 2.0
    window_max = wc + ww / 2.0

    hu_float = current_hu_slice.astype(np.float32)
    clamped_hu = np.clip(hu_float, window_min, window_max)
    normalized_slice = (clamped_hu - window_min) / ww
    final_grayscale_array = (normalized_slice * 255).astype(np.uint8)

    output_dir = os.path.join(os.getcwd(), 'exports')

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = f"export_{uuid.uuid4()}.png"
    output_path = os.path.join(output_dir, filename)

    img = Image.fromarray(final_grayscale_array, mode='L')

    img.save(output_path)
    
    return output_path

def cleanup_expired_sessions(hu_array):
    current_time = time.time()
    
    expired_sessions = []
    
    for session_id, session_data in hu_array.items():
        if current_time - session_data.get("timestamp", 0) > SESSION_TIMEOUT:
            expired_sessions.append(session_id)
            
    for session_id in expired_sessions:
        del hu_array[session_id]
        print(f"Cleaning session expired: {session_id}")