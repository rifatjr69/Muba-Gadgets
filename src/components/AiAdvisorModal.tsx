import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { askAiGadgetAdvisor } from '../services/aiAdvisor';

const MAROON = '#7A1F3D';
const MAROON_DARK = '#5E1630';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({ isOpen, onClose, products }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি মুবা গ্যাজেটস এআই অ্যাসিস্ট্যান্ট। আপনার বাজেট কত এবং কেমন গ্যাজেট (স্মার্টওয়াচ, ইয়ারবাড বা পাওয়ার ব্যাংক) খুঁজছেন বলুন, সেরা সাজেশন দিচ্ছি!'
    }
  ]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    const productContext = products.map(p => `- ${p.name} (${p.short_description}): ৳${p.price}`).join('\n');
    const aiResponse = await askAiGadgetAdvisor(userText, productContext);

    setMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[80vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div 
          className="p-4 text-white rounded-t-3xl flex items-center justify-between"
          style={{ backgroundColor: MAROON }}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm">মুবা AI গ্যাজেট এডভাইজর</h3>
              <p className="text-[10px] text-rose-200 font-medium">পাওয়ারড বাই Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  msg.role === 'user' ? 'text-white' : 'bg-slate-800 text-white'
                }`}
                style={msg.role === 'user' ? { backgroundColor: MAROON } : undefined}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div 
                className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'text-white rounded-tr-none' 
                    : 'bg-white text-gray-900 shadow-xs border border-gray-200 rounded-tl-none font-medium'
                }`}
                style={msg.role === 'user' ? { backgroundColor: MAROON } : undefined}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-700 bg-white p-3 rounded-2xl w-fit shadow-xs border border-gray-200 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-[#7A1F3D]" />
              <span>চিন্তা করছি...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 rounded-b-3xl">
          <input
            type="text"
            placeholder="আপনার বাজেট বা পছন্দের গ্যাজেট সম্পর্কে লিখুন..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1F3D]"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#7A1F3D] hover:bg-[#5E1630] text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
