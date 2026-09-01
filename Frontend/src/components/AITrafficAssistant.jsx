import React, { useState } from 'react';
import { Bot, Send, Sparkles, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function AITrafficAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your AI Traffic Copilot. Ask me about congestion predictions, weather impact, DBSCAN accident hotspots, or alternate route recommendations!",
      actions: ["⚡ Rush hour forecast", "🌧️ Heavy rain advisory", "🚨 High-risk hazard zones"]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      const aiMsg = {
        sender: 'ai',
        text: data.reply,
        actions: data.suggested_actions || [],
        confidence: data.confidence
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: "⚠️ Unable to connect to FastAPI AI Assistant backend. Please ensure backend is running." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[420px] h-full bg-[#0d121d]/95 border-r border-slate-800 p-5 z-10 flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              AI Traffic Copilot
            </h2>
            <p className="text-[11px] text-slate-400">Traffic Intelligence Chatbot</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([messages[0]])}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          title="Reset Conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-1 font-sans">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}
            
            <div className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none' 
                : 'bg-[#141b29] border border-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center text-slate-400 text-xs py-2">
            <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center animate-pulse">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>Analyzing spatial telemetry...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="pt-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask traffic copilot..."
          className="flex-1 bg-[#141b29] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
