# DICOM VIEWER
#### Video Demo:  [<URL HERE>](https://youtu.be/6PkRmiOQzkk?si=VZOWX2vPH3Y4OVuG)
#### Description:
DICOM Web Viewer is a lightweight yet powerful platform that allows for the rapid upload, visualization, and manipulation of CT, MRI, and X-ray scans.

Unlike standard image viewers, this tool treats DICOM data as a mathematical array, preserving the 12-bit or 16-bit depth necessary for clinical accuracy. It is built to facilitate both qualitative reviews (looking at the image) and quantitative analysis (measuring the data).

Key Features
1. High-Performance Visualization
Dynamic Windowing (Level/Width): Real-time adjustment of contrast and brightness to highlight specific tissues (e.g., Bone windows vs. Lung windows).
Hardware Accelerated Rendering: Utilizes the HTML5 Canvas API and GPU-side calculations to ensure smooth zooming and panning, even with high-resolution matrices.
Progressive Slice Navigation: Seamless scrolling through volumetric datasets (CT/MRI stacks) with optimized memory management.

2. Quantitative Measurement Suite
Precision Digital Ruler: A calibrated tool that calculates real-world distances in millimeters by extracting the PixelSpacing and ImagerPixelSpacing metadata tags.
Hounsfield Unit (HU) Probe: For CT scans, the software provides point-of-interest density values, enabling the differentiation between air, water, fat, and bone.
Circular ROI (Region of Interest): Allows users to define an area to automatically calculate:
- Mean Density: The average value within the area.
- Min/Max Values: Identifying outliers and peaks.
- Area Calculation: Measured in mm^2 based on anatomical scaling.

3. Professional UX/UISmart 
Drag-and-Drop: A sleek, event-driven upload zone that validates files before processing.
Adaptive Display: An object-fit: contain logic that ensures the aspect ratio of the patient’s anatomy is never distorted, regardless of screen size.
Coordinate Synchronization: A proprietary coordinate mapping system that ensures HTML info-panels (DIVs) track perfectly with the Canvas-based anatomy during zoom and pan operations.

Technical Architecture
The system follows a modern Client-Server Architecture designed for low latency and high data integrity.Backend (Python/Flask) handles the heavy lifting of parsing binary DICOM data.
Pydicom Integration: Used to extract pixel data and metadata.
Numpy Processing: Pixel arrays are normalized and converted into efficient Base64 streams for transmission.
Session Management: Temporary storage of volumetric data to allow fast slice-switching without re-parsing the entire file.

Frontend 
Asynchronous Data Fetching: Uses the Fetch API to request slices in the background.
Coordinate Transformation Engine: A custom-built math engine that converts Screen Coordinates -> Canvas Coordinates -> DICOM Pixel Coordinates.
State Management: Tracks windowing parameters, zoom scales, and tool states (Ruler, ROI, Probe) to ensure a persistent and reactive interface.

Scientific Background:
Why this mattersThe Importance of Hounsfield UnitsIn Computed Tomography (CT), the pixels are not just colors; they are physical measurements of radiodensity. The software applies the Rescale Slope and Rescale Intercept. This allows the viewer to provide standardized values that are consistent across different scanner manufacturers.
Spatial Accuracy Medical errors can occur if measurements are taken on uncalibrated screens. This software eliminates that risk by strictly adhering to the DICOM Pixel Spacing attribute, which defines the physical distance between the center of each pixel. When a user draws a 10mm line, it represents exactly 10mm of patient tissue.

Installation & SetupTo run this project locally, follow these steps:
Clone the repository: git clone https://github.com/melissa-martell/dicom-viewer.git
cd dicom-viewer
Create a virtual environment:python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
Install dependencies: pip install flask pydicom numpy pillow
Run the application:python flask run

Access the viewer: Open your browser and navigate to http://127.0.0.1:5000.📖 User GuideUpload: Drag a .dcm file into the upload zone or use the file browser.
Navigation: Use the Slider to move through slices. Use the Mouse Wheel to zoom in on specific structures.
Windowing: Adjust the Window Center (WC) and Window Width (WW) inputs to optimize the contrast for bone or soft tissue.
Measurements:Click the Ruler button and drag on the image to measure distances.Click the ROI button to analyze a circular region.Use the HU Probe to see the density of any single point.
Reset: Use the Reset button to return to the original orientation and windowing.

hero index picture: Foto de Anna Shvets: https://www.pexels.com/es-es/foto/mano-doctor-senalando-medico-4226264/
picture 1 about: Foto de 8pCarlos Morocho: https://www.pexels.com/es-es/foto/medico-analizando-una-ecografia-en-el-monitor-de-la-computadora-35260790/
picture 2 about: Foto de Anna Shvets: https://www.pexels.com/es-es/foto/manos-imagen-sujetando-medicina-4226139/
picture 3 about: Foto de Antoni Shkraba Studio: https://www.pexels.com/es-es/foto/persona-que-usa-macbook-pro-en-mesa-blanca-5215005/
picture 4 about: Foto de cottonbro studio: https://www.pexels.com/es-es/foto/anatomia-huesos-examen-rayos-x-5723880/