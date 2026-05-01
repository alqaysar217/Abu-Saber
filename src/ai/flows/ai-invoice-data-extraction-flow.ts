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
  customerId: z.string().describe('The ID of the customer associated with this invoice.').optional(),
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
  prompt: `You are an AI assistant specialized in extracting data from handwritten invoices.
Your task is to analyze the provided image of a handwritten invoice and extract the details of fish purchases.

Specifically, identify and extract the following information for each distinct fish item:
- The type of fish (e.g., Tuna, Salmon, Sardine).
- The quantity of the fish in kilograms. If units are not specified, assume kilograms.
- The price per kilogram of that specific fish type.
- Calculate the total price for each individual fish item (quantity * pricePerKg).

After extracting all individual fish items, calculate the total amount of the entire invoice by summing up the 'totalItemPrice' of all fish items.

If any information is unclear or missing for a specific item, make a reasonable inference or leave it as null/empty string if explicit.
Present the extracted data as a JSON object matching the following structure:

Input Image: {{media url=invoiceImageDataUri}}

`,
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
      throw new Error('Failed to extract invoice data.');
    }
    return output;
  }
);
