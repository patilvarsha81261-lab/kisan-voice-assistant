import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, AlertCircle, CornerDownLeft } from 'lucide-react';
import { AppLanguage } from '../types';

interface VoiceInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  selectedLanguage: AppLanguage | 'auto';
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onSendMessage,
  isLoading,
  selectedLanguage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Set language code
      if (selectedLanguage === 'mr') {
        recognition.lang = 'mr-IN';
      } else if (selectedLanguage === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (selectedLanguage === 'en') {
        recognition.lang = 'en-IN';
      } else {
        recognition.lang = 'mr-IN'; // Default to Marathi in Maharashtra context
      }

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setTranscriptPreview('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setInputText(final);
          setTranscriptPreview(final);
          // Auto submit when final speech recognized
          setTimeout(() => {
            onSendMessage(final);
            setTranscriptPreview('');
          }, 300);
        } else {
          setTranscriptPreview(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('मायक्रोफोन परवानगी नाकारली गेली. कृपया ब्राउझरमध्ये परवानगी द्या.');
        } else if (event.error === 'no-speech') {
          setSpeechError('कोणताही आवाज ऐकू आला नाही. कृपया पुन्हा बोला.');
        } else {
          setSpeechError(`आवाज ओळखण्यात अडचण: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [selectedLanguage, onSendMessage]);

  const toggleListening = () => {
    setSpeechError(null);
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          console.error(e);
          setSpeechError('मायक्रोफोन सुरू करता आला नाही. कृपया पुन्हा प्रयत्न करा.');
        }
      } else {
        setSpeechError('या ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही. कृपया खाली टाइप करा.');
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setTranscriptPreview('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-4 transition-all">
      {/* Speech Error Banner */}
      {speechError && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Listening Mode Bar */}
      {isListening && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-green-500/15 to-emerald-500/10 border border-emerald-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full animate-bounce" />
              <span className="w-1.5 h-6 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-8 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="w-1.5 h-5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.45s]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                मी ऐकत आहे... (Listening in {selectedLanguage === 'mr' ? 'मराठी' : selectedLanguage === 'hi' ? 'हिंदी' : 'English'})
              </p>
              <p className="text-xs text-emerald-700 italic">
                {transcriptPreview || 'आपला शेतीविषयक प्रश्न स्पष्ट बोला...'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleListening}
            className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium cursor-pointer"
          >
            थांबवा (Stop)
          </button>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
        {/* Large Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          className={`relative group flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-105 animate-pulse'
              : 'bg-gradient-to-br from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white shadow-md shadow-emerald-700/20 active:scale-95'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isListening ? 'Stop listening' : 'Click to speak question'}
        >
          {isListening ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <>
              <Mic className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-white rounded-full animate-ping" />
            </>
          )}
        </button>

        {/* Text Input Box */}
        <div className="relative flex-grow w-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedLanguage === 'mr'
                ? 'येथे प्रश्न विचारा (उदा. कोल्हापुरात उसाचा दर काय आहे? आणि उद्या पाऊस पडेल का?)'
                : selectedLanguage === 'hi'
                ? 'यहाँ प्रश्न पूछें (उदा. कल पुणे में बारिश होगी क्या और सोयाबीन का भाव क्या है?)'
                : 'Ask farming question (e.g., Sugarcane price in Kolhapur & will it rain tomorrow?)'
            }
            disabled={isLoading}
            className="w-full px-4 py-3.5 pr-24 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-800 placeholder-gray-400 text-sm sm:text-base outline-none transition-all"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-2.5 rounded-lg text-white transition-all cursor-pointer ${
                inputText.trim() && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Submit query"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Helper text */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>व्हॉइस (मायक्रोफोन) किंवा थेट मराठी/इंग्रजीत टाइप करून विचारा</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1">
          Enter दाबा <CornerDownLeft className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
};
