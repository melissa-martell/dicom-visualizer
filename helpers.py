import base64
import numpy as np

def validate_input(dicom_file):
    error_msg = None

    if dicom_file.filename == '':
        error_msg = "Please select a DICOM file"
    elif not dicom_file.filename.lower().endswith('.dcm'):
        error_msg = "File must be .dcm format"
    
    return error_msg

def anonymize_dicom(dicom):
     # Lista de tags a anonimizar (códigos DICOM)
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
        if tag in dicom.dicom_file:
            dicom.dicom_file[tag].value = 'ANONYMOUS'
    print("Datos del paciente anonimizados")
    return True

def get_base64(array):
    int16_slice = array.astype(np.int16)
    bytes_slice = int16_slice.tobytes()
    base64_slice = base64.b64encode(bytes_slice).decode("ascii")
    
    return base64_slice        