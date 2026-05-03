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
    const systemPrompt = `أنت "مساعد أبو صابر الذكي"، خبير في تحليل بيانات تجارة الأسماك الخاصة بالمستخدم.
مهمتك: الإجابة على أسئلة المستخدم بناءً على البيانات الحقيقية المرفقة لك في "السياق".

قواعد العمل:
1. أنت للقراءة فقط: لا يمكنك إضافة أو تعديل بيانات، فقط حلل وأجب.
2. كن مختصراً جداً ودقيقاً: أعطِ الأرقام والخلاصات مباشرة (مثلاً: "دين فلان هو 500,000 ريال").
3. الذكاء السياقي: تذكر الأسئلة السابقة في المحادثة للإجابة على الأسئلة المرتبطة.
4. لغة الأرقام: استخدم الأرقام الإنجليزية دائماً في إجاباتك لسهولة القراءة.
5. إذا سألك المستخدم عن شيء غير موجود في البيانات، قل له بلطف أنك لا تملك هذه المعلومة حالياً.

السياق الحالي لقاعدة البيانات (Data Snapshot):
${JSON.stringify(contextData)}`;

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
        temperature: 0.3, // للحفاظ على دقة الأرقام وتقليل الهلوسة
      })
    });

    if (!response.ok) throw new Error('فشل الاتصال بمزود الذكاء الاصطناعي');

    const result = await response.json();
    return result.choices[0]?.message?.content || 'عذراً، لم أستطع معالجة الرد.';

  } catch (error: any) {
    console.error('Chat Flow Error:', error);
    throw new Error('حدث خطأ في نظام الشات الذكي.');
  }
}
