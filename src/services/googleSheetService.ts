import { ZikirItem, RangkaianItem, GoogleSheetConfig } from '../types/zikir';
import { DEFAULT_ZIKIR_LIST, DEFAULT_RANGKAIAN_LIST } from '../data/defaultZikir';

const STORAGE_KEY_ZIKIR = 'ayo_zikir_items_v1';
const STORAGE_KEY_RANGKAIAN = 'ayo_zikir_rangkaian_v1';
const STORAGE_KEY_CONFIG = 'ayo_zikir_sheet_config_v1';
const STORAGE_KEY_STATS = 'ayo_zikir_stats_v1';

export const USER_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzc1PlCST5nXhjdjqLXGDb1McyE_fN4SAZIwVyx_laGD_VcgfYGXz-v8eYuHAKI-42B/exec';

// Default config
export const DEFAULT_SHEET_CONFIG: GoogleSheetConfig = {
  webAppUrl: USER_APPS_SCRIPT_URL,
  sheetCsvUrl: '',
  autoSync: true,
  status: 'connected',
  lastSyncedAt: undefined,
  errorMessage: undefined,
};

// Ready-to-use Google Apps Script template for the Admin to copy-paste into their Google Sheet
export const GOOGLE_APPS_SCRIPT_CODE = `// ====================================================
// SCRIPT GOOGLE APPS SCRIPT UNTUK WEB APP "AYO ZIKIR"
// ====================================================
// Cara pasang:
// 1. Buat Spreadsheet baru di Google Drive (https://sheets.new)
// 2. Klik menu: Ekstensi > Apps Script (Extensions > Apps Script)
// 3. Hapus kode yang ada, lalu salin dan tempel SELURUH KODE di bawah ini.
// 4. Klik tombol "Simpan" (ikon disket).
// 5. Klik tombol biru "Terapkan" > "Penerapan baru" (Deploy > New Deployment).
// 6. Pilih jenis: "Aplikasi Web" (Web app).
// 7. Pada 'Akses' (Who has access), PILIH: "Siapa saja" (Anyone) -> SANGAT PENTING!
// 8. Klik "Terapkan" (Deploy), lalu Salin "URL Aplikasi Web" dan tempel di Dasbor Admin Ayo Zikir!

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetZikir = getOrCreateSheet(ss, 'AyoZikirData');
    var rowsZikir = sheetZikir.getDataRange().getValues();
    var dataZikir = [];
    if (rowsZikir.length > 1) {
      var headersZ = rowsZikir[0];
      for (var i = 1; i < rowsZikir.length; i++) {
        var row = rowsZikir[i];
        if (!row[0]) continue;
        var item = {};
        for (var j = 0; j < headersZ.length; j++) {
          var key = headersZ[j];
          var val = row[j];
          if (key === 'order' || key === 'targetCount') {
            val = Number(val) || 0;
          }
          item[key] = val;
        }
        dataZikir.push(item);
      }
    }

    var sheetRangkaian = getOrCreateSheet(ss, 'AyoZikirRangkaian');
    var rowsR = sheetRangkaian.getDataRange().getValues();
    var dataRangkaian = [];
    if (rowsR.length > 1) {
      for (var k = 1; k < rowsR.length; k++) {
        var rRow = rowsR[k];
        if (!rRow[0]) continue;
        var cfg = {};
        if (rRow[7]) {
          try { cfg = JSON.parse(rRow[7]); } catch(e) {}
        }
        dataRangkaian.push({
          id: String(rRow[0]),
          title: String(rRow[1] || ''),
          description: String(rRow[2] || ''),
          iconEmoji: String(rRow[3] || '📿'),
          order: Number(rRow[4]) || k,
          colorTheme: String(rRow[5] || 'emerald'),
          zikirIds: rRow[6] ? String(rRow[6]).split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [],
          itemsConfig: cfg
        });
      }
    }

    return responseJSON({
      status: 'success',
      data: dataZikir,
      rangkaian: dataRangkaian
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var zikirs = contents.data || contents.zikirs || [];
    var rangkaian = contents.rangkaian || [];
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Simpan Sheet Zikir
    var sheetZikir = getOrCreateSheet(ss, 'AyoZikirData');
    var headersZ = ['id', 'title', 'category', 'order', 'arabic', 'latin', 'translation', 'dalil', 'fadhilah', 'targetCount', 'repeatNote'];
    sheetZikir.clearContents();
    sheetZikir.appendRow(headersZ);
    sheetZikir.getRange(1, 1, 1, headersZ.length).setFontWeight("bold").setBackground("#064e3b").setFontColor("#ffffff");
    
    var rowsZ = [];
    for (var i = 0; i < zikirs.length; i++) {
      var z = zikirs[i];
      rowsZ.push([
        z.id || 'zikir-' + (i+1),
        z.title || '',
        z.category || 'pagi',
        Number(z.order) || (i+1),
        z.arabic || '',
        z.latin || '',
        z.translation || '',
        z.dalil || '',
        z.fadhilah || '',
        Number(z.targetCount) || 1,
        z.repeatNote || ''
      ]);
    }
    if (rowsZ.length > 0) {
      sheetZikir.getRange(2, 1, rowsZ.length, headersZ.length).setValues(rowsZ);
    }

    // Simpan Sheet Rangkaian
    if (rangkaian && rangkaian.length > 0) {
      var sheetR = getOrCreateSheet(ss, 'AyoZikirRangkaian');
      var headersR = ['id', 'title', 'description', 'iconEmoji', 'order', 'colorTheme', 'zikirIds', 'itemsConfigJson'];
      sheetR.clearContents();
      sheetR.appendRow(headersR);
      sheetR.getRange(1, 1, 1, headersR.length).setFontWeight("bold").setBackground("#047857").setFontColor("#ffffff");
      
      var rowsR = [];
      for (var r = 0; r < rangkaian.length; r++) {
        var itemR = rangkaian[r];
        rowsR.push([
          itemR.id || 'rangkaian-' + (r+1),
          itemR.title || '',
          itemR.description || '',
          itemR.iconEmoji || '📿',
          Number(itemR.order) || (r+1),
          itemR.colorTheme || 'emerald',
          Array.isArray(itemR.zikirIds) ? itemR.zikirIds.join(',') : '',
          itemR.itemsConfig ? JSON.stringify(itemR.itemsConfig) : ''
        ]);
      }
      sheetR.getRange(2, 1, rowsR.length, headersR.length).setValues(rowsR);
    }
    
    return responseJSON({
      status: 'success',
      countZikir: rowsZ.length,
      countRangkaian: rangkaian ? rangkaian.length : 0,
      message: 'Data zikir & rangkaian berhasil disimpan di Google Sheets!'
    });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

// Helper to load items from local storage or default
export function getStoredZikirItems(): ZikirItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZIKIR);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading zikir from localStorage:', err);
  }
  return DEFAULT_ZIKIR_LIST;
}

// Helper to save items to local storage
export function saveStoredZikirItems(items: ZikirItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ZIKIR, JSON.stringify(items));
  } catch (err) {
    console.error('Failed writing zikir to localStorage:', err);
  }
}

// Helper to load rangkaian items from local storage or default
export function getStoredRangkaianItems(): RangkaianItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RANGKAIAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading rangkaian from localStorage:', err);
  }
  return DEFAULT_RANGKAIAN_LIST;
}

// Helper to save rangkaian items to local storage
export function saveStoredRangkaianItems(items: RangkaianItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RANGKAIAN, JSON.stringify(items));
  } catch (err) {
    console.error('Failed writing rangkaian to localStorage:', err);
  }
}

// Helper to load config
export function getStoredSheetConfig(): GoogleSheetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const url = parsed.webAppUrl || USER_APPS_SCRIPT_URL;
      return {
        ...DEFAULT_SHEET_CONFIG,
        ...parsed,
        webAppUrl: url,
        status: url ? 'connected' : 'disconnected',
      };
    }
  } catch (err) {
    console.error('Failed reading sheet config from localStorage:', err);
  }
  return DEFAULT_SHEET_CONFIG;
}

// Helper to save config
export function saveStoredSheetConfig(config: GoogleSheetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed writing sheet config to localStorage:', err);
  }
}

export interface FetchResult {
  zikirs: ZikirItem[];
  rangkaian?: RangkaianItem[];
}

// Fetch from remote Google Spreadsheet via Apps Script Web App
export async function fetchFromGoogleSheet(url: string): Promise<FetchResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('URL Google Apps Script belum diisi');
  }

  // If user provided a CSV publish link:
  if (cleanUrl.includes('pub?output=csv') || cleanUrl.includes('output=csv')) {
    const parsed = await parseCsvGoogleSheet(cleanUrl);
    return { zikirs: parsed };
  }

  const res = await fetch(cleanUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil data dari Google Sheet (HTTP ${res.status})`);
  }

  const json = await res.json();
  if (json.status === 'success' && Array.isArray(json.data)) {
    const zikirs: ZikirItem[] = json.data.map((item: any, index: number) => ({
      id: String(item.id || `remote-${index + 1}`),
      title: String(item.title || 'Zikir'),
      category: String(item.category || 'pagi'),
      order: Number(item.order) || index + 1,
      arabic: String(item.arabic || ''),
      latin: String(item.latin || ''),
      translation: String(item.translation || ''),
      dalil: String(item.dalil || ''),
      fadhilah: item.fadhilah ? String(item.fadhilah) : '',
      targetCount: Number(item.targetCount) || 0,
      hasTargetCount:
        item.hasTargetCount !== undefined
          ? item.hasTargetCount === true || item.hasTargetCount === 'true'
          : Number(item.targetCount) > 0,
      hideHadits: item.hideHadits === true || item.hideHadits === 'true',
      hideFadhilah: item.hideFadhilah === true || item.hideFadhilah === 'true',
      repeatNote: item.repeatNote ? String(item.repeatNote) : undefined,
    }));

    let rangkaian: RangkaianItem[] | undefined;
    if (Array.isArray(json.rangkaian) && json.rangkaian.length > 0) {
      rangkaian = json.rangkaian.map((r: any, rIdx: number) => {
        let parsedConfig: Record<string, any> = {};
        if (r.itemsConfig && typeof r.itemsConfig === 'object') {
          parsedConfig = r.itemsConfig;
        } else if (r.itemsConfigJson) {
          try {
            parsedConfig = typeof r.itemsConfigJson === 'string' ? JSON.parse(r.itemsConfigJson) : r.itemsConfigJson;
          } catch (e) {}
        }
        return {
          id: String(r.id || `rangkaian-${rIdx + 1}`),
          title: String(r.title || 'Rangkaian Zikir'),
          description: String(r.description || ''),
          iconEmoji: String(r.iconEmoji || '📿'),
          order: Number(r.order) || rIdx + 1,
          colorTheme: String(r.colorTheme || 'emerald'),
          zikirIds: Array.isArray(r.zikirIds) ? r.zikirIds : [],
          itemsConfig: parsedConfig,
        };
      });
    }

    return { zikirs, rangkaian };
  }

  throw new Error(json.message || 'Format data dari Google Spreadsheet tidak valid');
}

