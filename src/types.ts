export type AppLanguage = 'mr' | 'hi' | 'en';

export interface ToolCallLog {
  iteration: number;
  server: string;
  tool_name: string;
  arguments: Record<string, any>;
  result: Record<string, any>;
  duration_ms: number;
}

export interface DocumentSource {
  source: string;
  page: number;
  title: string;
  score: number;
}

export interface AgentQueryResult {
  answer: string;
  language: AppLanguage;
  tool_calls: ToolCallLog[];
  sources: DocumentSource[];
  timings: {
    stt_ms?: number;
    agent_ms: number;
    tools_ms: number;
    tts_ms?: number;
    total_ms: number;
  };
}

export interface WeatherDay {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_probability_pct: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  condition: string;
}

export interface WeatherData {
  success: boolean;
  location: string;
  forecast: WeatherDay[];
  timestamp?: string;
  error?: string;
}

export interface MandiData {
  success: boolean;
  source?: string;
  commodity: string;
  district: string;
  market?: string;
  state?: string;
  modal_price?: number;
  min_price?: number;
  max_price?: number;
  unit?: string;
  arrival_date?: string;
  message?: string;
}

export interface MCPServerInfo {
  name: string;
  transport: string;
  status: 'online' | 'standby';
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: AppLanguage;
  audioUrl?: string;
  resultData?: AgentQueryResult;
}
