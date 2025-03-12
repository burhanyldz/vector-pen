/**
 * Vektör Kalem demosu için uygulama kodu
 */
document.addEventListener('DOMContentLoaded', () => {
  // VectorPen'i başlat
  const vectorPen = new VectorPen({
    showToolbar: true,
    toolbarPosition: 'top', // Can be: 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    toolbarContainer: document.body,
    showClearButtons: false
  });
  
  // Tüm çizim hedefi elemanlarına ekle
  vectorPen.attach('.drawing-target');
});