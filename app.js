/**
 * Vektör Kalem demosu için uygulama kodu
 */
document.addEventListener('DOMContentLoaded', () => {
  // VectorPen'i başlat
  const vectorPen = new VectorPen({
    showToolbar: true,
    verticalToolbar: true,
    toolbarContainer: document.body
  });
  
  // Tüm çizim hedefi elemanlarına ekle
  vectorPen.attach('.drawing-target');
});