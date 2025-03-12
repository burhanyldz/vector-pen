/**
 * Vektör Kalem demosu için uygulama kodu
 */
document.addEventListener('DOMContentLoaded', () => {
  // VectorPen'i başlat
  const vectorPen = new VectorPen({
    showToolbar: true,
    verticalToolbar: false,
    toolbarContainer: document.body,
    showClearButtons: false,
  });
  
  // Tüm çizim hedefi elemanlarına ekle
  vectorPen.attach('.drawing-target');
  
  // Dokunmatik olayları işle - çizim yaparken varsayılan kaydırmayı engelle
  document.querySelectorAll('.drawing-target').forEach(element => {
    element.addEventListener('touchstart', e => {
      if (vectorPen.activeTool) {
        e.preventDefault();
      }
    }, { passive: false });
    
    element.addEventListener('touchmove', e => {
      if (vectorPen.activeTool) {
        e.preventDefault();
      }
    }, { passive: false });
  });
});