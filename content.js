function injectWhatsBlitz() {
  // Remove existing sidebar if any
  const existingSidebar = document.getElementById('whatsblitz-sidebar');
  if (existingSidebar) existingSidebar.remove();

  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'whatsblitz-sidebar';
  document.body.appendChild(sidebar);

  // Inject CSS directly
  const style = document.createElement('style');
  style.textContent = `
    #whatsblitz-sidebar {
      position: fixed;
      top: 100px;
      right: 20px;
      width: 320px;
      background: white;
      border: 1px solid #25D366;
      z-index: 9999;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
    }
  `;
  document.head.appendChild(style);

  // Load scripts sequentially
  const loadScript = (src, onSuccess) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = onSuccess;
    script.onerror = () => console.error('Failed to load:', src);
    document.head.appendChild(script);
  };

  // Load XLSX first, then sidebar.js
  loadScript('xlsx.full.min.js', () => {
    loadScript('sidebar.js', () => {
      console.log('WhatsBlitz loaded successfully');
    });
  });
}

// Wait for WhatsApp to fully load
if (document.readyState === 'complete') {
  injectWhatsBlitz();
} else {
  window.addEventListener('load', injectWhatsBlitz);
}