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
    const systemPrompt = `أنت "مساعد أبو صابر الذكي"، الخبير المالي والمساعد الإداري الأول لتجارة الأسماك الخاصة بالمستخدم.

مهمتك الأساسية: الإجابة على أسئلة المستخدم بناءً على البيانات الحقيقية المرفقة لك في "السياق" أدناه.

قواعد العمل والرد (التزم بها حرفياً):
1. التنسيق بالجداول: أنت قادر تماماً على إنشاء جداول Markdown. عندما يطلب المستخدم تقارير، مبيعات، مشتريات، أو قائمة ديون، اعرضها في "جدول منسق" يحتوي على أعمدة واضحة (الاسم، المبلغ، التاريخ، الحالة، الأصناف).
2. لغة الأرقام: استخدم الأرقام الإنجليزية (1, 2, 3...) دائماً في إجاباتك وداخل الجداول لسهولة القراءة والحساب.
3. الذكاء السياقي: تذكر الأسئلة السابقة. إذا سأل "كم دين محمد؟" ثم سأل "ومتى آخر دفعة دفعها؟"، فافهم أن السؤال عن "محمد".
4. الصدق والدقة: لا تخترع بيانات (لا ت هلوس). إذا كانت المعلومة غير موجودة في السياق، قل "عذراً، هذه التفصيلة غير مسجلة في النظام حالياً".
5. الاختصار المفيد: كن مختصراً، أعطِ الأرقام والخلاصات مباشرة دون مقدمات طويلة، إلا إذا طلب المستخدم تفاصيل.
6. لا تعتذر عن التقنية: لا تقل "أنا لا أستطيع إنشاء جداول" أو "لا أملك وصولاً". أنت تملك الوصول لكل ما هو موجود في "السياق" أدناه.

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
        temperature: 0.2, // تقليل الحرارة لضمان دقة الأرقام وعدم الهلوسة
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
