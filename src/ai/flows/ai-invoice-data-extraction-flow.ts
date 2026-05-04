'use server';
/**
 * @fileOverview An AI agent for extracting data from handwritten invoices using OpenRouter.
 *
 * - extractInvoiceData - A function that handles the invoice data extraction process.
 * - ExtractInvoiceDataInput - The input type for the extractInvoiceData function.
 * - ExtractInvoiceDataOutput - The return type for the extractInvoiceData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceImageDataUri: z
    .string()
    .describe(
      "A photo of a handwritten invoice, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const FishItemSchema = z.object({
  fishType: z.string().describe('نوع السمك المستخرج من الفاتورة.'),
  quantity: z.number().describe('الكمية المستخرجة بالأرقام الإنجليزية.'),
  pricePerKg: z.number().describe('سعر الكيلو المستخرج بالأرقام الإنجليزية.'),
  totalItemPrice: z.number().describe('إجمالي الصنف (الكمية × السعر).'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  fishItems: z.array(FishItemSchema).describe('قائمة أصناف الأسماك المستخرجة.'),
  totalInvoiceAmount: z.number().describe('الإجمالي النهائي للفاتورة بالكامل.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

/**
 * دالة استخراج البيانات باستخدام OpenRouter مع تركيز فائق على دقة الخط اليدوي العربي.
 */
export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return aiInvoiceDataExtractionFlow(input);
}

const aiInvoiceDataExtractionFlow = ai.defineFlow(
  {
    name: 'aiInvoiceDataExtractionFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('CRITICAL: OPENROUTER_API_KEY is missing from environment variables.');
      throw new Error('فشل التكوين: مفتاح API غير موجود. يرجى إضافته في إعدادات Vercel باسم OPENROUTER_API_KEY.');
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://abosaber.com', 
          'X-Title': 'Abu Saber Fish Management System',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `أنت خبير محترف في تحليل الفواتير العربية المكتوبة بخط اليد وتدقيق حسابات محلات الأسماك.

مهمتك: استخراج (نوع السمك، الكمية، سعر الكيلو) من الصورة المرفقة بدقة 100%.

قواعد ذهبية للدقة (يجب الالتزام بها حرفياً):
1. تدقيق رقم ٦: الرقم (٦) في الخط العربي اليدوي يشبه أحياناً الرقم (7) بالإنجليزية. تأكد من سياق الكتابة وقراءته كـ 6 إنجليزية وليس 7.
2. تدقيق الأصفار: انتبه جيداً للنقاط أو الدوائر الصغيرة التي تمثل الأصفار (٠). لا تتجاهل الأصفار في المبالغ مثل (5000 أو 10000).
3. تحويل الأرقام: حول فوراً وبشكل إلزامي كافة الأرقام من العربية (١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩، ٠) إلى الإنجليزية (1, 2, 3, 4, 5, 6, 7, 8, 9, 0).
4. الكسور: حافظ على الكسور العشرية (مثل 10.5) ولا تقربها.
5. لغة المخرجات: أسماء الأسماك بالعربية، لكن الأرقام يجب أن تكون إنجليزية بحتة داخل ملف JSON.

صيغة الرد المطلوبة (JSON فقط):
{
  "fishItems": [
    {
      "fishType": "اسم السمك",
      "quantity": 12.5,
      "pricePerKg": 5000,
      "totalItemPrice": 62500
    }
  ],
  "totalInvoiceAmount": 62500
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: input.invoiceImageDataUri
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Provider Error:', errorText);
        throw new Error('حدث خطأ في الاتصال بمزود الذكاء الاصطناعي. تأكد من صلاحية المفتاح ورصيد الحساب.');
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('لم يتمكن النموذج من قراءة بيانات الفاتورة بشكل صحيح.');
      }

      const parsedData = JSON.parse(content);
      
      return {
        fishItems: parsedData.fishItems || [],
        totalInvoiceAmount: parsedData.totalInvoiceAmount || 0
      };

    } catch (error: any) {
      console.error('AI Flow Error:', error);
      throw new Error(error.message || 'فشل في تحليل الفاتورة. يرجى التأكد من وضوح الصورة وتكرار المحاولة.');
    }
  }
);
