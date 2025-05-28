// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectWhatsBlitzScripts") {
    console.log("Background script received request to inject scripts.");
    const tabId = sender.tab.id;

    if (!tabId) {
      console.error("Background script could not get tab ID from sender.");
      return;
    }

    // First inject XLSX library
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['xlsx.full.min.js']
    }).then(() => {
      console.log('XLSX library injection completed');
      
      // After XLSX is loaded, inject sidebar script
      return chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['sidebar.js']
      });
    }).then(() => {
      console.log('Sidebar script injection completed');
      
      // Finally, initialize the UI
      return chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // Verify XLSX is still available
          if (typeof XLSX === 'undefined') {
            console.error('XLSX is not defined after script injection');
            return;
          }
          window.postMessage({ type: 'INIT_WHATSBLITZ' }, '*');
        }
      });
    }).catch((error) => {
      console.error('Error during script injection:', error);
    });
  }
});

console.log("WhatsBlitz background script loaded."); 