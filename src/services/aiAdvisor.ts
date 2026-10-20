import { GoogleGenAI } from '@google/genai';

export async function askAiGadgetAdvisor(prompt: string, productListContext: string): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      return "আসসালামু আলাইকুম! মুবা গ্যাজেটস এ আপনাকে স্বাগতম। আপনার বাজেট এবং পছন্দের কথা বলুন, আমাদের সেরা গ্যাজেটটি সাজেস্ট করছি। (AI Key not configured, but our support is active at 01717823525)";
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert friendly e-commerce shopping assistant for "Muba Gadgets" in Bangladesh. 
Here are our available products:
${productListContext}

User Question: "${prompt}"

Provide a helpful, friendly, and concise response in Bengali or English (matching the user's language), recommending specific products from our catalog with prices in BDT (৳), and explaining why they match the user's needs. Keep it engaging and polite.`
            }
          ]
        }
      ]
    });

    return response.text || "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে হটলাইনে কল করুন: 01717823525";
  } catch (err) {
    console.error('AI Advisor error:', err);
    return "মুবা গ্যাজেটসে স্বাগতম! আমাদের হটলাইন 01887816106 নম্বরে কল করে আপনার পছন্দের গ্যাজেট অর্ডার করুন।";
  }
}
