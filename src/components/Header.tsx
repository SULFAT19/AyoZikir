import React from 'react';
import { Lock, Volume2, VolumeX, Smartphone, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { GoogleSheetConfig } from '../types/zikir';

interface HeaderProps {
  onOpenAdmin: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  vibrateEnabled: boolean;
  onToggleVibrate: () => void;
  sheetConfig: GoogleSheetConfig;
  onOpenSheetSync: () => void;
  isAdminLoggedIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  soundEnabled,
  onToggleSound,
  vibrateEnabled,
  onToggleVibrate,
  sheetConfig,
  onOpenSheetSync,
  isAdminLoggedIn,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-emerald-900/95 backdrop-blur-md text-white border-b border-emerald-800 shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg border border-emerald-400/30 group-hover:scale-105 transition-transform">
            <span className="text-xl">📿</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                Ayo Zikir
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Islami
                </span>
              </h1>
            </div>
            <p className="text-xs text-emerald-200/80 hidden sm:block">
              Penenang Hati & Pengingat Ilahi Sehari-hari
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Google Sheet Sync Indicator Pill - ONLY shown when admin is logged in */}
          {isAdminLoggedIn && (
            <button
              onClick={onOpenSheetSync}
              title={sheetConfig.webAppUrl ? 'Database Google Sheets Terhubung' : 'Sambungkan ke Google Spreadsheet'}
              className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                sheetConfig.status === 'connected'
                  ? 'bg-emerald-800/80 text-emerald-200 border-emerald-600/60 hover:bg-emerald-700/80'
                  : 'bg-emerald-950/60 text-emerald-300/80 border-emerald-800 hover:text-white hover:bg-emerald-900'
              }`}
            >
              {sheetConfig.status === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium">Sheets Aktif</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Sheet</span>
                </>
              )}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
            title={soundEnabled ? 'Suara Aktif (Klik untuk Membisukan)' : 'Suara Bisu'}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-emerald-800 text-emerald-200 border-emerald-700 hover:bg-emerald-700'
                : 'bg-emerald-950/70 text-slate-400 border-emerald-900 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Haptic Toggle */}
          <button
            onClick={onToggleVibrate}
            aria-label={vibrateEnabled ? 'Getar Aktif' : 'Getar Mati'}
            title={vibrateEnabled ? 'Getaran Sentuh Aktif' : 'Getaran Mati'}
            className={`p-2 rounded-lg border transition-all hidden sm:flex ${
              vibrateEnabled
                ? 'bg-emerald-800 text-emerald-200 border-emerald-700 hover:bg-emerald-700'
                : 'bg-emerald-950/70 text-slate-400 border-emerald-900 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Admin Lock Button - Cukup ikon gembok kecil di pojok kanan atas tanpa tulisan teks */}
          <button
            onClick={onOpenAdmin}
            aria-label="Akses Dasbor Admin"
            title={isAdminLoggedIn ? 'Dasbor Admin (Aktif)' : 'Dasbor Admin'}
            className={`p-2 rounded-lg border transition-all shadow-sm ${
              isAdminLoggedIn
                ? 'bg-amber-500 text-emerald-950 border-amber-400 hover:bg-amber-400'
                : 'bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 border-emerald-600 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
