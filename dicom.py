# Import libraries
import pydicom
import numpy as np
from PIL import Image
import os
from pathlib import Path
import time

class DicomProcessor:
    def __init__(self, route):
        self.route = route
        self.dicom_file = None
        self.pixel_array = None

    # Load the DICOM file
    def load_dicom(self):
        try:
            self.dicom_file = pydicom.dcmread(self.route)
            self.pixel_array = self.dicom_file.pixel_array
            self.anonymize_dicom()
            return True
        except:
            if self.dicom_file:
                try:
                    # Si falla, intenta con pillow si está disponible
                    if hasattr(self.dicom_file, 'PixelData'):
                        # Esto funciona para algunos formatos
                        self.dicom_file.decompress()
                        self.pixel_array = self.dicom_file.pixel_array
                        self.anonymize_dicom()
                        return True
                except Exception as e2:
                     print(f"Decompretion error: {e2}")
        return False
    
    def anonymize_dicom(self):
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
            if tag in self.dicom_file:
                self.dicom_file[tag].value = 'ANONYMOUS'

        print("Datos del paciente anonimizados")
        return True

    # Get the asked slice
    def get_slice(self, slice_index = 0):

        if self.pixel_array is None:
            print("Error: DICOM no cargado")
            return None
        
        # 3D: (slices, height, width)
        if len(self.pixel_array.shape) == 3:
            total_slices = self.pixel_array.shape[0]

            if slice_index < 0 or slice_index >= total_slices:
                print(f"Error: slice_index {slice_index} out of range [0, {total_slices-1}]")
                return None

            return self.pixel_array[slice_index]
        
        # 2D: (height, width)  
        elif len(self.pixel_array.shape) == 2:
            return self.pixel_array
        
        else:
           print(f"Format not supported: shape {self.pixel_array.shape}")
           return None
        
    def get_total_slices(self):
        if self.pixel_array is None:
            print("Error: DICOM no cargado")
            return None
        
        if len(self.pixel_array.shape) == 3:
            return self.pixel_array.shape[0]

        elif len(self.pixel_array.shape) == 2:
            return 1

        
    def process_slice_to_image(self, slice_index=0, window_center=None, window_width=None):  
        slice_data = self.get_slice(slice_index)

        if slice_data is None:
            print("Error: DICOM no cargado")
            return None
        
        if window_center is not None and window_width is not None:
             # Use medical windowing
            processed = self.apply_windowing(slice_data, window_center, window_width)
        else:
            # General normalization
            try:
                # 1. Usar percentiles 5% y 95% para ignorar outliers extremos
                p5 = np.percentile(slice_data, 5)
                p95 = np.percentile(slice_data, 95)

                # 2. Calcular rango efectivo (donde está el 90% de los datos)
                effective_range = p95 - p5

                # 3. Si el rango es muy pequeño (imagen plana), expandirlo
                if effective_range < 100:
                    # Expandir para ver mejor contraste
                    min_val = p5 - (effective_range * 0.5)
                    max_val = p95 + (effective_range * 0.5)
                else:
                    min_val = p5
                    max_val = p95

                # 4. Normalizar con límites seguros
                if max_val - min_val < 1e-6:
                    max_val = min_val + 1

                # 5. Normalizar y aplicar curva gamma para mejor contraste
                normalized = (slice_data - min_val) / (max_val - min_val)

                # 6. Aplicar corrección gamma (1.5 = aumenta contraste medio)
                gamma = 1.5
                normalized = np.power(normalized, 1.0/gamma)

                # 7. Escalar a 0-255
                normalized = np.clip(normalized * 255, 0, 255)

                processed = normalized.astype(np.uint8)

            except Exception:
                # Fallback: normalización simple
                min_val = slice_data.min()
                max_val = slice_data.max()
                if max_val - min_val < 1e-6:
                    max_val = min_val + 1
                normalized = ((slice_data - min_val) / (max_val - min_val)) * 255

                processed = np.clip(normalized, 0, 255).astype(np.uint8)
            
        return Image.fromarray(processed, mode='L')

    def apply_windowing(self, slice_data, window_center, window_width):
        # 1. Calcular límites
        window_min = window_center - (window_width / 2)
        window_max = window_center + (window_width / 2)

        # 2. Recortar valores fuera de la ventana
        clipped = np.clip(slice_data, window_min, window_max)

        # 3. Normalizar solo lo que está dentro de la ventana
        normalized = ((clipped - window_min) / (window_width)) * 255

        # 4. Convertir a imagen
        uint8_array = normalized.astype(np.uint8)
        return uint8_array
    
    def get_data_info(self):
        if self.dicom_file is None:
            return {}
        
        info = {
            'image_size' : f"{self.dicom_file.get('Rows', 'N/A')}x{self.dicom_file.get('Columns', 'N/A')}",
            'slices' : self.get_total_slices(),
            'modality' : str(self.dicom_file.get("Modality", 'N/A')),
            'bits_stored' : str(self.dicom_file.get('BitsStored', 'N/A')),
        
            # Información del estudio (genérica)
            'study_description': str(self.dicom_file.get('StudyDescription', 'N/A'))[:50],  # Limitar longitud
            'series_description': str(self.dicom_file.get('SeriesDescription', 'N/A'))[:50],

            # Información técnica
            'pixel_spacing': str(self.dicom_file.get('PixelSpacing', 'N/A')),
            'slice_thickness': str(self.dicom_file.get('SliceThickness', 'N/A')),
        }

        return info

    def export_to_downloads(self, slice_index=0, window_center=None, window_width=None):
       
        # 1. Obtener imagen procesada
        image = self.process_slice_to_image(slice_index, window_center, window_width)
        if image is None:
            print("Error: No se pudo crear la imagen")
            return None

        # 2. Obtener ruta de la carpeta Downloads
        downloads_path = _get_downloads_folder()

        # 3. Crear nombre de archivo si no se proporciona
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"dicom_slice_{slice_index}_{timestamp}.png"

        # 4. Ruta completa
        full_path = os.path.join(downloads_path, filename)

        # 5. Guardar imagen
        try:
            image.save(full_path, format='PNG')
            print(f"✓ Imagen guardada en: {full_path}")
            return full_path
        except Exception as e:
            print(f"✗ Error guardando imagen: {e}")
            return None

def _get_downloads_folder():

    # Para Windows
    if os.name == 'nt':
        downloads = os.path.join(os.environ['USERPROFILE'], 'Downloads')
    # Para macOS/Linux
    else:
        downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
    # Crear carpeta si no existe
    os.makedirs(downloads, exist_ok=True)
    return downloads