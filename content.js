// Core variables
// These are now managed in the MAIN world by sidebar.js, not content.js
// let contacts = [];

// UI Elements - Creation of the container in the isolated world
function createSidebarContainer() {
  console.log('Content script: Starting WhatsBlitz container creation...');

  // Remove existing sidebar if any
  const existingSidebar = document.getElementById('whatsblitz-sidebar');
  if (existingSidebar) {
    console.log('Content script: Removing existing sidebar');
    existingSidebar.remove();
  }

  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'whatsblitz-sidebar';
  document.body.appendChild(sidebar);
  console.log('Content script: Sidebar container created');
}

// Wait for WhatsApp to fully load and then create the container and send message to background
function initializeWhatsBlitz() {
  console.log('Content script: Initializing WhatsBlitz...');
  createSidebarContainer();

  // Send a message to the background script to inject and run main world scripts
  console.log('Content script: Sending message to background to inject main world scripts.');
  chrome.runtime.sendMessage({ action: "injectWhatsBlitzScripts" });
}

// Use document.readyState to check if the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Content script: Document already loaded or interactive, initializing immediately.');
  initializeWhatsBlitz();
} else {
  console.log('Content script: Waiting for document load...');
  window.addEventListener('load', () => {
    console.log('Content script: Document loaded, initializing WhatsBlitz.');
    initializeWhatsBlitz();
  });
}
