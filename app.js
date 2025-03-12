/**
 * Vektör Kalem demosu için uygulama kodu
 */
document.addEventListener('DOMContentLoaded', () => {
  // VectorPen'i başlat
  const vectorPen = new VectorPen({
    strokeWidth: 3,
    strokeColor: '#3050ff',
    eraserWidth: 40 // varsayılan kalem genişliğinin 20 katı
  });
  
  // Tüm çizim hedefi elemanlarına ekle
  vectorPen.attach('.drawing-target');
  
  // Araç düğmeleri
  const penButton = document.getElementById('pen-tool');
  const eraserButton = document.getElementById('eraser-tool');
  const clearAllButton = document.getElementById('clear-all');
  
  // Düğmelere olay dinleyicileri ekle
  penButton.addEventListener('click', () => {
    // Kalem düğmesi için aktif durumu değiştir
    penButton.classList.toggle('active');
    eraserButton.classList.remove('active');
    
    if (penButton.classList.contains('active')) {
      vectorPen.activateTool('pen');
    } else {
      vectorPen.deactivateTool();
    }
  });
  
  eraserButton.addEventListener('click', () => {
    // Silgi düğmesi için aktif durumu değiştir
    eraserButton.classList.toggle('active');
    penButton.classList.remove('active');
    
    if (eraserButton.classList.contains('active')) {
      vectorPen.activateTool('eraser');
    } else {
      vectorPen.deactivateTool();
    }
  });
  
  // Tüm çizimleri onaysız temizle
  clearAllButton.addEventListener('click', () => {
    console.log("Tümünü Temizle düğmesine tıklandı");
    // Geçici olarak mevcut araç durumunu sakla
    const wasToolActive = penButton.classList.contains('active') || eraserButton.classList.contains('active');
    const activeTool = penButton.classList.contains('active') ? 'pen' : 
                      eraserButton.classList.contains('active') ? 'eraser' : null;

    // İşaretçi olayları yakalama sorunlarını önlemek için aracı devre dışı bırak
    vectorPen.deactivateTool();

    // Tüm çizim hedeflerini temizle
    document.querySelectorAll('.drawing-target').forEach(target => {
      vectorPen.clear(target);
    });

    // Eğer aktif ise aracın durumunu geri yükle
    if (wasToolActive && activeTool) {
      if (activeTool === 'pen') {
        penButton.classList.add('active');
        vectorPen.activateTool('pen');
      } else if (activeTool === 'eraser') {
        eraserButton.classList.add('active');
        vectorPen.activateTool('eraser');
      }
    }
  });
  
  // Dokunmatik olayları işle - çizim yaparken varsayılan kaydırmayı engelle
  document.querySelectorAll('.drawing-target').forEach(element => {
    element.addEventListener('touchstart', e => {
      if (penButton.classList.contains('active') || eraserButton.classList.contains('active')) {
        e.preventDefault();
      }
    }, { passive: false });
    
    element.addEventListener('touchmove', e => {
      if (penButton.classList.contains('active') || eraserButton.classList.contains('active')) {
        e.preventDefault();
      }
    }, { passive: false });
  });
  
  // Kullanışlı UI geribildirimleri ekle
  const content = document.querySelector('.content');
  const helpText = document.createElement('div');
  helpText.className = 'help-text';
  helpText.innerHTML = `
    <p>Çizim yapmaya başlamak için kalem veya silgi aracına tıklayın. Devre dışı bırakmak için tekrar tıklayın.</p>
    <p>Çizim alanları yeniden boyutlandırılabilir - sağ alt köşeyi sürükleyerek yeniden boyutlandırın.</p>
    <p>Tüm çizim alanlarını aynı anda temizlemek için "Tümünü Temizle" düğmesini kullanın.</p>
  `;
  
  // Yardım metnini örnek bölümün ardına ekle
  const exampleContainer = document.querySelector('.example-container');
  if (exampleContainer) {
    exampleContainer.insertAdjacentElement('afterend', helpText);
  } else {
    content.insertBefore(helpText, content.firstChild);
  }
  
  // Her çizim alanı için bir temizle düğmesi ekle
  document.querySelectorAll('.drawing-target').forEach(element => {
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-button';
    clearButton.textContent = 'Temizle';
    
    // Temizle düğmesinin her zaman üstte olmasını sağla ve tıklamayı düzgün işle
    clearButton.style.zIndex = '50';  // SVG katmanından daha yüksek
    
    clearButton.addEventListener('click', (e) => {
      // Olayın SVG katmanına yayılmasını engelle
      e.stopPropagation();
      
      // Geçici olarak mevcut araç durumunu sakla
      const wasToolActive = penButton.classList.contains('active') || eraserButton.classList.contains('active');
      const activeTool = penButton.classList.contains('active') ? 'pen' : 
                        eraserButton.classList.contains('active') ? 'eraser' : null;

      // İşaretçi olayları yakalama sorunlarını önlemek için aracı devre dışı bırak
      vectorPen.deactivateTool();
      
      // Elemanı temizle
      vectorPen.clear(element);
      
      // Eğer aktif ise aracın durumunu geri yükle
      if (wasToolActive && activeTool) {
        if (activeTool === 'pen') {
          penButton.classList.add('active');
          vectorPen.activateTool('pen');
        } else if (activeTool === 'eraser') {
          eraserButton.classList.add('active');
          vectorPen.activateTool('eraser');
        }
      }
    });
    
    element.appendChild(clearButton);
  });
});