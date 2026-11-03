import React from 'react';
import { Sprout, Server, Languages, Volume2, ShieldCheck } from 'lucide-react';
import { AppLanguage } from '../types';

interface HeaderProps {
  language: AppLanguage | 'auto';
  onLanguageChange: (lang: AppLanguage | 'auto') => void;
  onOpenMcpModal: () => void;
  isAudioMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onOpenMcpModal,
  isAudioMuted,
  onToggleMute,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-emerald-950/90 backdrop-blur-md border-b border-emerald-800/40 text-emerald-50 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Kisan Voice Assistant
                <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  शेतकरी व्हॉइस सहाय्यक
                </span>
              </h1>
            </div>
            <p className="text-xs text-emerald-300/80 flex items-center gap-2">
              <span>FastMCP Protocol</span> • <span>Hybrid RAG (BGE-M3)</span> • <span>Marathi | Hindi | English</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MCP Architecture Modal trigger */}
          <button
            onClick={onOpenMcpModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/50 transition-all cursor-pointer"
            title="Inspect Model Context Protocol (MCP) microservices"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">MCP Network</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg text-xs border transition-colors cursor-pointer ${
              isAudioMuted
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-300'
                : 'bg-emerald-900/50 border-emerald-700/50 text-emerald-200 hover:bg-emerald-800'
            }`}
            title={isAudioMuted ? 'Audio replies muted' : 'Voice audio is active'}
          >
            <Volume2 className={`w-4 h-4 ${isAudioMuted ? 'opacity-40' : ''}`} />
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-emerald-900/70 p-1 rounded-xl border border-emerald-700/50">
            <Languages className="w-3.5 h-3.5 text-emerald-400 ml-1.5 mr-1" />
            <button
              onClick={() => onLanguageChange('auto')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'auto'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => onLanguageChange('mr')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'mr'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'hi'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
