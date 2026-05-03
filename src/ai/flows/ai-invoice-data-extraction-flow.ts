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
      "A photo of a handwritten invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const FishItemSchema = z.object({
  fishType: z.string().describe('The type of fish (e.g., Tuna, Salmon, Sardine).'),
  quantity: z.number().describe('The quantity of fish in kilograms.'),
  pricePerKg: z.number().describe('The price per kilogram of the fish.'),
  totalItemPrice: z.number().describe('The total price for this specific fish item (quantity * pricePerKg).'),
});

const ExtractInvoiceDataOutputSchema = z.object({
  fishItems: z.array(FishItemSchema).describe('An array of extracted fish items, each with type, quantity, and price.'),
  totalInvoiceAmount: z.number().describe('The calculated total amount of the entire invoice based on all extracted fish items.'),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return aiInvoiceDataExtractionFlow(input);
}

const aiInvoiceDataExtractionPrompt = ai.definePrompt({
  name: 'aiInvoiceDataExtractionPrompt',
  input: { schema: ExtractInvoiceDataInputSchema },
  output: { schema: ExtractInvoiceDataOutputSchema },
  prompt: `أنت مساعد ذكاء اصطناعي خبير في تحليل فواتير جرد الأسماك في اليمن.
مهمتك هي تحليل صورة الفاتورة المرفقة واستخراج البيانات التالية لكل صنف:
1. نوع السمك (مثل: بياض، ثمد، هامور، إلخ).
2. الكمية بالكيلو جرام.
3. سعر الكيلو جرام الواحد بالريال اليمني.

تحذيرات هامة:
- إذا كانت الأرقام مكتوبة بالعربية (مثل: ١، ٢، ٣، ٤، ٥، ٦، ٧، ٨، ٩، ٠) قم بتحويلها فوراً إلى أرقام إنجليزية (1, 2, 3...).
- لا تتجاهل الأرقام الصغيرة أو الكسور.
- قم بحساب الإجمالي لكل صنف (الكمية × السعر) بدقة.
- في النهاية، قم بجمع إجمالي كافة الأصناف.

أعد البيانات حصراً بتنسيق JSON.

الصورة: {{media url=invoiceImageDataUri}}`,
});

const aiInvoiceDataExtractionFlow = ai.defineFlow(
  {
    name: 'aiInvoiceDataExtractionFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async (input) => {
    const { output } = await aiInvoiceDataExtractionPrompt(input);
    if (!output) {
      throw new Error('فشل في استخراج البيانات من الصورة. يرجى التأكد من وضوح الفاتورة.');
    }
    return output;
  }
);
