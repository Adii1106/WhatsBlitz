// Initialize UI
function initUI() {
  const sidebar = document.getElementById('whatsblitz-sidebar');
  if (!sidebar) {
    console.error('Sidebar element not found');
    return;
  }

  sidebar.innerHTML = `
    <div style="font-family: Arial, sans-serif;">
      <h3 style="color: #25D366; margin-top: 0;">WhatsBlitz</h3>
      <input type="file" id="wb-file" accept=".xlsx,.csv" 
             style="width: 100%; margin: 10px 0; padding: 8px;" />
      <button id="wb-start" 
              style="background: #25D366; color: white; border: none; 
                     padding: 10px; width: 100%; border-radius: 5px;">
        Start Sending
      </button>
      <div id="wb-status" style="margin: 10px 0; min-height: 20px;"></div>
      <div id="wb-progress" style="font-size: 13px; color: #555;"></div>
    </div>
  `;

  // Add event listeners
  document.getElementById('wb-file').addEventListener('change', handleFile);
  document.getElementById('wb-start').addEventListener('click', startSending);
}

// Core functionality
let contacts = [];

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      contacts = XLSX.utils.sheet_to_json(sheet);
      updateStatus(`Loaded ${contacts.length} contacts`);
    } catch (error) {
      updateStatus('Error reading file', true);
      console.error(error);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function startSending() {
  if (!contacts.length) {
    updateStatus('No contacts loaded', true);
    return;
  }

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const number = contact.number.toString().replace(/\D/g, '');
    const message = contact.message || '';
    
    updateStatus(`Sending to ${contact.name || number} (${i+1}/${contacts.length})`);
    
    window.open(`https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`, '_blank');
    
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  updateStatus('Completed all messages');
}

function updateStatus(message, isError = false) {
  const status = document.getElementById('wb-status');
  if (status) {
    status.textContent = message;
    status.style.color = isError ? 'red' : 'green';
  }
}

// Initialize
setTimeout(initUI, 1000);