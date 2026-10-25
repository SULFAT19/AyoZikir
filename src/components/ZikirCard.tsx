import React from 'react';
import { ZikirItem, ZikirCategory } from '../types/zikir';
import { ArrowRight, BookOpen, Hash, CheckCircle2 } from 'lucide-react';

interface ZikirCardProps {
  item: ZikirItem;
  onSelect: (item: ZikirItem) => void;
}

const CATEGORY_STYLES: Record<
  ZikirCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  pagi: {
    label: 'Zikir Pagi',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  petang: {
    label: 'Zikir Petang',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
  },
  sholat: {
    label: 'Setelah Shalat',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  harian: {
    label: 'Doa Harian',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
  },
  tidur: {
    label: 'Sebelum Tidur',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  tasbih: {
    label: 'Tasbih',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
};

export const ZikirCard: React.FC<ZikirCardProps> = ({ item, onSelect }) => {
  const catStyle = CATEGORY_STYLES[item.category?.toLowerCase()] || {
    label: item.category || 'Zikir',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  };
  const categoryLabel = item.category || 'Zikir';

  return (
    <div
      onClick={() => onSelect(item)}
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="space-y-3">
        {/* Header Tags */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            {categoryLabel}
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {item.hasTargetCount === false || item.targetCount <= 0
              ? 'Tanpa Bilangan'
              : `${item.targetCount}x`}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-800 transition-colors line-clamp-1">
          {item.title}
        </h3>

        {/* Arabic Snippet */}
        <p
          className="font-arabic text-emerald-950 text-lg leading-loose line-clamp-2 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/50 text-right"
          dir="rtl"
        >
          {item.arabic}
        </p>

        {/* Latin Transliteration */}
        <p className="text-xs text-slate-600 line-clamp-1 italic font-medium">
          "{item.latin}"
        </p>

        {/* Translation Snippet */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {item.translation}
        </p>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[65%]">
          {!item.hideHadits && item.dalil
            ? item.dalil
            : !item.hideFadhilah && item.fadhilah
            ? `✨ ${item.fadhilah}`
            : item.repeatNote || 'Riwayat Shahih'}
        </span>
        <button className="flex items-center gap-1 font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors">
          <span>Mulai Zikir</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
