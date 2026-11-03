import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  Clock,
  Server,
  Code2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { AgentQueryResult } from '../types';

interface ToolInspectionDrawerProps {
  resultData?: AgentQueryResult;
}

export const ToolInspectionDrawer: React.FC<ToolInspectionDrawerProps> = ({ resultData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'sources' | 'timings' | 'mcp'>('tools');

  if (!resultData) return null;

  const toolCalls = resultData.tool_calls || [];
  const sources = resultData.sources || [];
  const timings = resultData.timings;

  return (
    <div className="mt-3 border border-emerald-200/80 rounded-xl overflow-hidden bg-emerald-50/40 text-xs">
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-emerald-100/60 hover:bg-emerald-100 text-emerald-950 font-medium transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-700" />
          <span>Show sources and tool calls ({toolCalls.length} tools, {sources.length} docs cited)</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-800">
          <span className="text-[11px] font-mono bg-emerald-200/70 px-2 py-0.5 rounded-full">
            {timings.total_ms}ms
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3 bg-white border-t border-emerald-200/80 space-y-3">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100 pb-2">
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'tools'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Tool Calls ({toolCalls.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sources')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Citations ({sources.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('timings')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'timings'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Latencies</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'mcp'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>MCP Protocol</span>
            </button>
          </div>

          {/* Tab 1: Tool Calls */}
          {activeTab === 'tools' && (
            <div className="space-y-2">
              {toolCalls.length === 0 ? (
                <p className="text-gray-500 italic py-2">
                  No MCP tools were required (direct refusal or general greeting).
                </p>
              ) : (
                toolCalls.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 space-y-1.5 font-mono"
                  >
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-semibold text-emerald-800">
                        Iteration #{log.iteration}: {log.tool_name}
                      </span>
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                        {log.duration_ms} ms
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 font-sans">
                      Server: <span className="font-mono text-gray-700">{log.server}</span>
                    </div>

                    {/* Arguments */}
                    <div className="text-[11px] bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                      <span className="text-gray-400 font-sans block mb-0.5">Arguments:</span>
                      <pre className="text-gray-800 text-[10.5px]">
                        {JSON.stringify(log.arguments, null, 2)}
                      </pre>
                    </div>

                    {/* Result */}
                    <div className="text-[11px] bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-40 overflow-y-auto">
                      <span className="text-gray-400 font-sans block mb-0.5">Output Data:</span>
                      <pre className="text-gray-800 text-[10.5px]">
                        {JSON.stringify(log.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Sources & Citations */}
          {activeTab === 'sources' && (
            <div className="space-y-2">
              {sources.length === 0 ? (
                <p className="text-gray-500 italic py-2">
                  No RAG document retrieved for this specific question.
                </p>
              ) : (
                sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                        <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span>{src.source}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">
                        Title: {src.title || 'Agricultural Advisory Sheet'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Page: {src.page}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Relevance Score: {src.score}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Grounded
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Latencies */}
          {activeTab === 'timings' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase">STT Speech</div>
                  <div className="text-sm font-bold text-gray-800 font-mono">
                    {timings.stt_ms ? `${timings.stt_ms}ms` : '0ms (Text)'}
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase">MCP Tools</div>
                  <div className="text-sm font-bold text-emerald-700 font-mono">
                    {timings.tools_ms}ms
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase">Agent Synthesis</div>
                  <div className="text-sm font-bold text-blue-700 font-mono">
                    {timings.agent_ms}ms
                  </div>
                </div>
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 font-semibold uppercase">Total Time</div>
                  <div className="text-sm font-bold text-emerald-900 font-mono">
                    {timings.total_ms}ms
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 text-center">
                ⚡ Optimized for standard laptop CPUs without required GPU acceleration.
              </p>
            </div>
          )}

          {/* Tab 4: MCP Architecture */}
          {activeTab === 'mcp' && (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Model Context Protocol (FastMCP) Tool Pipeline</span>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">
                  The LLM agent discovers tools via standard JSON-RPC schema definitions and calls:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-white border border-gray-100">
                    <span className="font-mono text-emerald-700 font-semibold">weather_server</span>
                    <p className="text-gray-500">Open-Meteo 7-day live rain & wind</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-gray-100">
                    <span className="font-mono text-emerald-700 font-semibold">mandi_server</span>
                    <p className="text-gray-500">Agmarknet daily APMC price data</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-gray-100">
                    <span className="font-mono text-emerald-700 font-semibold">schemes_server</span>
                    <p className="text-gray-500">PM-KISAN & PMFBY guidelines</p>
                  </div>
                  <div className="p-2 rounded bg-white border border-gray-100">
                    <span className="font-mono text-emerald-700 font-semibold">crop_advisories</span>
                    <p className="text-gray-500">ICAR & MPKV Rahuri hybrid RAG</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
