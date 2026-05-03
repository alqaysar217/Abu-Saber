'use server';
/**
 * @fileOverview AI Chat agent for querying business data using OpenRouter.
 * 
 * - smartChat - Handles the conversation logic and context injection.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof MessageSchema>;

/**
 * دالة الشات الذكي التي تتصل بـ OpenRouter مع حقن بيانات قاعدة البيانات كـ Context
 * تم تعديلها لتعيد نصوصاً بدلاً من رمي الأخطاء لتجنب مشاكل Next.js Serialization
 */
export async function smartChat(history: ChatMessage[], contextData: any): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return 'عذراً، مفتاح API الخاص بـ OpenRouter غير متوفر حالياً. يرجى مراجعة إعدادات الخادم.';

  try {
    const systemPrompt = `أنت "مساعد أبو صابر الذكي"، الخبير المالي والمساعد الإداري الأول لتجارة الأسماك.

مهمتك الأساسية: الإجابة على أسئلة المستخدم بناءً على البيانات الحقيقية المرفقة لك في "السياق" أدناه.

قواعد العمل والرد (التزم بها حرفياً):
1. التنسيق بالجداول: استخدم جداول Markdown دائماً عند عرض القوائم، التقارير، المبيعات، المشتريات، أو قائمة الديون.
2. الثقة والدقة: لا تعتذر عن نقص البيانات إذا كانت موجودة في السياق. ابحث جيداً في حقول "items" داخل "recentSales" و "recentPurchases".
3. الأرقام الإنجليزية: استخدم الأرقام الإنجليزية (1, 2, 3...) دائماً في إجاباتك وداخل الجداول.
4. الذكاء السياقي: إذا سألك المستخدم عن تفاصيل فاتورة معينة، ابحث عنها في القوائم واعرض الأصناف والكميات.
5. الاختصار غير المخل: أعطِ المعلومة مباشرة دون مقدمات طويلة.
6. إذا كانت المعلومة غير موجودة نهائياً، قل "عذراً، هذه التفصيلة غير مسجلة حالياً" واقترح أقرب معلومة مفيدة.

السياق الحالي الشامل لقاعدة البيانات (Data Snapshot):
${JSON.stringify(contextData, null, 2)}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://abosaber.com',
        'X-Title': 'Abu Saber Management',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: messages,
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter Error:', errText);
      return 'عذراً، واجهت مشكلة في الاتصال بمزود الذكاء الاصطناعي. يرجى المحاولة لاحقاً.';
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'عذراً، لم أستطع صياغة رد مناسب حالياً.';

  } catch (error: any) {
    console.error('Chat Flow Exception:', error);
    return 'حدث خطأ فني غير متوقع في نظام الشات الذكي. يرجى التأكد من استقرار الإنترنت وتكرار الطلب.';
  }
}
