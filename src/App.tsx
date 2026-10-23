import React, { useState, useEffect } from 'react';
import { ZikirItem, RangkaianItem, GoogleSheetConfig } from './types/zikir';
import {
  getStoredZikirItems,
  saveStoredZikirItems,
  getStoredRangkaianItems,
  saveStoredRangkaianItems,
  getStoredSheetConfig,
  saveStoredSheetConfig,
  fetchFromGoogleSheet,
  saveToGoogleSheet,
} from './services/googleSheetService';
import { Header } from './components/Header';
import { ZikirCard } from './components/ZikirCard';
import { ZikirCounterView } from './components/ZikirCounterView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SyncStatusModal } from './components/SyncStatusModal';
import {
  Sparkles,
  Search,
  BookOpen,
  ChevronRight,
  RefreshCw,
  ListPlus,
} from 'lucide-react';

export default function App() {
  // Database & config state
  const [zikirItems, setZikirItems] = useState<ZikirItem[]>(() => getStoredZikirItems());
  const [rangkaianList, setRangkaianList] = useState<RangkaianItem[]>(() => getStoredRangkaianItems());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => getStoredSheetConfig());

  // App navigation state
  const [activeView, setActiveView] = useState<'home' | 'session'>('home');
  const [activeZikir, setActiveZikir] = useState<ZikirItem | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<ZikirItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Audio & Haptic state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('ayozikir_sound') !== 'false';
  });
  const [vibrateEnabled, setVibrateEnabled] = useState(() => {
    return localStorage.getItem('ayozikir_vibrate') !== 'false';
  });

  // Daily counter stats (internal tracking)
  const [totalCountsToday, setTotalCountsToday] = useState(() => {
    const raw = localStorage.getItem('ayozikir_counts_today');
    return raw ? Number(raw) || 0 : 0;
  });

  // Admin state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('ayozikir_admin_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Save sound & vibrate preferences
  useEffect(() => {
    localStorage.setItem('ayozikir_sound', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('ayozikir_vibrate', String(vibrateEnabled));
  }, [vibrateEnabled]);

  // Initial sync on startup if Google Sheet URL is configured
  useEffect(() => {
    if (sheetConfig.webAppUrl) {
      fetchFromGoogleSheet(sheetConfig.webAppUrl)
        .then((result) => {
          if (result.zikirs && result.zikirs.length > 0) {
            setZikirItems(result.zikirs);
            saveStoredZikirItems(result.zikirs);
            if (result.rangkaian && result.rangkaian.length > 0) {
              setRangkaianList(result.rangkaian);
              saveStoredRangkaianItems(result.rangkaian);
            }
          } else {
            // Jika spreadsheet masih baru/kosong, otomatis inisialisasi data awal ke sheet pengguna
            saveToGoogleSheet(sheetConfig.webAppUrl, zikirItems, rangkaianList).catch(() => {});
          }
          setSheetConfig((prev) => ({
            ...prev,
            status: 'connected',
            lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          }));
        })
        .catch((err) => {
          console.warn('Initial Google Sheet sync skipped or offline:', err);
        });
    }
  }, []);

  // Update zikir items
  const handleUpdateZikirItems = (newItems: ZikirItem[]) => {
    setZikirItems(newItems);
    saveStoredZikirItems(newItems);
  };

  // Update rangkaian list
  const handleUpdateRangkaianList = (newRangkaian: RangkaianItem[]) => {
    setRangkaianList(newRangkaian);
    saveStoredRangkaianItems(newRangkaian);
  };

  // Update sheet config
  const handleUpdateSheetConfig = (newConfig: GoogleSheetConfig) => {
    setSheetConfig(newConfig);
    saveStoredSheetConfig(newConfig);
  };

  // Admin login success
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('ayozikir_admin_auth', 'true');
    setIsAdminDashboardOpen(true);
  };

  // Admin logout
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('ayozikir_admin_auth');
    setIsAdminDashboardOpen(false);
  };

  // Open Admin modal or dashboard
  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminLoginModalOpen(true);
    }
  };

  // Start single Zikir
  const handleStartSingleZikir = (item: ZikirItem) => {
    setActiveZikir(item);
    setActivePlaylist([item]);
    setCurrentIndex(0);
    setActiveView('session');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Custom Playlist (Rangkaian)
  const handleStartPlaylist = (rangkaian: RangkaianItem) => {
    const itemsInPlaylist = rangkaian.zikirIds
      .map((id) => zikirItems.find((z) => z.id === id))
      .filter((z): z is ZikirItem => Boolean(z));

    if (itemsInPlaylist.length > 0) {
      setActivePlaylist(itemsInPlaylist);
      setActiveZikir(itemsInPlaylist[0]);
      setCurrentIndex(0);
      setActiveView('session');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert(`Rangkaian "${rangkaian.title}" belum memiliki zikir. Silakan pilih zikir untuk rangkaian ini di Dasbor Admin.`);
    }
  };

  // Next in playlist
  const handleNextInPlaylist = () => {
    if (currentIndex < activePlaylist.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setActiveZikir(activePlaylist[nextIdx]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveView('home');
    }
  };

  // Record user count
  const handleRecordCount = (count: number) => {
    setTotalCountsToday((prev) => {
      const updated = prev + count;
      localStorage.setItem('ayozikir_counts_today', String(updated));
      return updated;
    });
  };

  // Manual trigger sync from modal
  const handleManualSync = async () => {
    if (!sheetConfig.webAppUrl) return;
    const result = await fetchFromGoogleSheet(sheetConfig.webAppUrl);
    if (result.zikirs && result.zikirs.length > 0) {
      handleUpdateZikirItems(result.zikirs);
    }
    if (result.rangkaian && result.rangkaian.length > 0) {
      handleUpdateRangkaianList(result.rangkaian);
    }
    handleUpdateSheetConfig({
      ...sheetConfig,
      status: 'connected',
      lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    });
  };

  // Unique categories from items for filter buttons
  const uniqueCategories = Array.from(
    new Set(zikirItems.map((item) => item.category?.trim()).filter(Boolean))
  );

  // Filtered catalog list
  const filteredZikirList = zikirItems
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
  const sortedRangkaian = [...rangkaianList].sort((a, b) => a.order - b.order);

  // Theme colors for playlist cards
  const getCardThemeClasses = (colorTheme?: string) => {
    switch (colorTheme) {
      case 'amber':
        return 'from-amber-50 to-orange-50/70 border-amber-200/80 hover:border-amber-400 text-amber-800 icon-bg-amber';
      case 'indigo':
        return 'from-indigo-50 to-sky-50/70 border-indigo-200/80 hover:border-indigo-400 text-indigo-800 icon-bg-indigo';
      case 'teal':
        return 'from-teal-50 to-cyan-50/70 border-teal-200/80 hover:border-teal-400 text-teal-800 icon-bg-teal';
      case 'purple':
        return 'from-purple-50 to-fuchsia-50/70 border-purple-200/80 hover:border-purple-400 text-purple-800 icon-bg-purple';
      case 'rose':
        return 'from-rose-50 to-pink-50/70 border-rose-200/80 hover:border-rose-400 text-rose-800 icon-bg-rose';
      case 'emerald':
      default:
        return 'from-emerald-50 to-teal-50/70 border-emerald-200/80 hover:border-emerald-400 text-emerald-800 icon-bg-emerald';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-800 flex flex-col font-latin">
      {/* Top Header */}
      <Header
        onOpenAdmin={handleOpenAdmin}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        vibrateEnabled={vibrateEnabled}
        onToggleVibrate={() => setVibrateEnabled((prev) => !prev)}
        sheetConfig={sheetConfig}
        onOpenSheetSync={() => setIsSyncModalOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main App Content View */}
      <main className="flex-1">
        {activeView === 'session' && activeZikir ? (
          <ZikirCounterView
            item={activeZikir}
            playlistItems={activePlaylist}
            currentIndex={currentIndex}
            onNextZikir={handleNextInPlaylist}
            onBackToHome={() => setActiveView('home')}
            soundEnabled={soundEnabled}
            vibrateEnabled={vibrateEnabled}
            onRecordCount={handleRecordCount}
          />
        ) : (
          /* HOME CATALOG VIEW */
          <div className="max-w-5xl mx-auto px-4 py-5 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
            {/* Islamic Greeting & Hero Section (tulisan hari ini telah berzikir dihapus sesuai permintaan) */}
            <div className="relative rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-9 shadow-xl shadow-emerald-950/15 overflow-hidden border border-emerald-700/50">
              <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-3 right-4 text-emerald-200/20 text-7xl select-none font-serif">
                ۞
              </div>

              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/60 text-emerald-200 text-xs font-semibold">
                  <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Basahi Lisan dengan Zikir, Tenangkan Jiwa dalam Doa
                </h2>

                <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
                  Aplikasi zikir sehari-hari dengan penghitung tasbih digital interaktif, teks Arab berharakat, transliterasi latin, terjemahan, dan dalil hadits shahih.
                </p>
              </div>
            </div>

            {/* Rangkaian Zikir Utama (Dinamis dari Rangkaian yang Dapat Dikustomisasi oleh Admin) */}
            {sortedRangkaian.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Rangkaian Zikir
                  </h3>
                  <span className="text-xs text-slate-400">Pilih untuk memulai hitungan berurutan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {sortedRangkaian.map((r) => {
                    const theme = getCardThemeClasses(r.colorTheme);
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleStartPlaylist(r)}
                        className={`bg-gradient-to-br border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${theme}`}
                      >
                        <div className="space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-white/80 border border-slate-200/60 flex items-center justify-center font-bold text-xl shadow-xs">
                            <span>{r.iconEmoji || '📿'}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-950 transition-colors">
                            {r.title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {r.description || `${r.zikirIds.length} zikir dalam rangkaian ini.`}
                          </p>
                        </div>
                        <div className="pt-4 flex items-center justify-between text-xs font-bold">
                          <span className="text-[11px] font-medium text-slate-500">
                            {r.zikirIds.length} Zikir
                          </span>
                          <span className="flex items-center gap-1">
                            <span>Mulai Rangkaian</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Daftar Pilihan Zikir & Doa
                </h3>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari zikir, arti, atau ayat..."
                    className="w-full sm:w-72 pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Dynamic Category Filter Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua ({zikirItems.length})
                </button>

                {uniqueCategories.map((cat) => {
                  const count = zikirItems.filter((z) => z.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zikir Grid Cards */}
            {filteredZikirList.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
                <p className="font-bold text-slate-700">Tidak ada zikir yang sesuai</p>
                <p className="text-xs text-slate-400">
                  Coba cari dengan kata kunci lain atau pilih kategori "Semua".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredZikirList.map((item) => (
                  <ZikirCard
                    key={item.id}
                    item={item}
                    onSelect={handleStartSingleZikir}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - Bersih dari indikator spreadsheet dan username admin untuk publik */}
      <footer className="bg-emerald-950 text-emerald-200/80 border-t border-emerald-900 py-6 px-4 mt-12 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-bold text-white text-sm flex items-center justify-center sm:justify-start gap-1.5">
              <span>📿</span> Ayo Zikir
            </p>
            <p className="text-[11px] text-emerald-300/70">
              Disusun berdasarkan Al-Qur'an dan As-Sunnah Ash-Shahihah.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 text-[11px]">
            {isAdminLoggedIn && (
              <>
                <button
                  onClick={() => setIsSyncModalOpen(true)}
                  className="text-emerald-300 hover:text-white underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {sheetConfig.status === 'connected'
                      ? 'Tersinkron ke Google Sheets'
                      : 'Konfigurasi Google Sheets'}
                  </span>
                </button>
                <span className="hidden sm:inline">•</span>
              </>
            )}
            <button
              onClick={handleOpenAdmin}
              className="text-emerald-300/80 hover:text-white transition-colors"
              title="Akses Pengelola"
            >
              Pengelola
            </button>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Full Admin Dashboard */}
      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onLogout={handleAdminLogout}
        zikirItems={zikirItems}
        onUpdateZikirItems={handleUpdateZikirItems}
        rangkaianList={rangkaianList}
        onUpdateRangkaianList={handleUpdateRangkaianList}
        sheetConfig={sheetConfig}
        onUpdateSheetConfig={handleUpdateSheetConfig}
      />

      {/* Google Sheets Sync Status Modal */}
      <SyncStatusModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        sheetConfig={sheetConfig}
        onOpenAdmin={() => {
          setIsSyncModalOpen(false);
          handleOpenAdmin();
        }}
        onSyncNow={handleManualSync}
      />
    </div>
  );
}
