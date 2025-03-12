/**
 * Vektör Kalem demosu için uygulama kodu
 */
document.addEventListener('DOMContentLoaded', () => {
  // VectorPen'i başlat
  const vectorPen = new VectorPen({
    showToolbar: true, // Enable the built-in toolbar
    toolbarContainer: document.body // Place toolbar in the body
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
  
  // Her çizim alanı için bir temizle düğmesi ekle
  document.querySelectorAll('.drawing-target').forEach(element => {
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-button';
    clearButton.textContent = 'Temizle';
    clearButton.style.zIndex = '50';
    
    clearButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasToolActive = vectorPen.activeTool;
      vectorPen.deactivateTool();
      vectorPen.clear(element);
      if (wasToolActive) {
        vectorPen.activateTool(wasToolActive);
      }
    });
    
    element.appendChild(clearButton);
  });
});