import React, { useEffect, useState } from 'react';
import { Server, X, CheckCircle, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { MCPServerInfo } from '../types';

interface McpNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpNetworkModal: React.FC<McpNetworkModalProps> = ({ isOpen, onClose }) => {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/mcp/status')
      .then((res) => res.json())
      .then((data) => {
        setServers(data.servers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load MCP status:', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100 p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Model Context Protocol (MCP) Microservices
              </h2>
              <p className="text-xs text-gray-500">
                FastMCP stdio tool servers discovered and called by Kisan Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl mb-4 text-xs text-emerald-950 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">FastMCP Standard Protocol:</span> Tools expose strict typed input schemas (JSON Schema). The LLM agent inspects available tools, requests function execution, receives live data (weather, mandi prices, RAG docs), and synthesizes farmer answers with 0% data fabrication.
          </div>
        </div>

        {/* Server List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-500">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading MCP Server status...
            </div>
          ) : (
            servers.map((srv, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-800">{srv.name}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono">
                      {srv.transport}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Online
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  {srv.tools.map((t, tIdx) => (
                    <div key={tIdx} className="bg-white p-2.5 rounded-lg border border-gray-200/80 text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-semibold mb-1">
                        <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.name}()</span>
                      </div>
                      <p className="text-gray-600 mb-1.5 text-[11.5px]">{t.description}</p>
                      <div className="bg-gray-50 p-1.5 rounded font-mono text-[10.5px] text-gray-700 overflow-x-auto">
                        Parameters: {JSON.stringify(t.parameters)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Max Iterations: 5 loops per question</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
