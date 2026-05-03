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
  quantity: z.number().describe('الكمية المستخرجة بالكيلوجرام.'),
  pricePerKg: z.number().describe('سعر الكيلو المستخرج بالريال اليمني.'),
  totalItemPrice: z.number().describe('إجمالي الصنف (الكمية × السعر).'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  fishItems: z.array(FishItemSchema).describe('قائمة أصناف الأسماك المستخرجة.'),
  totalInvoiceAmount: z.number().describe('الإجمالي النهائي للفاتورة بالكامل.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

/**
 * دالة استخراج البيانات باستخدام OpenRouter لضمان عمل المفتاح الأمني المزود.
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
      throw new Error('فشل التكوين: مفتاح OPENROUTER_API_KEY غير موجود في إعدادات الخادم.');
    }

    try {
      // استخدام fetch المباشر كما في الكود المجرب للمستخدم لضمان التوافق مع OpenRouter
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
                  text: `أنت مساعد ذكاء اصطناعي خبير في جرد محلات الأسماك. 
قم بتحليل صورة الفاتورة المرفقة واستخرج البيانات التالية بدقة عالية: (نوع السمك، الكمية، سعر الكيلو).

قواعد هامة جداً للنتائج:
1. إذا كانت الأرقام مكتوبة بالخط العربي (مثل: ١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩، ٠) قم بتحويلها فوراً إلى أرقام إنجليزية (1, 2, 3...) لإتمام العمليات الحسابية.
2. لا تتجاهل الأرقام الصغيرة أو الكسور العشرية.
3. احسب الإجمالي لكل صنف بدقة (الكمية × السعر).
4. أعد البيانات حصراً بتنسيق JSON مطابق تماماً لهذا الهيكل:
{
  "fishItems": [
    {
      "fishType": "نوع السمك",
      "quantity": 10.5,
      "pricePerKg": 5000,
      "totalItemPrice": 52500
    }
  ],
  "totalInvoiceAmount": 52500
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
        throw new Error('حدث خطأ في الاتصال بمزود الذكاء الاصطناعي. يرجى التأكد من صلاحية المفتاح.');
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
