/**
 * Application code for Vector Pen and Pinch Zoom demo
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize PinchZoom first
  const pinchZoom = new PinchZoom({
    minZoom: 0.5,
    maxZoom: 3.0,
    speedFactor: 0.002,
    animationDuration: 200,
    disablePan: false,
    enablePresentation: true
  });
  
  // First attach PinchZoom to the drawing target
  const drawingTarget = document.querySelector('.drawing-target');
  pinchZoom.attach('.drawing-target');
  
  // Initialize VectorPen
  const vectorPen = new VectorPen({
    showToolbar: true,
    toolbarPosition: 'top',
    toolbarContainer: document.body,
    showClearButtons: false
  });
  
  // Then attach VectorPen to the drawing target
  vectorPen.attach('.drawing-target');
});