/**
 * Tableau Decoupled Data Sync Extension - Headless/Bridge Side
 * Extracts dashboard summary data and posts it to the parent window.
 */

// Application State
const state = {
  dashboard: null,
  availableWorksheets: [],
  filterUnregisterHandlers: [],
  debounceTimer: null,
  debounceDelayMs: 900,
  isTableauEnvironment: false
};

// DOM Elements
const elements = {
  statusText: document.getElementById('statusText'),
  syncDetails: document.getElementById('syncDetails'),
  dbName: document.getElementById('dbName'),
  sheetCount: document.getElementById('sheetCount'),
  lastSyncTime: document.getElementById('lastSyncTime')
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTableauExtension();
});

/**
 * 1. Initialize Tableau Extensions SDK
 */
function initTableauExtension() {
  if (typeof tableau !== 'undefined' && tableau.extensions && tableau.extensions.initializeAsync) {
    tableau.extensions.initializeAsync().then(() => {
      state.isTableauEnvironment = true;
      state.dashboard = tableau.extensions.dashboardContent.dashboard;
      state.availableWorksheets = state.dashboard.worksheets || [];

      console.log('Sync connected to Tableau Dashboard:', state.dashboard.name);
      
      // Update UI Status
      elements.statusText.textContent = 'Terhubung & Aktif';
      elements.syncDetails.classList.remove('hidden');
      
      // Attach change listeners
      attachAllEventListeners();
      
      // Initial Sync
      triggerSyncData();

    }).catch((err) => {
      console.error('Tableau initializeAsync error:', err);
      setupBrowserPreviewMode();
    });
  } else {
    setupBrowserPreviewMode();
  }
}

/**
 * Fallback Browser Preview Mode
 */
function setupBrowserPreviewMode() {
  state.isTableauEnvironment = false;
  elements.statusText.innerHTML = '⚠️ Mode Preview Browser';
  elements.syncDetails.classList.remove('hidden');
  elements.dbName.textContent = 'Demo Dashboard';
  elements.sheetCount.textContent = '1';
  
  const now = new Date();
  elements.lastSyncTime.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Automatically broadcast mock data to parent periodically or once
  console.log('Broadcasting simulated payload in 1s...');
  setTimeout(() => {
    sendDataToParent(getDemoPayload());
  }, 1000);
}

/**
 * 2. Attach Filter & Selection Listeners to Detect Dashboard Interactivity
 */
function attachAllEventListeners() {
  // Clear any existing listeners
  state.filterUnregisterHandlers.forEach(unregister => {
    try { unregister(); } catch (e) {}
  });
  state.filterUnregisterHandlers = [];

  // Listen to Filter & Selection changes on all worksheets
  state.availableWorksheets.forEach(ws => {
    try {
      const unregFilter = ws.addEventListener(
        tableau.TableauEventType.FilterChanged,
        onTableauInteractionChanged
      );
      state.filterUnregisterHandlers.push(unregFilter);

      const unregSelection = ws.addEventListener(
        tableau.TableauEventType.MarkSelectionChanged,
        onTableauInteractionChanged
      );
      state.filterUnregisterHandlers.push(unregSelection);
    } catch (e) {
      console.warn('Gagal menempelkan listener pada worksheet:', ws.name, e);
    }
  });
}

/**
 * 3. Debounced Interaction Handler
 */
function onTableauInteractionChanged() {
  clearTimeout(state.debounceTimer);
  elements.statusText.textContent = 'Mendeteksi perubahan...';
  
  state.debounceTimer = setTimeout(() => {
    triggerSyncData();
  }, state.debounceDelayMs);
}

/**
 * 4. Pull Data and Broadcast to Parent Page
 */
