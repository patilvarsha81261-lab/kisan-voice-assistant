import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Share2,
  Trash2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { Header } from './components/Header';
import { VoiceInput } from './components/VoiceInput';
import { QuickPrompts } from './components/QuickPrompts';
import { MandiWeatherTicker } from './components/MandiWeatherTicker';
import { ToolInspectionDrawer } from './components/ToolInspectionDrawer';
import { McpNetworkModal } from './components/McpNetworkModal';
import { AppLanguage, ChatMessage, AgentQueryResult } from './types';

export default function App() {
  const [language, setLanguage] = useState<AppLanguage | 'auto'>('auto');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'नमस्कार शेतकरी बंधूंनो! मी आपला "किसान व्हॉइस सहाय्यक" आहे. आपण मला कोल्हापूर/सांगली/पुणे येथील उसाचा वा इतर पिकांचा बाजारभाव, उद्याचे हवामान, पिकांवरील रोग व कीड नियंत्रण (उदा. उसाची पिवळी पाने, सोयाबीन चक्री भुंगा) किंवा पीएम किसान योजनेबद्दल विचारू शकता. खालील माईकचे बटण दाबून बोला किंवा प्रश्न निवडा!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'mr',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean and speak answer using browser SpeechSynthesis or Audio API
  const speakResponse = async (text: string, lang: AppLanguage, messageId: string) => {
    if (isAudioMuted) return;

    // Stop existing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setCurrentPlayingId(messageId);

    // 1. Try server-side TTS
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });
      const data = await res.json();

      if (data.success && data.audio_base64) {
        const audio = new Audio(`data:${data.mime_type || 'audio/wav'};base64,${data.audio_base64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setCurrentPlayingId(null);
        audio.onerror = () => setCurrentPlayingId(null);
        await audio.play();
        return;
      }
    } catch {
      // fallback
    }

    // 2. Browser SpeechSynthesis Fallback
    if ('speechSynthesis' in window) {
      // Strip markdown and document citations before speaking
      const speechText = text
        .replace(/\[Document:[^\]]+\]/gi, '')
        .replace(/[\*_~`#]/g, '')
        .replace(/₹/g, ' रुपये ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;

      utterance.onend = () => setCurrentPlayingId(null);
      utterance.onerror = () => setCurrentPlayingId(null);

      window.speechSynthesis.speak(utterance);
    } else {
      setCurrentPlayingId(null);
    }
  };

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    const tStart = Date.now();

    try {
      const response = await fetch('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          language: language === 'auto' ? undefined : language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result: AgentQueryResult = await response.json();
      result.timings.total_ms = Date.now() - tStart;

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: result.language,
        resultData: result,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      // Speak aloud immediately
      speakResponse(result.answer, result.language, assistantMsgId);
    } catch (err: any) {
      setIsLoading(false);
      const fallbackMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content:
          'क्षमस्व, नेटवर्क अथवा प्रणालीमध्ये अडचण आली आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: 'mr',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  };

  const handleClearChat = () => {
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    window.speechSynthesis?.cancel();
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: 'नवीन संभाषण सुरू झाले आहे. आपला प्रश्न विचारा.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: 'mr',
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/20 to-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        onOpenMcpModal={() => setIsMcpModalOpen(true)}
        isAudioMuted={isAudioMuted}
        onToggleMute={() => {
          setIsAudioMuted(!isAudioMuted);
          if (!isAudioMuted) {
            audioPlayerRef.current?.pause();
            window.speechSynthesis?.cancel();
            setCurrentPlayingId(null);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* Anti-Hallucination & Safety Guarantee Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-green-950 text-emerald-100 px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              <strong className="text-white">सत्यतेची हमी (Zero Hallucination):</strong> उपलब्ध नसलेली माहिती आम्ही कधीही तयार (invent) करत नाही. सर्व कृषी सल्ला मूळ ICAR / MPKV दस्तऐवजांच्या पान क्रमांकासह दिला जातो.
            </span>
          </div>
          <button
            onClick={() => setIsMcpModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
          >
            साधने तपासा
          </button>
        </div>

        {/* Live Mandi & Weather Glance Ticker */}
        <MandiWeatherTicker />

        {/* Chat Stream Window */}
        <div className="flex-1 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100/80 shadow-sm p-4 sm:p-5 flex flex-col gap-4 min-h-[380px] max-h-[560px] overflow-y-auto">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPlaying = currentPlayingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-emerald-50/50 text-gray-800 border border-emerald-100 rounded-tl-none'
                  }`}
                >
                  {/* Content text */}
                  <div className="space-y-1">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Audio Reply Player / Actions for Assistant messages */}
                  {!isUser && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => speakResponse(msg.content, msg.language || 'mr', msg.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                            isPlaying
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs'
                          }`}
                          title="Speak answer aloud"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-bounce' : ''}`} />
                          <span>{isPlaying ? 'वाचत आहे...' : 'ऐका (Listen)'}</span>
                        </button>

                        {msg.language && (
                          <span className="text-[10.5px] text-emerald-800 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            {msg.language.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Tool Inspection Collapsible Box for Assistant messages */}
                  {!isUser && msg.resultData && (
                    <ToolInspectionDrawer resultData={msg.resultData} />
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-900 text-emerald-100 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing / Agent Tool Loop Thinking indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                </div>
                <span>
                  साधने व दस्तऐवज तपासत आहे (Executing FastMCP Weather, Mandi, and Hybrid RAG)...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Sample Prompts */}
        <QuickPrompts onSelectPrompt={handleSendMessage} language={language} />

        {/* Fixed / Bottom Voice Input Component */}
        <div className="sticky bottom-2 z-20">
          <VoiceInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedLanguage={language}
          />
        </div>

        {/* Footer info & Clear chat */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-2">
          <div className="flex items-center gap-2">
            <span>🌾 अधिकृत कृषी सल्ला: ICAR-SBI, MPKV राहुरी, PM-KISAN मार्गदर्शक तत्त्वे</span>
          </div>
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 hover:text-red-600 transition-colors cursor-pointer"
            title="नवीन संभाषण सुरू करा"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>चॅट रीसेट करा</span>
          </button>
        </div>
      </main>

      {/* MCP Architecture Modal */}
      <McpNetworkModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />
    </div>
  );
}
