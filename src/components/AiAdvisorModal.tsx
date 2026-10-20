import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { askAiGadgetAdvisor } from '../services/aiAdvisor';

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
        <div className="p-4 bg-[#0052FF] text-white rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <div>
              <h3 className="font-bold text-sm">মুবা AI গ্যাজেট এডভাইজর</h3>
              <p className="text-[10px] text-blue-200">পাওয়ারড বাই Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.role === 'user' ? 'bg-[#0052FF] text-white' : 'bg-purple-600 text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#0052FF] text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white p-3 rounded-2xl w-fit shadow-sm border border-gray-100">
              <Loader2 className="w-4 h-4 animate-spin text-[#0052FF]" />
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
            className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0052FF]"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0052FF] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
