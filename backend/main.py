# main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from PIL import Image
import io
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def encode_image(image):
    """Convert an OpenCV image to base64 string"""
    _, buffer = cv2.imencode('.png', image)
    return f"data:image/png;base64,{base64.b64encode(buffer).decode()}"

def detect_staff_lines(binary_image):
    """Detect horizontal staff lines using horizontal projection"""
    # Get horizontal projection (sum of white pixels in each row)
    h_proj = np.sum(binary_image, axis=1)
    
    # Find peaks in projection (potential staff lines)
    peaks = []
    threshold = np.mean(h_proj) * 1.5
    
    for i in range(1, len(h_proj) - 1):
        if h_proj[i] > threshold and h_proj[i] >= h_proj[i-1] and h_proj[i] >= h_proj[i+1]:
            peaks.append(i)
    
    # Group peaks into staff systems
    staff_systems = []
    current_system = []
    
    for i in range(len(peaks)):
        if not current_system or peaks[i] - current_system[-1] < 50:  # Adjust threshold as needed
            current_system.append(peaks[i])
        else:
            if len(current_system) >= 4:  # Minimum lines for a staff
                staff_systems.append(current_system)
            current_system = [peaks[i]]
    
    if current_system and len(current_system) >= 4:
        staff_systems.append(current_system)
    
    return staff_systems

def detect_characters(binary_image, staff_systems):
    """Detect potential character regions between staff lines"""
    character_regions = []
    
    for system in staff_systems:
        # Get region between first and last line of staff
        top = max(0, system[0] - 20)
        bottom = min(binary_image.shape[0], system[-1] + 20)
        
        # Get connected components in this region
        region = binary_image[top:bottom, :]
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            region, connectivity=8
        )
        
        # Filter components based on size and shape
        for i in range(1, num_labels):  # Skip background label 0
            x, y, w, h, area = stats[i]
            
            # Basic filtering for character-like components
            if (10 < w < 50 and 10 < h < 50 and  # Size constraints
                0.2 < w/h < 5 and  # Aspect ratio
                area > 100):  # Minimum area
                character_regions.append({
                    'x': x,
                    'y': y + top,  # Adjust y to global coordinates
                    'width': w,
                    'height': h
                })
    
    return character_regions

@app.post("/api/process-manuscript/")
async def process_manuscript(file: UploadFile = File(...)):
    # Read uploaded file
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Adaptive thresholding
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15,
        C=2
    )
    
    # Detect staff lines
    staff_systems = detect_staff_lines(binary)
    
    # Detect potential characters
    character_regions = detect_characters(binary, staff_systems)
    
    # Create visualization image (copy of original with overlays)
    visualization = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    
    # Draw staff lines
    for system in staff_systems:
        for y in system:
            cv2.line(visualization, (0, y), (img.shape[1], y), (0, 255, 0), 1)
    
    # Draw character regions
    for char in character_regions:
        cv2.rectangle(
            visualization,
            (char['x'], char['y']),
            (char['x'] + char['width'], char['y'] + char['height']),
            (255, 0, 0),
            1
        )
    
    # Convert numpy values to regular Python types
    staff_systems_json = [[int(y) for y in system] for system in staff_systems]
    characters_json = [{
        'x': int(char['x']),
        'y': int(char['y']),
        'width': int(char['width']),
        'height': int(char['height'])
    } for char in character_regions]

    return {
        "processed_image": encode_image(binary),
        "visualization": encode_image(visualization),
        "staff_lines": staff_systems_json,
        "characters": characters_json
    }