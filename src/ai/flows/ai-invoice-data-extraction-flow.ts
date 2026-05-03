'use server';
/**
 * @fileOverview An AI agent for extracting data from handwritten invoices.
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

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return aiInvoiceDataExtractionFlow(input);
}

const aiInvoiceDataExtractionPrompt = ai.definePrompt({
  name: 'aiInvoiceDataExtractionPrompt',
  input: { schema: ExtractInvoiceDataInputSchema },
  output: { schema: ExtractInvoiceDataOutputSchema },
  prompt: `أنت مساعد ذكاء اصطناعي خبير في جرد محلات الأسماك. 
قم بتحليل صورة الفاتورة المرفقة واستخرج البيانات التالية: (نوع السمك، الكمية، سعر الكيلو).

قواعد هامة جداً:
1. إذا كانت الأرقام مكتوبة بالخط العربي (مثل: ١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩، ٠) قم بتحويلها فوراً إلى أرقام إنجليزية (1, 2, 3...) لإتمام العمليات الحسابية.
2. لا تتجاهل الأرقام الصغيرة أو الكسور.
3. احسب الإجمالي لكل صنف بدقة (الكمية × السعر).
4. أعد البيانات حصراً بتنسيق JSON.

الصورة: {{media url=invoiceImageDataUri}}`,
});

const aiInvoiceDataExtractionFlow = ai.defineFlow(
  {
    name: 'aiInvoiceDataExtractionFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async (input) => {
    // المفتاح الأمني محمي في إعدادات Genkit بالخادم
    const { output } = await aiInvoiceDataExtractionPrompt(input);
    if (!output) {
      throw new Error('فشل في استخراج البيانات. يرجى التأكد من وضوح الصورة وتكرار المحاولة.');
    }
    return output;
  }
);
