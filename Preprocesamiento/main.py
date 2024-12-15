import os
import cv2
import json
from ultralytics import YOLO

# Configuraciones iniciales
video_path = 'VIRAT_S_000201_02_000590_000623.mp4'
model_path = 'yolov8s.pt'
output_folder = 'imagenesbox'
metadata_file = 'metadata4.json'

# Crear carpeta de salida si no existe
os.makedirs(output_folder, exist_ok=True)

# Cargar el modelo YOLO
model = YOLO(model_path)

# Abrir el video
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    raise Exception(f"No se pudo abrir el video: {video_path}")

# Variables
fps = int(cap.get(cv2.CAP_PROP_FPS))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames // fps
metadata = {}

# Diccionario para rastrear objetos y asignarles una etiqueta única
object_ids = {}

# Función para generar un identificador único para cada objeto
def generate_object_id(cls, x1, y1, x2, y2):
    # Usamos las coordenadas y la clase para generar un ID único
    return f"{cls}_{x1}_{y1}_{x2}_{y2}"

# Procesar cada segundo del video
for second in range(duration):
    frame_index = second * fps
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()

    if not ret:
        print(f"No se pudo leer el cuadro en el segundo {second}.")
        continue

    # Realizar la detección con YOLO
    results = model(frame)

    # Dibujar los cuadros detectados en la imagen
    detections = []
    for result in results[0].boxes:
        x1, y1, x2, y2 = map(int, result.xyxy[0])
        conf = float(result.conf[0])
        cls = int(result.cls[0])
        label = model.names[cls]

        # Generar un ID único para el objeto
        object_id = generate_object_id(label, x1, y1, x2, y2)

        # Si el objeto no ha sido detectado antes, asignarle un nuevo ID
        if object_id not in object_ids:
            object_ids[object_id] = label

        # Dibujar el cuadro y la etiqueta en la imagen
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{object_ids[object_id]} {conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Guardar metadata de la detección
        detections.append({
            'object_id': object_id,
            'label': object_ids[object_id],
            'confidence': conf,
            'box': [x1, y1, x2, y2]
        })

    # Guardar la imagen procesada
    output_image_path = os.path.join(output_folder, f'frame_{second}.jpg')
    cv2.imwrite(output_image_path, frame)

    # Guardar metadata del cuadro
    metadata[f'frame_{second}'] = detections

# Guardar metadata en un archivo JSON
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=4)

cap.release()
print(f"Procesamiento completado. Las imágenes se guardaron en '{output_folder}' y la metadata en '{metadata_file}'.")
