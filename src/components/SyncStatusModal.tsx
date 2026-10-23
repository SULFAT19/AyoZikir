import React, { useState } from 'react';
import { GoogleSheetConfig } from '../types/zikir';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetConfig: GoogleSheetConfig;
  onOpenAdmin: () => void;
  onSyncNow: () => Promise<void>;
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  isOpen,
  onClose,
  sheetConfig,
  onOpenAdmin,
  onSyncNow,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Status Google Spreadsheet</h3>
              <p className="text-xs text-emerald-200">Penyimpanan Database Cloud Realtime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-medium text-slate-700">Status Koneksi:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                sheetConfig.status === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetConfig.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {sheetConfig.status === 'connected' ? 'Terhubung (Realtime)' : 'Penyimpanan Lokal'}
            </span>
          </div>

          {sheetConfig.webAppUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Aplikasi ini terhubung ke Google Spreadsheet Anda. Setiap perubahan yang dibuat Admin akan otomatis tersimpan ke Cloud dan dapat diakses dari perangkat mana pun secara realtime.
              </p>
              {sheetConfig.lastSyncedAt && (
                <p className="text-xs text-emerald-700 font-medium">
                  Terakhir diperbarui: {sheetConfig.lastSyncedAt}
                </p>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Ulang Sekarang'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Spreadsheet belum dihubungkan. Saat ini data tersimpan di penyimpanan browser lokal. Masuk ke Dasbor Admin untuk menghubungkan Google Spreadsheet Anda agar data tersimpan di cloud secara permanen dan realtime!
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Buka Dasbor Admin untuk Hubungkan</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
