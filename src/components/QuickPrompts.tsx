import React from 'react';
import { Tag, CloudRain, IndianRupee, ShieldAlert, Sparkles, BookOpen, Layers } from 'lucide-react';
import { AppLanguage } from '../types';

interface QuickPromptsProps {
  onSelectPrompt: (query: string) => void;
  language: AppLanguage | 'auto';
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt, language }) => {
  const marathiPrompts = [
    {
      category: 'दोन साधने (Combined 2 Tools)',
      query: 'कोल्हापूर मध्ये आज उसाचा भाव काय आहे आणि उद्या पाऊस पडेल का?',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    },
    {
      category: 'बाजारभाव (Mandi)',
      query: 'कोल्हापुरात आज उसाचा दर काय आहे?',
      icon: IndianRupee,
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    },
    {
      category: 'हवामान (Weather)',
      query: 'कोल्हापुरात उद्या पाऊस पडेल का?',
      icon: CloudRain,
      color: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
    },
    {
      category: 'कृषी सल्ला (RAG Advisory)',
      query: 'उसाची पाने पिवळी पडत आहेत काय फवारावे?',
      icon: BookOpen,
      color: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
    },
    {
      category: 'कीड नियंत्रण (Pest Control)',
      query: 'सोयाबीनवर चक्री भुंगा आला आहे काय उपाय करावा?',
      icon: ShieldAlert,
      color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
    },
    {
      category: 'सरकारी योजना (PM-KISAN)',
      query: 'पीएम किसान योजनेत किती पैसे मिळतात आणि कोण अपात्र आहे?',
      icon: Tag,
      color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
    },
    {
      category: 'मर्यादा चाचणी (Out-of-Scope)',
      query: 'बिटकॉइन कसा खरेदी करावा?',
      icon: Sparkles,
      color: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
    },
  ];

  const hindiPrompts = [
    {
      category: 'दो टूल्स (Combined)',
      query: 'कोल्हापुर में आज गन्ने का क्या भाव है और कल बारिश होगी क्या?',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    },
    {
      category: 'मंडी भाव (Mandi)',
      query: 'लातूर मंडी में सोयाबीन का भाव क्या है?',
      icon: IndianRupee,
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    },
    {
      category: 'मौसम (Weather)',
      query: 'पुणे में कल बारिश होगी क्या?',
      icon: CloudRain,
      color: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
    },
    {
      category: 'फसल सलाह (RAG)',
      query: 'सोयाबीन में गेरूई या रस्ट रोग के लक्षण और फफूंदनाशक दवा बताएं',
      icon: BookOpen,
      color: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
    },
    {
      category: 'पीएम किसान (Scheme)',
      query: 'पीएम किसान योजना में सालाना कितनी राशि मिलती है और कौन अपात्र है?',
      icon: Tag,
      color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
    },
  ];

  const englishPrompts = [
    {
      category: 'Combined (2 Tools)',
      query: 'What is the sugarcane price in Kolhapur and will it rain tomorrow?',
      icon: Layers,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    },
    {
      category: 'Mandi Price',
      query: 'What is the modal price of grapes in Nashik today?',
      icon: IndianRupee,
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    },
    {
      category: 'Weather Forecast',
      query: 'Will it rain tomorrow in Kolhapur?',
      icon: CloudRain,
      color: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
    },
    {
      category: 'Crop Advisory (RAG)',
      query: 'My sugarcane leaves are turning yellow what should I spray?',
      icon: BookOpen,
      color: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
    },
    {
      category: 'Pest Advisory (RAG)',
      query: 'What pesticide is recommended for soybean girdle beetle?',
      icon: ShieldAlert,
      color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
    },
    {
      category: 'Government Scheme',
      query: 'How much financial support is given under PM-KISAN per year?',
      icon: Tag,
      color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
    },
  ];

  const promptList =
    language === 'hi' ? hindiPrompts : language === 'en' ? englishPrompts : marathiPrompts;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>नमुने प्रश्न (Sample Farmer Questions - Click to Ask):</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {promptList.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.query)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border font-medium transition-all shadow-xs active:scale-95 text-left cursor-pointer ${item.color}`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{item.query}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
