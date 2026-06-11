import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const RECEIPT_SCAN_PROMPT = `Extract receipt data and return ONLY valid JSON:

{
"description": string | null,
"amount": number | null,
"date": string | null
}

Rules:

* description = merchant name; otherwise first item name; otherwise "Untitled Expense"
* amount = final payable total
* date = YYYY-MM-DD
* if multiple totals exist, use the final amount paid
* ignore invoice numbers, GST numbers, taxes and item prices
* return JSON only, no markdown
`;

export interface ScannedReceiptData {
  description: string | null;
  amount: number | null;
  date: string | null;
}

/**
 * Sends a receipt image buffer to Gemini Vision and extracts structured data.
 * @param imageBuffer - Raw image data as a Buffer
 * @param mimeType   - MIME type of the image (e.g. "image/jpeg")
 * @returns Extracted receipt fields or null if parsing fails
 */
export const scanReceiptWithAI = async (
  imageBuffer: Buffer,
  mimeType: string
): Promise<ScannedReceiptData | null> => {
  const base64Image = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      {
        text: RECEIPT_SCAN_PROMPT,
      },
    ],
  });

  const rawText = response.text?.trim() ?? "";
  console.log("[ai.service] Gemini raw response:", rawText);

  // Strip optional markdown code fences if the model returns them
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  const parsed: ScannedReceiptData = JSON.parse(jsonText);
  return parsed;
};
