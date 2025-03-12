/**
 * Application code for Vector Pen and Pinch Zoom demo
 */
document.addEventListener('DOMContentLoaded', () => {

  // Initialize VectorPen
  const vectorPen = new VectorPen({
    showToolbar: true,
    toolbarPosition: 'top',
    toolbarContainer: document.body,
    showClearButtons: false
  });

  // Attach VectorPen first
  vectorPen.attach('.drawing-target');
});