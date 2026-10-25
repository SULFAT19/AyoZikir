import React, { useState } from 'react';
import {
  ZikirItem,
  RangkaianItem,
  RangkaianZikirEntry,
  GoogleSheetConfig,
} from '../types/zikir';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  fetchFromGoogleSheet,
  saveToGoogleSheet,
} from '../services/googleSheetService';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Hash,
  FileSpreadsheet,
  Layers,
  LogOut,
  Download,
  Upload,
  ListPlus,
  CheckSquare,
  Square,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { DEFAULT_ZIKIR_LIST, DEFAULT_RANGKAIAN_LIST } from '../data/defaultZikir';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  zikirItems: ZikirItem[];
  onUpdateZikirItems: (items: ZikirItem[]) => void;
  rangkaianList: RangkaianItem[];
  onUpdateRangkaianList: (items: RangkaianItem[]) => void;
  sheetConfig: GoogleSheetConfig;
  onUpdateSheetConfig: (config: GoogleSheetConfig) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onLogout,
  zikirItems,
  onUpdateZikirItems,
  rangkaianList,
  onUpdateRangkaianList,
  sheetConfig,
  onUpdateSheetConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'rangkaian' | 'sheets' | 'backup'>('items');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Zikir Editing state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ZikirItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // Rangkaian Editing state
  const [isRangkaianModalOpen, setIsRangkaianModalOpen] = useState(false);
  const [editingRangkaian, setEditingRangkaian] = useState<RangkaianItem | null>(null);
  const [isNewRangkaian, setIsNewRangkaian] = useState(false);
  const [rangkaianModalSubTab, setRangkaianModalSubTab] = useState<'info' | 'select' | 'customize'>('select');

  // Syncing status
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // WebApp URL input in Sheets tab
  const [webAppUrlInput, setWebAppUrlInput] = useState(sheetConfig.webAppUrl || '');
  const [autoSyncInput, setAutoSyncInput] = useState(sheetConfig.autoSync ?? true);

  if (!isOpen) return null;

  // Dynamic unique categories from all zikir items
  const uniqueCategories = Array.from(
    new Set(zikirItems.map((item) => item.category?.trim()).filter(Boolean))
  );

  // Filtered zikir items
  const filteredItems = zikirItems
    .filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.latin.toLowerCase().includes(q) ||
          item.translation.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.order - b.order);

  // Sorted rangkaian list
  const sortedRangkaianList = [...rangkaianList].sort((a, b) => a.order - b.order);

  // --- ZIKIR HANDLERS ---
  const handleAddNewZikir = () => {
    const defaultCat = selectedCategory !== 'all' ? selectedCategory : 'Zikir Pagi';
    const newItem: ZikirItem = {
      id: `zikir-${Date.now()}`,
      title: '',
      category: defaultCat,
      order: zikirItems.length + 1,
      arabic: '',
      latin: '',
      translation: '',
      dalil: '',
      fadhilah: '',
      targetCount: 33,
      hasTargetCount: true,
      hideHadits: false,
      hideFadhilah: false,
      repeatNote: 'Dibaca 33x',
    };
    setEditingItem(newItem);
    setIsNewItem(true);
    setIsEditingModalOpen(true);
  };

  const handleEditZikir = (item: ZikirItem) => {
    setEditingItem({
      ...item,
      hasTargetCount: item.hasTargetCount !== undefined ? item.hasTargetCount : item.targetCount > 0,
      hideHadits: item.hideHadits ?? false,
      hideFadhilah: item.hideFadhilah ?? false,
    });
    setIsNewItem(false);
    setIsEditingModalOpen(true);
  };

  const handleSaveZikir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const itemToSave: ZikirItem = {
      ...editingItem,
      targetCount: editingItem.hasTargetCount === false ? 0 : Number(editingItem.targetCount) || 1,
      order: Number(editingItem.order) || zikirItems.length + 1,
    };

    let updatedList: ZikirItem[];
    if (isNewItem) {
      updatedList = [...zikirItems, itemToSave];
    } else {
      updatedList = zikirItems.map((item) => (item.id === itemToSave.id ? itemToSave : item));
    }

    onUpdateZikirItems(updatedList);
    setIsEditingModalOpen(false);
    setEditingItem(null);

    if (sheetConfig.webAppUrl && sheetConfig.autoSync) {
      triggerBackgroundSaveToSheet(sheetConfig.webAppUrl, updatedList, rangkaianList);
    }
  };

  const handleDeleteZikir = (id: string, title: string) => {
    if (window.confirm(`Yakin ingin menghapus zikir "${title}"?`)) {
      const updatedList = zikirItems.filter((item) => item.id !== id);
      onUpdateZikirItems(updatedList);

      // Clean up from playlists
      const updatedRangkaian = rangkaianList.map((r) => {
        const nextCfg = { ...(r.itemsConfig || {}) };
        delete nextCfg[id];
        return {
          ...r,
          zikirIds: r.zikirIds.filter((zId) => zId !== id),
          itemsConfig: nextCfg,
        };
      });
      onUpdateRangkaianList(updatedRangkaian);

      if (sheetConfig.webAppUrl && sheetConfig.autoSync) {
        triggerBackgroundSaveToSheet(sheetConfig.webAppUrl, updatedList, updatedRangkaian);
      }
    }
  };

  const handleMoveZikirOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredItems.length) return;

    const currentItem = filteredItems[index];
    const targetItem = filteredItems[targetIndex];

    const tempOrder = currentItem.order;
    const updated = zikirItems.map((item) => {
      if (item.id === currentItem.id) return { ...item, order: targetItem.order };
      if (item.id === targetItem.id) return { ...item, order: tempOrder };
      return item;
    });

    onUpdateZikirItems(updated);
  };

  // --- RANGKAIAN HANDLERS ---
  const handleAddNewRangkaian = () => {
    const newRangkaian: RangkaianItem = {
      id: `rangkaian-${Date.now()}`,
      title: '',
      description: '',
      iconEmoji: '📿',
      zikirIds: [],
      itemsConfig: {},
      order: rangkaianList.length + 1,
      colorTheme: 'emerald',
    };
    setEditingRangkaian(newRangkaian);
    setIsNewRangkaian(true);
    setRangkaianModalSubTab('select');
    setIsRangkaianModalOpen(true);
  };

  const handleEditRangkaian = (rangkaian: RangkaianItem) => {
    setEditingRangkaian({
      ...rangkaian,
      zikirIds: [...rangkaian.zikirIds],
      itemsConfig: rangkaian.itemsConfig ? { ...rangkaian.itemsConfig } : {},
    });
    setIsNewRangkaian(false);
    setRangkaianModalSubTab('select');
    setIsRangkaianModalOpen(true);
  };

  const handleSaveRangkaian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRangkaian) return;

    let updatedList: RangkaianItem[];
    if (isNewRangkaian) {
      updatedList = [
        ...rangkaianList,
        { ...editingRangkaian, order: Number(editingRangkaian.order) || rangkaianList.length + 1 },
      ];
    } else {
      updatedList = rangkaianList.map((r) => (r.id === editingRangkaian.id ? editingRangkaian : r));
    }

    onUpdateRangkaianList(updatedList);
    setIsRangkaianModalOpen(false);
    setEditingRangkaian(null);

    if (sheetConfig.webAppUrl && sheetConfig.autoSync) {
      triggerBackgroundSaveToSheet(sheetConfig.webAppUrl, zikirItems, updatedList);
    }
  };

  const handleDeleteRangkaian = (id: string, title: string) => {
    if (window.confirm(`Yakin ingin menghapus rangkaian zikir "${title}"?`)) {
      const updated = rangkaianList.filter((r) => r.id !== id);
      onUpdateRangkaianList(updated);

      if (sheetConfig.webAppUrl && sheetConfig.autoSync) {
        triggerBackgroundSaveToSheet(sheetConfig.webAppUrl, zikirItems, updated);
      }
    }
  };

  const handleMoveRangkaianOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedRangkaianList.length) return;

    const currentR = sortedRangkaianList[index];
    const targetR = sortedRangkaianList[targetIndex];

    const tempOrder = currentR.order;
    const updated = rangkaianList.map((r) => {
      if (r.id === currentR.id) return { ...r, order: targetR.order };
      if (r.id === targetR.id) return { ...r, order: tempOrder };
      return r;
    });

    onUpdateRangkaianList(updated);
  };

  // Toggle zikir into rangkaian
  const handleToggleZikirInRangkaian = (zikirId: string) => {
    if (!editingRangkaian) return;
    const exists = editingRangkaian.zikirIds.includes(zikirId);
    let updatedIds: string[];
    const updatedConfig = { ...(editingRangkaian.itemsConfig || {}) };

    if (exists) {
      updatedIds = editingRangkaian.zikirIds.filter((id) => id !== zikirId);
      delete updatedConfig[zikirId];
    } else {
      updatedIds = [...editingRangkaian.zikirIds, zikirId];
      const matched = zikirItems.find((z) => z.id === zikirId);
      updatedConfig[zikirId] = {
        zikirId,
        hasTargetCount: matched?.hasTargetCount !== undefined ? matched.hasTargetCount : (matched?.targetCount || 0) > 0,
        customTargetCount: matched?.targetCount || 33,
        hideHadits: matched?.hideHadits || false,
        hideFadhilah: matched?.hideFadhilah || false,
        customFadhilah: matched?.fadhilah || '',
      };
    }

    setEditingRangkaian({
      ...editingRangkaian,
      zikirIds: updatedIds,
      itemsConfig: updatedConfig,
    });
  };

  // Update specific zikir config inside rangkaian
  const handleUpdateZikirConfigInRangkaian = (
    zikirId: string,
    updates: Partial<RangkaianZikirEntry>
  ) => {
    if (!editingRangkaian) return;
    const current = editingRangkaian.itemsConfig?.[zikirId] || { zikirId };
    setEditingRangkaian({
      ...editingRangkaian,
      itemsConfig: {
        ...(editingRangkaian.itemsConfig || {}),
        [zikirId]: { ...current, ...updates },
      },
    });
  };

  // Reorder zikir inside rangkaian
  const handleMoveZikirInRangkaian = (index: number, direction: 'up' | 'down') => {
    if (!editingRangkaian) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editingRangkaian.zikirIds.length) return;
    const newIds = [...editingRangkaian.zikirIds];
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;
    setEditingRangkaian({
      ...editingRangkaian,
      zikirIds: newIds,
    });
  };

  // --- RESET & BACKUP HANDLERS ---
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengembalikan seluruh daftar zikir dan rangkaian ke standar bawaan? Data kustom akan ditimpa.'
      )
    ) {
      onUpdateZikirItems(DEFAULT_ZIKIR_LIST);
      onUpdateRangkaianList(DEFAULT_RANGKAIAN_LIST);
      if (sheetConfig.webAppUrl && sheetConfig.autoSync) {
        triggerBackgroundSaveToSheet(sheetConfig.webAppUrl, DEFAULT_ZIKIR_LIST, DEFAULT_RANGKAIAN_LIST);
      }
    }
  };

  const handleSaveSheetConfig = async () => {
    const newConfig: GoogleSheetConfig = {
      ...sheetConfig,
      webAppUrl: webAppUrlInput.trim(),
      autoSync: autoSyncInput,
      status: webAppUrlInput.trim() ? 'connected' : 'disconnected',
    };
    onUpdateSheetConfig(newConfig);

    if (webAppUrlInput.trim()) {
      await handleSyncNow(webAppUrlInput.trim());
    } else {
      setSyncFeedback({
        type: 'success',
        message: 'Pengaturan disimpan. Menggunakan penyimpanan lokal.',
      });
    }
  };

  const handleSyncNow = async (urlToUse?: string) => {
    const url = urlToUse || sheetConfig.webAppUrl || webAppUrlInput.trim();
    if (!url) {
      setSyncFeedback({
        type: 'error',
        message: 'Harap masukkan URL Google Apps Script Web App terlebih dahulu.',
      });
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const result = await fetchFromGoogleSheet(url);

      if (result && result.zikirs && result.zikirs.length > 0) {
        onUpdateZikirItems(result.zikirs);
        if (result.rangkaian && result.rangkaian.length > 0) {
          onUpdateRangkaianList(result.rangkaian);
        }

        const newConfig: GoogleSheetConfig = {
          ...sheetConfig,
          webAppUrl: url,
          autoSync: autoSyncInput,
          status: 'connected',
          lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          errorMessage: undefined,
        };
        onUpdateSheetConfig(newConfig);
        setSyncFeedback({
          type: 'success',
          message: `Berhasil tersambung & mengambil ${result.zikirs.length} zikir ${
            result.rangkaian ? `dan ${result.rangkaian.length} rangkaian` : ''
          } dari Google Spreadsheet!`,
        });
      } else {
        await saveToGoogleSheet(url, zikirItems, rangkaianList);
        const newConfig: GoogleSheetConfig = {
          ...sheetConfig,
          webAppUrl: url,
          autoSync: autoSyncInput,
          status: 'connected',
          lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          errorMessage: undefined,
        };
        onUpdateSheetConfig(newConfig);
        setSyncFeedback({
          type: 'success',
          message: `Google Spreadsheet terhubung! Berhasil mengunggah ${zikirItems.length} zikir & ${rangkaianList.length} rangkaian ke sheet Anda.`,
        });
      }
    } catch (err: any) {
      console.error(err);
      const newConfig: GoogleSheetConfig = {
        ...sheetConfig,
        webAppUrl: url,
        status: 'error',
        errorMessage: err.message || 'Gagal tersambung ke Google Spreadsheet',
      };
      onUpdateSheetConfig(newConfig);
      setSyncFeedback({
        type: 'error',
        message: `Gagal: ${err.message || 'Periksa URL Web App dan pastikan akses dipilih "Siapa saja (Anyone)"'}.`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSheet = async () => {
    const url = sheetConfig.webAppUrl || webAppUrlInput.trim();
    if (!url) {
      alert('Masukkan URL Google Apps Script terlebih dahulu!');
      return;
    }
    setIsSyncing(true);
    try {
      await saveToGoogleSheet(url, zikirItems, rangkaianList);
      setSyncFeedback({
        type: 'success',
        message: `Berhasil mengunggah ${zikirItems.length} zikir dan ${rangkaianList.length} rangkaian ke Google Spreadsheet!`,
      });
      onUpdateSheetConfig({
        ...sheetConfig,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: `Gagal mengunggah: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerBackgroundSaveToSheet = async (url: string, items: ZikirItem[], rangkaian: RangkaianItem[]) => {
    try {
      await saveToGoogleSheet(url, items, rangkaian);
      onUpdateSheetConfig({
        ...sheetConfig,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      });
    } catch (err) {
      console.warn('Background auto-sync failed:', err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleExportJson = () => {
    const backupData = {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      zikirItems,
      rangkaianList,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ayo_zikir_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onUpdateZikirItems(json);
          alert(`Berhasil memulihkan ${json.length} zikir dari file backup!`);
        } else if (json.zikirItems && Array.isArray(json.zikirItems)) {
          onUpdateZikirItems(json.zikirItems);
          if (Array.isArray(json.rangkaianList)) {
            onUpdateRangkaianList(json.rangkaianList);
          }
          alert(`Berhasil memulihkan ${json.zikirItems.length} zikir & rangkaian dari file backup!`);
        } else {
          alert('Format file JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Dasbor Admin Ayo Zikir</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-400 text-emerald-950">
                  Akses Penuh
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 hidden sm:block">
                Kustomisasi teks zikir, bilangan hitungan, hadits, fadhilah, dan rangkaian zikir
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onLogout}
              title="Keluar dari Admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-emerald-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex space-x-2 py-2">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'items'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Daftar Zikir ({zikirItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('rangkaian')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'rangkaian'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <ListPlus className="w-4 h-4 text-amber-300" />
              <span>Kelola Rangkaian ({rangkaianList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'sheets'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Google Spreadsheet</span>
              {sheetConfig.status === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'backup'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Backup & Reset</span>
            </button>
          </div>

          {sheetConfig.status === 'connected' && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sinkron Cloud Aktif</span>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: ZIKIR ITEMS MANAGEMENT */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                  >
                    <option value="all">Semua Kategori ({zikirItems.length})</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul zikir, kategori, arti..."
                    className="text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNewZikir}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Zikir Baru</span>
                  </button>
                </div>
              </div>

              {/* Items List Cards */}
              <div className="space-y-2.5">
                {filteredItems.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">Tidak ada zikir ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter atau tambahkan zikir baru.</p>
                  </div>
                ) : (
                  filteredItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Info */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {item.hasTargetCount === false || item.targetCount <= 0
                              ? 'Tanpa Jumlah Bilangan'
                              : `Target: ${item.targetCount}x`}
                          </span>
                          {item.hideHadits && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                              Hadits Disembunyikan
                            </span>
                          )}
                          {item.hideFadhilah && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                              Fadhilah Disembunyikan
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">#{item.order}</span>
                          {item.title}
                        </h4>

                        <p className="font-arabic text-emerald-950 text-base leading-relaxed line-clamp-1 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/60" dir="rtl">
                          {item.arabic}
                        </p>

                        <p className="text-xs text-slate-600 line-clamp-1 italic">
                          "{item.latin}"
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Arti: {item.translation}
                        </p>
                        {!item.hideHadits && item.dalil && (
                          <p className="text-[11px] text-amber-700/80 font-medium line-clamp-1">
                            📖 Hadits: {item.dalil}
                          </p>
                        )}
                        {!item.hideFadhilah && item.fadhilah && (
                          <p className="text-[11px] text-emerald-700/80 font-medium line-clamp-1">
                            ✨ Fadhilah: {item.fadhilah}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 mr-1">
                          <button
                            onClick={() => handleMoveZikirOrder(index, 'up')}
                            disabled={index === 0}
                            title="Pindah ke Atas"
                            className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30 disabled:hover:text-slate-500"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveZikirOrder(index, 'down')}
                            disabled={index === filteredItems.length - 1}
                            title="Pindah ke Bawah"
                            className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30 disabled:hover:text-slate-500"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleEditZikir(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteZikir(item.id, item.title)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
                          title="Hapus Zikir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RANGKAIAN ZIKIR MANAGEMENT (CUSTOM PLAYLISTS) */}
          {activeTab === 'rangkaian' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-emerald-700" />
                    Manajemen Rangkaian Zikir (Playlists)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kustomisasi rangkaian doa: tentukan zikir, hilangkan bilangan, sembunyikan hadits, dan edit fadhilah khusus per zikir.
                  </p>
                </div>
                <button
                  onClick={handleAddNewRangkaian}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Rangkaian Baru</span>
                </button>
              </div>

              {/* Rangkaian List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedRangkaianList.map((r, index) => {
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-2xl p-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                              {r.iconEmoji || '📿'}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-base">{r.title}</h4>
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {r.zikirIds.length} Zikir dalam rangkaian
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              onClick={() => handleMoveRangkaianOrder(index, 'up')}
                              disabled={index === 0}
                              title="Pindah ke Atas"
                              className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveRangkaianOrder(index, 'down')}
                              disabled={index === sortedRangkaianList.length - 1}
                              title="Pindah ke Bawah"
                              className="p-1 text-slate-500 hover:text-emerald-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {r.description || 'Tidak ada deskripsi.'}
                        </p>

                        {/* List preview of zikirs in this playlist */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Urutan Bacaan & Pengaturan:
                          </span>
                          {r.zikirIds.length === 0 ? (
                            <p className="text-xs text-amber-700 italic">
                              (Belum ada zikir yang dipilih untuk rangkaian ini)
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {r.zikirIds.map((zId, i) => {
                                const matchedZ = zikirItems.find((z) => z.id === zId);
                                if (!matchedZ) return null;
                                const cfg = r.itemsConfig?.[zId];
                                const hasTarget = cfg?.hasTargetCount !== undefined ? cfg.hasTargetCount : (matchedZ.targetCount > 0);
                                const targetCount = hasTarget ? (cfg?.customTargetCount || matchedZ.targetCount) : 0;
                                const hasCustomFadhilah = cfg?.customFadhilah && cfg.customFadhilah.trim() !== '';

                                return (
                                  <span
                                    key={zId}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                                  >
                                    <span className="font-mono text-emerald-700 font-bold">{i + 1}.</span>
                                    <span className="truncate max-w-[120px]">{matchedZ.title}</span>
                                    <span className="text-emerald-800 font-mono font-medium">
                                      ({hasTarget ? `${targetCount}x` : 'Tanpa Bilangan'})
                                    </span>
                                    {hasCustomFadhilah && (
                                      <span className="text-[10px] text-amber-600 font-bold" title="Fadhilah Dikustom">
                                        ✨
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditRangkaian(r)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Kustomisasi Rangkaian & Fadhilah</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRangkaian(r.id, r.title)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
                          title="Hapus Rangkaian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE SPREADSHEET DATABASE SYNC */}
          {activeTab === 'sheets' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {syncFeedback && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    syncFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    <p className="font-semibold">{syncFeedback.type === 'success' ? 'Sukses' : 'Perhatian'}</p>
                    <p>{syncFeedback.message}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Status Integrasi Google Spreadsheet</h3>
                      <p className="text-xs text-slate-500">
                        Sinkronisasi realtime untuk data zikir dan rangkaian zikir di semua perangkat
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        sheetConfig.status === 'connected'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          sheetConfig.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {sheetConfig.status === 'connected' ? 'Terhubung (Cloud Active)' : 'Belum Terhubung'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      URL Aplikasi Web Google Apps Script (Web App URL)
                    </label>
                    <input
                      type="url"
                      value={webAppUrlInput}
                      onChange={(e) => setWebAppUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
                    />
                  </div>

                  <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoSyncInput}
                      onChange={(e) => setAutoSyncInput(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Otomatis sinkronkan ke Google Sheet setiap kali Admin menambah atau mengubah data
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      onClick={handleSaveSheetConfig}
                      disabled={isSyncing}
                      className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Menghubungkan...' : 'Simpan & Uji Koneksi'}</span>
                    </button>

                    {sheetConfig.webAppUrl && (
                      <>
                        <button
                          onClick={handlePushToSheet}
                          disabled={isSyncing}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm border border-slate-300 flex items-center gap-1.5 transition-all"
                        >
                          <Upload className="w-4 h-4 text-emerald-700" />
                          <span>Kirim Data Lokal ke Sheet</span>
                        </button>
                        <button
                          onClick={() => handleSyncNow()}
                          disabled={isSyncing}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm border border-slate-300 flex items-center gap-1.5 transition-all"
                        >
                          <Download className="w-4 h-4 text-teal-700" />
                          <span>Tarik Data dari Sheet</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {sheetConfig.lastSyncedAt && (
                  <p className="text-[11px] text-slate-400 pt-1">
                    Terakhir disinkronkan: {sheetConfig.lastSyncedAt}
                  </p>
                )}
              </div>

              {/* Step-by-Step Tutorial Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                      ?
                    </span>
                    Panduan Menghubungkan Google Spreadsheet
                  </h3>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Apps Script'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">Google Apps Script (Code.gs):</span>
                    <button onClick={handleCopyCode} className="text-emerald-700 font-semibold hover:underline">
                      {copiedCode ? 'Kode Tersalin!' : 'Salin Semua'}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-700" />
                  Cadangan & Pemulihan Data
                </h3>
                <p className="text-xs text-slate-600">
                  Ekspor seluruh data zikir dan rangkaian ke file JSON untuk dicadangkan secara offline, atau pulihkan data kapan saja.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan JSON</span>
                  </button>

                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm border border-slate-300 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <span>Pulihkan dari File JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Reset to authentic defaults */}
              <div className="bg-red-50/50 rounded-2xl p-5 border border-red-200 space-y-3">
                <h4 className="font-bold text-red-900 text-sm flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-700" />
                  Kembalikan ke Koleksi Zikir Bawaan
                </h4>
                <p className="text-xs text-red-700/90 leading-relaxed">
                  Mengatur ulang seluruh zikir dan rangkaian ke kompilasi standar yang shahih (Zikir Pagi, Petang, Setelah Sholat Fardhu). Data kustom akan ditimpa.
                </p>
                <button
                  onClick={handleResetToDefault}
                  className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Reset ke Zikir Bawaan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT ZIKIR MASTER */}
      {isEditingModalOpen && editingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-300" />
                {isNewItem ? 'Tambah Zikir & Doa Baru' : 'Edit Detail Zikir Master'}
              </h3>
              <button onClick={() => setIsEditingModalOpen(false)} className="text-emerald-200 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZikir} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Judul Zikir / Doa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    placeholder="Contoh: Membaca Ayat Kursi / Sayyidul Istighfar"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kategori Zikir *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    placeholder="Ketik kategori bebas..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-emerald-900"
                  />
                </div>
              </div>

              {/* PENGATURAN TARGET BILANGAN */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.hasTargetCount !== false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditingItem({
                          ...editingItem,
                          hasTargetCount: checked,
                          targetCount: checked ? (editingItem.targetCount || 33) : 0,
                        });
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Tetapkan Target Bilangan Hitungan (Zikir Count)
                    </span>
                  </label>
                  {editingItem.hasTargetCount === false && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Tanpa Jumlah Bilangan
                    </span>
                  )}
                </div>

                {editingItem.hasTargetCount !== false ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        required
                        value={editingItem.targetCount || 1}
                        onChange={(e) => setEditingItem({ ...editingItem, targetCount: Number(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Misalnya: 33 kali, 100 kali, 3 kali, atau 1 kali.</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingItem.repeatNote || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, repeatNote: e.target.value })}
                        placeholder="Catatan pengulangan (misal: Dibaca 33x)"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Zikir ini disetting tidak ada jumlah bilangannya. Pengguna dapat membaca dan menghayati secara bebas tanpa batasan target hitungan.
                  </p>
                )}
              </div>

              {/* Kalimat Arab */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kalimat Zikir Arab (Lengkap Harakat) *
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">Font Arab Amiri</span>
                </div>
                <textarea
                  required
                  rows={3}
                  dir="rtl"
                  value={editingItem.arabic}
                  onChange={(e) => setEditingItem({ ...editingItem, arabic: e.target.value })}
                  placeholder="سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"
                  className="w-full px-3.5 py-2.5 text-lg font-arabic bg-emerald-50/40 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950 leading-loose"
                />
              </div>

              {/* Tulisan Latin */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tulisan Latin (Transliterasi) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingItem.latin}
                  onChange={(e) => setEditingItem({ ...editingItem, latin: e.target.value })}
                  placeholder="Subhaanallaahi wa bihamdih..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 italic"
                />
              </div>

              {/* Terjemahan / Arti */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Arti / Terjemahan Bahasa Indonesia *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingItem.translation}
                  onChange={(e) => setEditingItem({ ...editingItem, translation: e.target.value })}
                  placeholder="Maha Suci Allah dan segala puji bagi-Nya..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* KOLOM TERPISAH 1: HADITS & DALIL RIWAYAT */}
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!editingItem.hideHadits}
                      onChange={(e) => setEditingItem({ ...editingItem, hideHadits: !e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      Tampilkan Hadits Riwayat & Dalil
                    </span>
                  </label>
                  {editingItem.hideHadits && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Tidak Ada Hadits
                    </span>
                  )}
                </div>

                {!editingItem.hideHadits && (
                  <textarea
                    rows={2}
                    value={editingItem.dalil || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, dalil: e.target.value })}
                    placeholder="Contoh: HR. Bukhari no. 6306. Siapa yang membacanya..."
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-950"
                  />
                )}
              </div>

              {/* KOLOM TERPISAH 2: FADHILAH & KEUTAMAAN KHUSUS */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!editingItem.hideFadhilah}
                      onChange={(e) => setEditingItem({ ...editingItem, hideFadhilah: !e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Tampilkan Fadhilah & Keutamaan Khusus (Kolom Terpisah)
                    </span>
                  </label>
                  {editingItem.hideFadhilah && (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Tidak Ada Fadhilah
                    </span>
                  )}
                </div>

                {!editingItem.hideFadhilah && (
                  <textarea
                    rows={2}
                    value={editingItem.fadhilah || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, fadhilah: e.target.value })}
                    placeholder="Contoh: Menghapuskan dosa walau sebanyak buih di lautan..."
                    className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-950 font-medium"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
                >
                  {isNewItem ? 'Simpan Zikir Baru' : 'Perbarui Zikir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT RANGKAIAN ZIKIR (DENGAN KUSTOMISASI BILANGAN, HADITS, & EDIT FADHILAH PER ZIKIR) */}
      {isRangkaianModalOpen && editingRangkaian && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-amber-300" />
                {isNewRangkaian ? 'Tambah Rangkaian Zikir Baru' : 'Kustomisasi Rangkaian Doa & Zikir'}
              </h3>
              <button onClick={() => setIsRangkaianModalOpen(false)} className="text-emerald-200 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs in Rangkaian Modal */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setRangkaianModalSubTab('info')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  rangkaianModalSubTab === 'info'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                1. Info Rangkaian
              </button>
              <button
                type="button"
                onClick={() => setRangkaianModalSubTab('select')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  rangkaianModalSubTab === 'select'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span>2. Pilih Zikir</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-extrabold">
                  {editingRangkaian.zikirIds.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRangkaianModalSubTab('customize')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  rangkaianModalSubTab === 'customize'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>3. Kustomisasi Bilangan, Hadits & Fadhilah ({editingRangkaian.zikirIds.length})</span>
              </button>
            </div>

            <form onSubmit={handleSaveRangkaian} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* SUBTAB 1: INFO RANGKAIAN */}
              {rangkaianModalSubTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nama Rangkaian Zikir *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingRangkaian.title}
                        onChange={(e) => setEditingRangkaian({ ...editingRangkaian, title: e.target.value })}
                        placeholder="Contoh: Zikir Pagi / Rangkaian Doa Pembuka Rezeki"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Ikon Emoji
                      </label>
                      <input
                        type="text"
                        value={editingRangkaian.iconEmoji}
                        onChange={(e) => setEditingRangkaian({ ...editingRangkaian, iconEmoji: e.target.value })}
                        placeholder="🌅"
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Deskripsi Rangkaian
                    </label>
                    <textarea
                      rows={2}
                      value={editingRangkaian.description}
                      onChange={(e) => setEditingRangkaian({ ...editingRangkaian, description: e.target.value })}
                      placeholder="Penjelasan singkat mengenai keutamaan waktu atau tujuan membaca rangkaian ini..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setRangkaianModalSubTab('select')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-xs hover:bg-emerald-600 transition-colors"
                    >
                      Lanjut ke Pilih Zikir →
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PILIH ZIKIR */}
              {rangkaianModalSubTab === 'select' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Pilih Zikir yang Masuk ke Rangkaian</h4>
                      <p className="text-xs text-slate-500">Centang zikir yang ingin dimasukkan. ({editingRangkaian.zikirIds.length} dipilih)</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = zikirItems.map((z) => z.id);
                          const nextConfig: Record<string, RangkaianZikirEntry> = {};
                          zikirItems.forEach((z) => {
                            nextConfig[z.id] = editingRangkaian.itemsConfig?.[z.id] || {
                              zikirId: z.id,
                              hasTargetCount: z.targetCount > 0,
                              customTargetCount: z.targetCount || 33,
                              hideHadits: z.hideHadits || false,
                              hideFadhilah: z.hideFadhilah || false,
                              customFadhilah: z.fadhilah || '',
                            };
                          });
                          setEditingRangkaian({
                            ...editingRangkaian,
                            zikirIds: allIds,
                            itemsConfig: nextConfig,
                          });
                        }}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setEditingRangkaian({ ...editingRangkaian, zikirIds: [], itemsConfig: {} })}
                        className="text-slate-500 hover:underline"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-72 overflow-y-auto space-y-1.5">
                    {zikirItems.map((item) => {
                      const isChecked = editingRangkaian.zikirIds.includes(item.id);
                      const selectedIndex = editingRangkaian.zikirIds.indexOf(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleZikirInRangkaian(item.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="text-xs font-bold">{item.title}</span>
                              <span className="text-[11px] text-slate-400 ml-2">({item.category})</span>
                            </div>
                          </div>

                          {isChecked && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-700 text-white font-bold shrink-0">
                              Urutan #{selectedIndex + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Setelah mencentang, buka tab berikutnya untuk mengatur bilangan, hadits, dan fadhilah.
                    </span>
                    <button
                      type="button"
                      onClick={() => setRangkaianModalSubTab('customize')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold shadow-xs hover:bg-emerald-600 transition-colors"
                    >
                      Kustomisasi Zikir ({editingRangkaian.zikirIds.length}) →
                    </button>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: KUSTOMISASI BILANGAN, HADITS & EDIT FADHILAH PER ZIKIR DALAM RANGKAIAN */}
              {rangkaianModalSubTab === 'customize' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                      Pengaturan Khusus Setiap Zikir dalam Rangkaian Ini:
                    </p>
                    <p className="mt-0.5 text-emerald-800">
                      Admin dapat mengatur apakah zikir memiliki target bilangan atau <strong>tidak ada jumlah bilangannya</strong>, apakah <strong>tidak ada hadits/fadhilah</strong>, serta <strong>mengedit kolom fadhilah khusus</strong> untuk rangkaian doa ini.
                    </p>
                  </div>

                  {editingRangkaian.zikirIds.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                      <p className="font-bold text-sm text-slate-700">Belum ada zikir yang dipilih</p>
                      <p className="text-xs">Silakan buka tab "2. Pilih Zikir" terlebih dahulu untuk memilih zikir.</p>
                      <button
                        type="button"
                        onClick={() => setRangkaianModalSubTab('select')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Buka Pilihan Zikir
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingRangkaian.zikirIds.map((zId, idx) => {
                        const matchedZ = zikirItems.find((z) => z.id === zId);
                        if (!matchedZ) return null;

                        const cfg = editingRangkaian.itemsConfig?.[zId] || {
                          zikirId: zId,
                          hasTargetCount: matchedZ.hasTargetCount !== undefined ? matchedZ.hasTargetCount : matchedZ.targetCount > 0,
                          customTargetCount: matchedZ.targetCount || 33,
                          hideHadits: matchedZ.hideHadits || false,
                          hideFadhilah: matchedZ.hideFadhilah || false,
                          customFadhilah: matchedZ.fadhilah || '',
                        };

                        const hasTarget = cfg.hasTargetCount !== false;
                        const hideHadits = cfg.hideHadits === true;
                        const hideFadhilah = cfg.hideFadhilah === true;
                        const fadhilahValue = cfg.customFadhilah !== undefined ? cfg.customFadhilah : (matchedZ.fadhilah || '');

                        return (
                          <div
                            key={zId}
                            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
                          >
                            {/* Card Top: Order, Title, & Up/Down Actions */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-mono text-xs flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm">{matchedZ.title}</h5>
                                  <span className="text-[10px] text-slate-400">Kategori asal: {matchedZ.category}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveZikirInRangkaian(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Pindah ke Atas"
                                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveZikirInRangkaian(idx, 'down')}
                                  disabled={idx === editingRangkaian.zikirIds.length - 1}
                                  title="Pindah ke Bawah"
                                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleZikirInRangkaian(zId)}
                                  title="Hapus dari rangkaian"
                                  className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 ml-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* PENGATURAN 1: BILANGAN HITUNGAN DALAM RANGKAIAN */}
                            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasTarget}
                                  onChange={(e) =>
                                    handleUpdateZikirConfigInRangkaian(zId, {
                                      hasTargetCount: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                />
                                <span className="text-xs font-bold text-slate-800">
                                  Tetapkan Target Bilangan Hitungan
                                </span>
                              </label>

                              {hasTarget ? (
                                <div className="flex items-center gap-2 pt-1 pl-6">
                                  <span className="text-xs text-slate-600">Jumlah target:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10000"
                                    value={cfg.customTargetCount || matchedZ.targetCount || 1}
                                    onChange={(e) =>
                                      handleUpdateZikirConfigInRangkaian(zId, {
                                        customTargetCount: Number(e.target.value) || 1,
                                      })
                                    }
                                    className="w-24 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <span className="text-xs text-slate-500 font-medium">kali hitungan</span>
                                </div>
                              ) : (
                                <p className="text-[11px] text-amber-700 font-medium pl-6">
                                  ✨ Disetting <strong>tidak ada jumlah bilangannya</strong> (bacaan bebas, tombol selesai/lanjut langsung aktif).
                                </p>
                              )}
                            </div>

                            {/* PENGATURAN 2: HADITS RIWAYAT DALAM RANGKAIAN */}
                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-1">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!hideHadits}
                                  onChange={(e) =>
                                    handleUpdateZikirConfigInRangkaian(zId, {
                                      hideHadits: !e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                />
                                <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                  Tampilkan Hadits Riwayat
                                </span>
                              </label>

                              {hideHadits ? (
                                <p className="text-[11px] text-slate-500 italic pl-6">
                                  Hadits disetting tidak ditampilkan pada rangkaian ini.
                                </p>
                              ) : (
                                <p className="text-[11px] text-amber-900/80 line-clamp-1 italic pl-6">
                                  "{matchedZ.dalil || 'Tidak ada riwayat hadits.'}"
                                </p>
                              )}
                            </div>

                            {/* PENGATURAN 3: EDIT FADHILAH KHUSUS RANGKAIAN (KOLOM BERBEDA DENGAN HADITS) */}
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!hideFadhilah}
                                    onChange={(e) =>
                                      handleUpdateZikirConfigInRangkaian(zId, {
                                        hideFadhilah: !e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                  />
                                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    Tampilkan Fadhilah Keutamaan
                                  </span>
                                </label>
                                {hideFadhilah && (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    Fadhilah Disembunyikan
                                  </span>
                                )}
                              </div>

                              {!hideFadhilah && (
                                <div className="space-y-1 pl-6">
                                  <label className="block text-[11px] font-bold text-emerald-900">
                                    Kolom Edit Fadhilah untuk Rangkaian Ini (Berbeda dengan Hadits):
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={fadhilahValue}
                                    onChange={(e) =>
                                      handleUpdateZikirConfigInRangkaian(zId, {
                                        customFadhilah: e.target.value,
                                      })
                                    }
                                    placeholder="Tuliskan fadhilah atau keutamaan khusus saat zikir ini dibaca dalam rangkaian doa ini..."
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-950 focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <p className="text-[10px] text-emerald-700/80">
                                    Fadhilah ini khusus ditampilkan saat zikir dibaca dalam rangkaian "{editingRangkaian.title}".
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRangkaianModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
                >
                  {isNewRangkaian ? 'Simpan Rangkaian Baru' : 'Perbarui Rangkaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
