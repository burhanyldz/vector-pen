/**
 * Application code for Vector Pen and Pinch Zoom demo
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize PinchZoom
  const pinchZoom = new PinchZoom({
    minZoom: 0.5,
    maxZoom: 3.0,
    speedFactor: 0.002,
    animationDuration: 200,
    disablePan: false,
    enablePresentation: true
  });

  // Initialize VectorPen
  const vectorPen = new VectorPen({
    showToolbar: true,
    toolbarPosition: 'top',
    toolbarContainer: document.body,
    showClearButtons: false
  });

  // Attach VectorPen first
  vectorPen.attach('.drawing-target');

  // Then attach PinchZoom
  pinchZoom.attach('.drawing-target');
});