// Save zikir items and rangkaian to remote Google Spreadsheet via Apps Script Web App
export async function saveToGoogleSheet(
  url: string,
  items: ZikirItem[],
  rangkaian?: RangkaianItem[]
): Promise<boolean> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('URL Google Apps Script belum diisi');
  }

  const payload = {
    action: 'sync',
    data: items,
    rangkaian: rangkaian || [],
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(cleanUrl, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
  });

  if (!res.ok) {
    throw new Error(`Gagal menyimpan ke Google Sheet (HTTP ${res.status})`);
  }

  const json = await res.json().catch(() => ({ status: 'success' }));
  if (json.status === 'error') {
    throw new Error(json.message || 'Google Sheets menolak pembaruan data');
  }

  return true;
}

// Fallback CSV parser for Published Google Sheets
async function parseCsvGoogleSheet(csvUrl: string): Promise<ZikirItem[]> {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('Gagal mengunduh CSV Google Sheet');
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]);
  const results: ZikirItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    if (!values[0]) continue;
    const item: any = {};
    headers.forEach((h, idx) => {
      item[h.trim()] = values[idx] || '';
    });

    results.push({
      id: item.id || `csv-${i}`,
      title: item.title || 'Zikir',
      category: item.category || 'pagi',
      order: Number(item.order) || i,
      arabic: item.arabic || '',
      latin: item.latin || '',
      translation: item.translation || '',
      dalil: item.dalil || '',
      fadhilah: item.fadhilah || '',
      targetCount: Number(item.targetCount) || 1,
      repeatNote: item.repeatNote || '',
    });
  }

  return results;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"' && (i === 0 || row[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
}
