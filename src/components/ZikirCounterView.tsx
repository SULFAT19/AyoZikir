import React, { useState, useEffect, useRef } from 'react';
import { ZikirItem } from '../types/zikir';
import { playTasbihClick, playCompletionChime, triggerHaptic } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  RotateCcw,
  Minus,
  Sparkles,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Type,
  Share2,
} from 'lucide-react';

interface ZikirCounterViewProps {
  item: ZikirItem;
  playlistItems?: ZikirItem[];
  currentIndex?: number;
  onNextZikir?: () => void;
  onPrevZikir?: () => void;
  onBackToHome: () => void;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  onRecordCount: (count: number) => void;
}

export const ZikirCounterView: React.FC<ZikirCounterViewProps> = ({
  item,
  playlistItems = [],
  currentIndex = 0,
  onNextZikir,
  onPrevZikir,
  onBackToHome,
  soundEnabled,
  vibrateEnabled,
  onRecordCount,
}) => {
  const [count, setCount] = useState(0);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'huge'>('large');
  const [isCopied, setIsCopied] = useState(false);
  const [isCompletedCelebrated, setIsCompletedCelebrated] = useState(false);

  const target = item.targetCount || 1;
  const isTargetReached = count >= target;
  const progressPercent = Math.min(100, Math.round((count / target) * 100));

  const hasNext = playlistItems.length > 0 && currentIndex < playlistItems.length - 1;
  const nextItem = hasNext ? playlistItems[currentIndex + 1] : null;

  // Reset count whenever the item changes
  useEffect(() => {
    setCount(0);
    setIsCompletedCelebrated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [item.id]);

  // Handle keyboard spacebar navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleIncrement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [count, target, soundEnabled, vibrateEnabled]);

  // Increment counter
  const handleIncrement = () => {
    const nextCount = count + 1;
    setCount(nextCount);
    onRecordCount(1);
    playTasbihClick(soundEnabled);
    triggerHaptic(vibrateEnabled);

    // If reaching target
    if (nextCount === target && !isCompletedCelebrated) {
      setIsCompletedCelebrated(true);
      playCompletionChime(soundEnabled);
      triggerConfetti();
    }
  };

  // Decrement counter
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count > 0) {
      setCount((prev) => prev - 1);
      triggerHaptic(vibrateEnabled);
    }
  };

  // Reset counter
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Ulangi hitungan zikir ini dari 0?')) {
      setCount(0);
      setIsCompletedCelebrated(false);
    }
  };

  // Confetti celebration
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#10b981', '#059669', '#f59e0b', '#34d399', '#fbbf24'],
      });
    } catch (e) {
      // Graceful
    }
  };

  // Copy Zikir
  const handleCopy = () => {
    const textToCopy = `${item.title}\n\n${item.arabic}\n\nLatin:\n${item.latin}\n\nArti:\n${item.translation}\n\nDalil: ${item.dalil}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Font size styling
  const arabicTextClass = {
    normal: 'text-2xl leading-loose',
    large: 'text-3xl sm:text-4xl leading-[2.5]',
    huge: 'text-4xl sm:text-5xl leading-[2.8]',
  }[fontSizeLevel];

  // SVG Circular progress radius
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-5 animate-fade-in pb-24">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-xs sm:text-sm font-semibold transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        {playlistItems.length > 1 && (
          <div className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
            <span>Zikir {currentIndex + 1} dari {playlistItems.length}</span>
          </div>
        )}

        {/* Font size toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setFontSizeLevel(fontSizeLevel === 'normal' ? 'large' : fontSizeLevel === 'large' ? 'huge' : 'normal')}
            title="Ubah Ukuran Tulisan Arab"
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase">{fontSizeLevel}</span>
          </button>
        </div>
      </div>

      {/* Main Dhikr Display Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-emerald-100/80 shadow-xl shadow-emerald-900/5 space-y-6 relative overflow-hidden">
        {/* Subtle decorative Islamic arch accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-100/40 to-transparent rounded-bl-full pointer-events-none" />

        {/* Header Title & Tags */}
        <div className="space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {item.repeatNote || `Dibaca ${target} kali`}
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                title="Salin Teks Zikir & Arti"
                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-600 hover:text-emerald-800 text-xs transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 pt-1">
            {item.title}
          </h2>
        </div>

        {/* Arabic Text Display */}
        <div className="bg-gradient-to-b from-emerald-50/50 to-teal-50/30 p-5 sm:p-7 rounded-2xl border border-emerald-100 text-right shadow-inner">
          <p
            className={`font-arabic text-emerald-950 font-normal select-text transition-all tracking-wide ${arabicTextClass}`}
            dir="rtl"
          >
            {item.arabic}
          </p>
        </div>

        {/* Latin Transliteration */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Transliterasi Latin
          </span>
          <p className="text-sm sm:text-base text-emerald-900/90 italic font-medium leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
            "{item.latin}"
          </p>
        </div>

        {/* Translation (Arti) */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Terjemahan / Arti
          </span>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            {item.translation}
          </p>
        </div>

        {/* Hadith / Dalil Box */}
        {item.dalil && (
          <div className="bg-amber-50/70 border-l-4 border-amber-500 p-3.5 sm:p-4 rounded-r-2xl space-y-1 text-xs sm:text-sm text-amber-900">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Dalil & Keutamaan Shahih:</span>
            </div>
            <p className="leading-relaxed text-amber-900/90 pl-5">
              {item.dalil}
            </p>
            {item.fadhilah && (
              <p className="font-semibold text-emerald-800 text-xs pl-5 pt-0.5">
                ✨ Fadhilah: {item.fadhilah}
              </p>
            )}
          </div>
        )}
      </div>

      {/* TACTILE DIGITAL TASBIH COUNTER SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-xl shadow-emerald-900/10 space-y-5 text-center relative overflow-hidden">
        {/* Target Reached Banner */}
        {isTargetReached && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce-short">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="font-bold text-sm sm:text-base">
              Alhamdulillah! Target {target}x Telah Tercapai
            </span>
          </div>
        )}

        {/* Counter Visual Progress & Huge Number */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-100"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Foreground progress ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="transition-all duration-300 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke={isTargetReached ? '#059669' : '#10b981'}
                fill="transparent"
              />
            </svg>

            {/* Inner Content Inside Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Zikir Count
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-emerald-950 font-mono my-1">
                {count}
              </div>
              <div className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Target: {target}x
              </div>
            </div>
          </div>
        </div>

        {/* Big Tactile Tap Button */}
        <div className="space-y-3">
          <button
            onClick={handleIncrement}
            className={`w-full py-5 sm:py-6 rounded-2xl text-white font-extrabold text-lg sm:text-xl shadow-xl active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
              isTargetReached
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-700/25 ring-4 ring-emerald-300/40'
                : 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-800/25'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl">📿</span>
              <span>{isTargetReached ? '+ Lanjut Hitung Lagi' : 'SENTUH UNTUK HITUNG'}</span>
            </span>
            <span className="text-[11px] font-normal text-emerald-200/90 hidden sm:inline">
              (Bisa juga tekan tombol Spasi di keyboard)
            </span>
          </button>

          {/* Quick Sub-Controls: Minus 1, Reset */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={handleDecrement}
              disabled={count === 0}
              title="Kurangi 1 hitungan bila salah pencet"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Kurangi 1</span>
            </button>

            <button
              onClick={handleReset}
              disabled={count === 0}
              title="Ulangi dari 0"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Hitungan</span>
            </button>
          </div>
        </div>

        {/* When target is reached, action buttons appear prominently */}
        {isTargetReached && (
          <div className="pt-4 border-t border-slate-100 space-y-2 animate-fade-in">
            {hasNext ? (
              <button
                onClick={onNextZikir}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Lanjutkan ke Zikir Berikutnya ({nextItem?.title})</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onBackToHome}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Selesai & Kembali ke Beranda</span>
              </button>
            )}

            <button
              onClick={onBackToHome}
              className="text-xs text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors"
            >
              Kembali ke Daftar Semua Zikir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
