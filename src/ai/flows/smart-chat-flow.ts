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

const ChatInputSchema = z.object({
  history: z.array(MessageSchema),
  contextData: z.any().describe('Current business stats and data snapshot'),
});

export type ChatMessage = z.infer<typeof MessageSchema>;

/**
 * دالة الشات الذكي التي تتصل بـ OpenRouter مع حقن بيانات قاعدة البيانات كـ Context
 */
export async function smartChat(history: ChatMessage[], contextData: any) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Configuration error: Missing API Key');

  try {
    const systemPrompt = `أنت "مساعد أبو صابر الذكي"، الخبير المالي والمساعد الإداري الأول لتجارة الأسماك.

مهمتك الأساسية: الإجابة على أسئلة المستخدم بناءً على البيانات الحقيقية المرفقة لك في "السياق" أدناه.

قواعد العمل والرد (التزم بها حرفياً):
1. التنسيق بالجداول: استخدم جداول Markdown دائماً عند عرض القوائم، التقارير، المبيعات، المشتريات، أو قائمة الديون.
2. الثقة والدقة: لا تعتذر عن نقص البيانات إذا كانت موجودة في السياق. ابحث جيداً في حقول "items" داخل "recentSales" و "recentPurchases".
3. الأرقام الإنجليزية: استخدم الأرقام الإنجليزية (1, 2, 3...) دائماً في إجاباتك وداخل الجداول.
4. الذكاء السياقي: إذا سألك المستخدم عن تفاصيل فاتورة معينة (مثلاً P-0004)، ابحث عنها في قائمة المشتريات واعرض الأصناف الموجودة في حقل "items" الخاص بها.
5. الاختصار غير المخل: لا تكرر إجاباتك السابقة ولا تعتذر بشكل متكرر. أعطِ المعلومة مباشرة.
6. إذا كانت المعلومة فعلاً غير موجودة بعد بحث عميق، قل "عذراً، هذه التفصيلة غير مسجلة في النظام حالياً" واعرض أقرب معلومة مفيدة متعلقة بها.

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
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: messages,
        temperature: 0.1, // تقليل الحرارة لضمان الدقة ومنع التكرار
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter Error:', err);
      throw new Error('فشل الاتصال بمزود الذكاء الاصطناعي');
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة الرد.';

  } catch (error: any) {
    console.error('Chat Flow Error:', error);
    throw new Error('حدث خطأ في نظام الشات الذكي.');
  }
}
