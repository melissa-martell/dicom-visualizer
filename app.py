# test_dicom.py
import sys
import os

# Asegurar que encuentra tu módulo dicom.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar tu clase
from dicom import DicomProcessor

def test_all_functions():
    """
    Prueba todas las funciones de tu clase DicomProcessor
    """
    print("=" * 60)
    print("PRUEBA COMPLETA DE DICOM PROCESSOR")
    print("=" * 60)
    
    # 1. CREAR PROCESADOR
    print("\n1. CREANDO PROCESADOR...")
    # CAMBIA ESTA RUTA POR LA DE TU ARCHIVO REAL
    dicom_path = "static/data/dataset/series-000001/image-000001.dcm"
    
    # Verificar que el archivo existe
    if not os.path.exists(dicom_path):
        print(f"✗ ERROR: El archivo no existe: {dicom_path}")
        print("Por favor, cambia la variable 'dicom_path' en test_dicom.py")
        return False
    
    processor = DicomProcessor(dicom_path)
    print(f"✓ Procesador creado para: {dicom_path}")
    
    # 2. CARGAR DICOM
    print("\n2. CARGANDO DICOM...")
    if processor.load_dicom():
        print("✓ DICOM cargado exitosamente")
    else:
        print("✗ ERROR: No se pudo cargar el DICOM")
        return False
    
    # 3. INFORMACIÓN BÁSICA
    print("\n3. INFORMACIÓN DEL DICOM...")
    info = processor.get_data_info()
    if info:
        for key, value in info.items():
            print(f"  {key}: {value}")
        print("✓ Información obtenida")
    else:
        print("✗ ERROR: No se pudo obtener información")
    
    # 4. OBTENER SLICES
    print("\n4. PROBANDO GET_SLICE...")
    total_slices = processor.get_total_slices() if hasattr(processor, 'get_total_slices') else 1
    print(f"  Total slices detectados: {total_slices}")
    
    # Probar obtener primer slice
    slice_0 = processor.get_slice(0)
    if slice_0 is not None:
        print(f"✓ Slice 0 obtenido - Shape: {slice_0.shape}")
        print(f"  Tipo: {slice_0.dtype}, Rango: [{slice_0.min()} a {slice_0.max()}]")
    else:
        print("✗ ERROR: No se pudo obtener slice 0")
        return False
    
    # 5. PROCESAR IMAGEN SIN WINDOWING
    print("\n5. PROCESANDO IMAGEN (normalización básica)...")
    img_basic = processor.process_slice_to_image(0)
    if img_basic:
        print(f"✓ Imagen creada - Tamaño: {img_basic.size}, Modo: {img_basic.mode}")
        # Mostrar mini preview en terminal (opcional)
        # img_basic.thumbnail((100, 100))
        # img_basic.show()  # Descomentar para ver ventana
    else:
        print("✗ ERROR: No se pudo crear imagen básica")
    
    # 6. PROCESAR CON WINDOWING
    print("\n6. PROCESANDO CON WINDOWING...")
    
    # Probar diferentes presets médicos
    presets = [
        {"name": "Cerebro", "wc": 40, "ww": 80},
        {"name": "Pulmón", "wc": -600, "ww": 1500},
        {"name": "Hueso", "wc": 500, "ww": 2000},
    ]
    
    for preset in presets:
        img_windowed = processor.process_slice_to_image(
            0, 
            window_center=preset["wc"], 
            window_width=preset["ww"]
        )
        if img_windowed:
            print(f"✓ {preset['name']} (WC={preset['wc']}, WW={preset['ww']}) - OK")
        else:
            print(f"✗ {preset['name']} - Falló")
    
    # 7. PROBAR APPLY_WINDOWING DIRECTAMENTE
    print("\n7. PROBANDO APPLY_WINDOWING DIRECTAMENTE...")
    if hasattr(processor, 'apply_windowing'):
        slice_data = processor.get_slice(0)
        if slice_data is not None:
            windowed_array = processor.apply_windowing(slice_data, 40, 80)
            if windowed_array is not None:
                print(f"✓ Apply_windowing funcionó - Array shape: {windowed_array.shape}")
                print(f"  Rango resultante: [{windowed_array.min()} a {windowed_array.max()}]")
            else:
                print("✗ Apply_windowing falló")
        else:
            print("✗ No hay slice para probar apply_windowing")
    else:
        print("✗ apply_windowing no existe en la clase")
    
    # 8. EXPORTAR A DOWNLOADS
    print("\n8. EXPORTANDO A DOWNLOADS...")
    
    # Verificar si la función existe
    if hasattr(processor, 'export_to_downloads'):
        try:
            # Exportar imagen básica
            export_path = processor.export_to_downloads(slice_index=0)
            
            if export_path and os.path.exists(export_path):
                file_size = os.path.getsize(export_path) / 1024  # KB
                print(f"✓ Exportación exitosa!")
                print(f"  Archivo: {export_path}")
                print(f"  Tamaño: {file_size:.1f} KB")
                
            else:
                print("✗ La exportación falló o el archivo no se creó")
        except Exception as e:
            print(f"✗ Error durante exportación: {e}")
    else:
        print("✗ export_to_downloads no existe en la clase")
    
    # 9. PRUEBAS DE ERRORES
    print("\n9. PRUEBAS DE MANEJO DE ERRORES...")
    
    # Intentar slice fuera de rango
    invalid_slice = processor.get_slice(999)
    if invalid_slice is None:
        print("✓ Correctamente rechazó slice inválido")
    else:
        print("✗ Debería haber rechazado slice inválido")
    
    # Intentar procesar slice inválido
    invalid_image = processor.process_slice_to_image(999)
    if invalid_image is None:
        print("✓ Correctamente manejó slice inválido en process_slice_to_image")
    else:
        print("✗ Debería haber fallado con slice inválido")
    
    # 10. RESUMEN
    print("\n" + "=" * 60)
    print("RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    functions_to_check = [
        'load_dicom',
        'get_slice',
        'process_slice_to_image',
        'apply_windowing',
        'get_data_info',
        'export_to_downloads',
    ]
    
    all_ok = True
    for func_name in functions_to_check:
        if hasattr(processor, func_name):
            print(f"✓ {func_name}: Implementada")
        else:
            print(f"✗ {func_name}: FALTANTE")
            all_ok = False
    
    if all_ok:
        print("\n✅ ¡TODAS LAS FUNCIONES IMPLEMENTADAS!")
        print("Tu DicomProcessor está listo para usar.")
    else:
        print("\n⚠️  Algunas funciones faltan.")
        print("Revisa tu implementación en dicom.py")
    
    print("\nPrueba completada. Revisa tu carpeta Downloads para los archivos exportados.")
    return all_ok

if __name__ == "__main__":
    # Ejecutar todas las pruebas
    success = test_all_functions()
    
    # Esperar entrada del usuario antes de cerrar (solo en Windows)
    if os.name == 'nt':
        input("\nPresiona Enter para salir...")
    
    # Código de salida
    sys.exit(0 if success else 1)