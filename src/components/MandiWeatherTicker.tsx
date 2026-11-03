import React from 'react';
import { CloudSun, TrendingUp, ShieldCheck, MapPin } from 'lucide-react';

export const MandiWeatherTicker: React.FC = () => {
  const mandiHighlights = [
    { crop: 'ऊस (Sugarcane)', district: 'Kolhapur', rate: '₹3,300', unit: '/Qtl', change: 'FRP Linked' },
    { crop: 'सोयाबीन (Soybean)', district: 'Latur', rate: '₹4,750', unit: '/Qtl', change: '+₹40' },
    { crop: 'कांदा (Onion)', district: 'Lasalgaon', rate: '₹2,450', unit: '/Qtl', change: 'Stable' },
    { crop: 'द्राक्ष (Grapes)', district: 'Nashik', rate: '₹8,200', unit: '/Qtl', change: 'Pimpalgaon' },
    { crop: 'कापूस (Cotton)', district: 'Akola', rate: '₹7,400', unit: '/Qtl', change: 'APMC Yard' },
  ];

  return (
    <div className="bg-emerald-900/10 border border-emerald-200/80 rounded-2xl p-3 my-4">
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>कृषी बाजारभाव व हवामान जलद दृष्टिक्षेप (Mandi Rates & Weather Ticker)</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>अधिकृत APMC & Open-Meteo डेटा</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {mandiHighlights.map((m, idx) => (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-100 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span className="font-medium text-gray-800 truncate">{m.crop}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono">
                {m.change}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-emerald-950 font-mono">{m.rate}</span>
              <span className="text-[10px] text-gray-500">{m.unit}</span>
            </div>
            <div className="text-[10.5px] text-gray-500 flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-400" />
              <span>{m.district} APMC</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