async function triggerSyncData() {
  try {
    let payload = {};

    if (state.isTableauEnvironment && state.dashboard) {
      const combinedSheetsData = [];

      for (const ws of state.availableWorksheets) {
        try {
          const summaryData = await ws.getSummaryDataAsync({ maxRows: 100 });
          const columns = summaryData.columns.map(c => c.fieldName);
          const rows = summaryData.data.map(row => {
            return row.map(cell => (cell.formattedValue !== undefined && cell.formattedValue !== null) ? cell.formattedValue : cell.value);
          });
          
          combinedSheetsData.push({
            worksheetName: ws.name,
            columns: columns,
            rows: rows
          });
        } catch (err) {
          console.warn(`Gagal mengambil summary data dari worksheet ${ws.name}:`, err);
        }
      }

      if (combinedSheetsData.length === 0) {
        throw new Error('Gagal menarik summary data dari worksheet mana pun.');
      }

      let dashboardName = state.dashboard.name || 'Dashboard Tableau';
      // Clean up numeric codes like '12.1.1.1' to descriptive titles
      if (/^\d+(\.\d+)+/.test(dashboardName)) {
        dashboardName = 'Jumlah Penumpang Angkutan Umum yang Terlayani';
      }

      payload = {
        dashboardName: dashboardName,
        sheetsData: combinedSheetsData
      };
    } else {
      payload = getDemoPayload();
    }

    // Broadcast to Parent Website
    sendDataToParent(payload);

    // Update Extension UI Sync Status card
    elements.statusText.textContent = 'Sinkronisasi Sukses';
    elements.dbName.textContent = payload.dashboardName;
    elements.sheetCount.textContent = String(payload.sheetsData.length);
    
    const now = new Date();
    elements.lastSyncTime.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  } catch (err) {
    console.error('Gagal melakukan sinkronisasi data:', err);
    elements.statusText.textContent = '❌ Sinkronisasi Gagal';
  }
}

/**
 * 5. Send PostMessage to Parent Window
 */
function sendDataToParent(payload) {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'TABLEAU_DATA_SYNC',
      dashboardName: payload.dashboardName,
      sheetsData: payload.sheetsData
    }, '*');
    console.log('Payload data berhasil di-broadcast ke website induk.');
  } else {
    console.log('Ekstensi tidak berjalan di dalam iframe. Sinyal TABLEAU_DATA_SYNC dicetak ke konsol:', payload);
  }
}

function getDemoPayload() {
  const urlParams = new URLSearchParams(window.location.search);
  const sim = urlParams.get('sim') || 'passenger';

  if (sim === 'retail') {
    return {
      dashboardName: 'Demo Analisis Penjualan Toko Retail',
      sheetsData: [
        {
          worksheetName: 'Ringkasan Penjualan Kategori',
          columns: ['Kategori Produk', 'Total Omset', 'Unit Terjual', 'YoY Growth'],
          rows: [
            ['Elektronik', '$450,000', '15,000', '+18.5%'],
            ['Fashion & Pakaian', '$320,000', '42,000', '+12.4%'],
            ['Kebutuhan Rumah Tangga', '$180,000', '8,500', '-2.1%'],
            ['Buku & Alat Tulis', '$60,000', '12,500', '+4.0%']
          ]
        }
      ]
    };
  }

  // Default: Passenger data
  return {
    dashboardName: 'Demo Jumlah Penumpang Angkutan Umum',
    sheetsData: [
      {
        worksheetName: 'Data Penumpang Mentah',
        columns: ['Tahun', 'Bulan', 'Kategori', 'Total Penumpang', 'Growth'],
        rows: [
          ['2024', 'Januari', 'Bus Kota', '125000', '+5.2%'],
          ['2024', 'Januari', 'KRL Jabodetabek', '450000', '+12.4%'],
          ['2024', 'Februari', 'Bus Kota', '132000', '+5.6%'],
          ['2024', 'Februari', 'KRL Jabodetabek', '468000', '+4.0%'],
          ['2025', 'Januari', 'Bus Kota', '140000', '+12.0%'],
          ['2025', 'Januari', 'KRL Jabodetabek', '510000', '+13.3%'],
          ['2025', 'Februari', 'Bus Kota', '145000', '+9.8%'],
          ['2025', 'Februari', 'KRL Jabodetabek', '525000', '+12.1%'],
          ['2026', 'Januari', 'Bus Kota', '162000', '+15.7%'],
          ['2026', 'Januari', 'KRL Jabodetabek', '590000', '+15.6%'],
          ['2026', 'Februari', 'Bus Kota', '168000', '+15.8%'],
          ['2026', 'Februari', 'KRL Jabodetabek', '610000', '+16.1%']
        ]
      }
    ]
  };
}
