let contacts = [];

// UI Elements
function initUI() {
  const sidebar = document.getElementById('whatsblitz-sidebar');
  if (!sidebar) {
    console.error('Sidebar container not found!');
    return;
  }

  // Clear and rebuild UI
  sidebar.innerHTML = `
    <div class="wb-container">
      <h3 class="wb-title">📤 WhatsBlitz</h3>
      <input type="file" id="wb-file" accept=".xlsx,.csv" class="wb-input" />
      <div class="wb-loading">Processing file...</div>
      <button id="wb-start" class="wb-button" disabled>Start Sending Messages</button>
      <div id="wb-status" class="wb-status"></div>
      <div id="wb-progress" class="wb-progress"></div>
    </div>
  `;

  // Add event listeners
  document.getElementById('wb-file').addEventListener('change', handleFile);
  document.getElementById('wb-start').addEventListener('click', startSending);

  // Notify that initialization is complete
  window.postMessage({ type: 'WHATSBLITZ_READY' }, '*');
}

// Listen for initialization message
window.addEventListener('message', (event) => {
  if (event.data.type === 'INIT_WHATSBLITZ') {
    initUI();
  }
});

// Utility functions
function updateStatus(message, isError = false) {
  const status = document.getElementById('wb-status');
  if (status) {
    status.textContent = message;
    status.style.color = isError ? '#ff4444' : '#25D366';
  }
}

function updateProgress(current, total) {
  const progress = document.getElementById('wb-progress');
  if (progress) {
    const percentage = Math.round((current/total)*100);
    progress.innerHTML = `Progress: ${current}/${total} (${percentage}%)`;
  }
}

// File handling
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['.xlsx', '.csv'];
  const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!validTypes.includes(fileExt)) {
    updateStatus('❌ Please upload a valid .xlsx or .csv file', true);
    return;
  }

  // Show loading state
  const loadingEl = document.querySelector('.wb-loading');
  const startBtn = document.getElementById('wb-start');
  loadingEl.classList.add('active');
  startBtn.disabled = true;
  updateStatus('⏳ Processing file...');

  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      // Wait for the XLSX object to be available
      const XLSX = await waitForGlobalVariable('XLSX', 10000);

      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('No sheets found in the file');
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      contacts = XLSX.utils.sheet_to_json(sheet, {
        header: ['name', 'number', 'message'],
        range: 1,
        cellText: true
      });

      contacts = contacts.filter(c => {
        if (!c.number || !c.message) {
          console.warn('Skipping invalid contact:', c);
          return false;
        }
        return true;
      });
      
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in the file');
      }
      
      updateStatus(`✅ Loaded ${contacts.length} contacts`);
      startBtn.disabled = false;
      
    } catch (error) {
      updateStatus(`❌ ${error.message}`, true);
      console.error('File error:', error);
      startBtn.disabled = true;
    } finally {
      loadingEl.classList.remove('active');
    }
  };

  reader.onerror = (error) => {
    updateStatus('❌ Failed to read file. Please try again.', true);
    console.error('Reader error:', error);
    loadingEl.classList.remove('active');
    startBtn.disabled = true;
  };

  reader.readAsArrayBuffer(file);
}

// Helper function to wait for a global variable to be defined
function waitForGlobalVariable(variableName, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const end = Date.now() + timeout;
    const check = () => {
      if (typeof window[variableName] !== 'undefined') {
        console.log(`${variableName} is defined.`);
        resolve(window[variableName]);
      } else if (Date.now() < end) {
        console.log(`Waiting for ${variableName}...`);
        setTimeout(check, 100);
      } else {
        reject(new Error(`${variableName} object not found or not ready after timeout.`));
      }
    };
    check();
  });
}

// Helper function to dispatch mouse events for clicking
function dispatchMouseEvent(element, type) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  element.dispatchEvent(event);
}

// Message sending
async function startSending() {
  if (!contacts?.length) {
    updateStatus("❌ No contacts loaded!", true);
    return;
  }

  updateStatus("⏳ Starting message sending...");
  
  try {
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Process the number to ensure it's in the correct format: +91<10_digits>
      let cleanedNumber = contact.number.toString().replace(/\D/g, ''); // Remove all non-digits
      
      let formattedNumber;

      if (cleanedNumber.length === 10) {
        // If it's a 10-digit number, assume it needs the 91 country code
        formattedNumber = '91' + cleanedNumber;
      } else if (cleanedNumber.length === 12 && cleanedNumber.startsWith('91')) {
        // If it's a 12-digit number starting with 91, keep it as is (it's already 91 + 10 digits)
        formattedNumber = cleanedNumber;
      } else if (cleanedNumber.length > 10 && cleanedNumber.startsWith('+')) {
         // If it starts with + and is longer than 10, assume it's already in a valid international format
         // We will use it directly after cleaning
         formattedNumber = cleanedNumber.substring(1); // Remove the leading +
         // Further validation could be added here if needed, e.g., checking length after removing +
         console.log('Using potentially valid international format from sheet:', contact.number, '->', formattedNumber);
      } else {
        // For any other format, log a warning and skip or handle as an error
        console.warn('Skipping contact with potentially invalid number format:', contact.number);
        updateStatus(`⚠️ Skipping invalid number for ${contact.name || 'contact'}: ${contact.number}`, false);
        continue; // Skip this contact
      }
      
      // Prepend '+' for the final URL format
      const finalWhatsAppNumber = '+' + formattedNumber;
      
      const msg = contact.message.replace(/{{name}}/gi, contact.name || '');
      
      updateStatus(`📨 Sending to ${contact.name || finalWhatsAppNumber} (${i+1}/${contacts.length})`);
      updateProgress(i+1, contacts.length);
      
      window.location.href = `https://web.whatsapp.com/send?phone=${finalWhatsAppNumber}&text=${encodeURIComponent(msg)}`;
      
      // Wait for the send button to appear after navigation and message pasting
      // Using data-testid="send" which is a common identifier for the send button
      const sendBtn = await waitForElement('[data-testid="send"]', 15000); // Increased timeout to 15 seconds
      
      if (sendBtn) {
        console.log('Send button found.');
        
        // Add a small delay to ensure the button is clickable
        await new Promise(r => setTimeout(r, 500)); // Wait for 500ms after finding the button
        
        console.log('Attempting to click send button by dispatching mouse events...');
        
        // Dispatch mouse events to simulate a click
        dispatchMouseEvent(sendBtn, 'mousedown');
        dispatchMouseEvent(sendBtn, 'mouseup');
        dispatchMouseEvent(sendBtn, 'click');
        
        console.log('Mouse events dispatched for send button.');
        
        // Wait a bit for the message to be sent and processed by WhatsApp
        await new Promise(r => setTimeout(r, 3000)); // Wait 3 seconds after attempting to send
        
      } else {
        console.error('Send button not found after waiting.');
        updateStatus(`❌ Failed to find send button for ${contact.name || finalWhatsAppNumber}`, true);
        // Optionally skip this contact or retry
      }
      
      // Wait before processing the next contact to avoid overwhelming WhatsApp Web
      await new Promise(r => setTimeout(r, Math.random() * 5000 + 3000)); // Random wait between 3 to 8 seconds
    }
    
    updateStatus("✅ All messages sent!");
  } catch (error) {
    updateStatus(`❌ Error: ${error.message}`, true);
    console.error('Sending error:', error);
  }
}

// Helper functions
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const end = Date.now() + timeout;
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() < end) setTimeout(check, 500);
      else resolve(null);
    };
    check();
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', initUI);
