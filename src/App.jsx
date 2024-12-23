import React, { useRef, useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const [metadata, setMetadata] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [lastFrame, setLastFrame] = useState(null);

  // Cargar metadata desde un archivo JSON
  const loadMetadata = async () => {
    const response = await fetch("/VIRAT_S_010003_03_000219_000259.json.json");
    const data = await response.json();
    setMetadata(data);
  };

  // Dibujar un punto con gradiente basado en la intensidad
  const drawHeatPoint = (ctx, x, y, intensity, color) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, intensity);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, intensity, 0, 2 * Math.PI);
    ctx.fill();
  };

  // Generar el mapa de calor acumulativo
  const generateHeatmap = () => {
    const heatmapCanvas = heatmapCanvasRef.current;
    const ctx = heatmapCanvas.getContext("2d");

    // Limpiar el canvas
    ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

    // Dibujar todas las posiciones acumuladas
    heatmapData.forEach(({ x, y, intensity, color }) => {
      drawHeatPoint(ctx, x, y, intensity, color);
    });
  };

  // Capturar el último frame del video y acumular datos para el heatmap
  const captureFrameAndHeatmap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const heatmapCanvas = heatmapCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const heatmapCtx = heatmapCanvas.getContext("2d");

    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;
    heatmapCanvas.width = width;
    heatmapCanvas.height = height;

    ctx.clearRect(0, 0, width, height);
    heatmapCtx.clearRect(0, 0, width, height);

    ctx.drawImage(video, 0, 0, width, height);
    setLastFrame(canvas.toDataURL());

    if (metadata) {
      const newHeatmapData = [];
      const frameIndices = Object.keys(metadata).sort((a, b) => parseInt(a) - parseInt(b));
      
      // Objeto para almacenar el historial de las posiciones de los objetos
      const objectHistory = {};
      const staticObjectCount = {}; // Contador para objetos estáticos

      frameIndices.forEach((frameIndex) => {
        const objects = metadata[frameIndex];

        objects.forEach(({ object_id, box }) => {
          if (!object_id) return;

          const [x1, y1, x2, y2] = box;
          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;
          const intensity = 30;

          // Determinar el color dependiendo si el objeto ha cambiado de posición
          let color = "rgba(255, 0, 0, 0.5)"; // Rojo por defecto (se mueve)
          
          if (objectHistory[object_id]) {
            const prevBox = objectHistory[object_id];
            
            // Compara las coordenadas del objeto en el frame actual con las anteriores
            const boxChanged = box.some((coord, index) => coord !== prevBox[index]);

            if (boxChanged) {
              color = "rgba(255, 0, 0, 0.5)"; // Rojo si el objeto se movió
            } else {
              // Si el objeto no cambió de posición, se mantiene azul
              color = "rgba(0, 0, 255, 0.5)"; // Azul si el objeto es estático

              // Solo dibujar objetos estáticos hasta 3 veces
              if (staticObjectCount[object_id]) {
                if (staticObjectCount[object_id] < 3) {
                  staticObjectCount[object_id] += 1;
                } else {
                  // No agregarlo más si ya ha sido dibujado 3 veces
                  return;
                }
              } else {
                staticObjectCount[object_id] = 1; // Primer dibujo del objeto estático
              }
            }
          }

          // Guardar la posición actual del objeto para la próxima comparación
          objectHistory[object_id] = [...box];

          // Acumular el rastro de calor para el mapa de calor
          newHeatmapData.push({
            x: centerX,
            y: centerY,
            intensity,
            color
          });
        });
      });

      // Establecer los nuevos datos del heatmap
      setHeatmapData(newHeatmapData);
    }
  };

  // Dibujar el heatmap cada vez que los datos cambien
  useEffect(() => {
    if (heatmapData.length > 0) {
      generateHeatmap();
    }
  }, [heatmapData]);

  // Cargar la metadata al inicio
  useEffect(() => {
    loadMetadata();
  }, []);

  return (
    <div className="app">
      <h1>Heatmap Video Analysis</h1>
      <div className="video-container">
        <video ref={videoRef} controls>
          <source src="/VIRAT_S_010003_03_000219_000259.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <button onClick={captureFrameAndHeatmap}>Generate Heatmap</button>
      </div>
      <div className="last-frame-container">
        {lastFrame && <img src={lastFrame} alt="Last frame" className="last-frame" />}
        <canvas ref={heatmapCanvasRef} className="heatmap-canvas"></canvas>
        <canvas ref={canvasRef} className="video-canvas"></canvas>
      </div>
    </div>
  );
};

export default App;
