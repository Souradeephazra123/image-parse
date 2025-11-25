import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const geminiModel = google("gemini-2.0-flash-exp");


const extractedDataSchema = z.object({
  document_type: z.string().describe("Type of document detected (e.g., receipt, invoice, form, letter, menu, sign, etc.)"),
  raw_text: z.string().describe("All extracted text from the image, preserving layout and formatting as much as possible"),
  structured_data: z.any().optional().describe("Optional structured data based on document type. For receipts: merchant, items, pricing. For forms: field-value pairs. For other documents: relevant key information."),
});

export async function POST(request: NextRequest) {
  try {

    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }


    const systemPrompt = `You are an expert OCR and document understanding system with perfect accuracy.

Your task is to extract ALL text from images and provide intelligent analysis.

EXTRACTION RULES:
1. Extract every piece of visible text, even if partially obscured or low quality
2. Preserve the layout and structure as much as possible in raw_text
3. Correct obvious OCR errors using context (e.g., "0" vs "O", "1" vs "I", "5" vs "S")
4. Identify the document type (receipt, invoice, form, menu, sign, letter, etc.)

STRUCTURED DATA (OPTIONAL):
- For receipts/invoices: Extract merchant info, items, prices, totals
- For forms: Extract field names and values
- For menus: Extract categories and items with prices
- For signs/posters: Extract headings and key information
- For letters/documents: Extract sender, recipient, date, subject
- For any other type: Extract whatever structured information makes sense

Be accurate with numbers, dates, and amounts. Return null or omit fields that don't apply to the document type.`;

    const userPrompt = "Extract all text from this image. Identify the document type and provide structured data if applicable.";

    // Ensure the image data is in the correct format (data URL with MIME type)
    const imageData = image.includes(",") 
      ? image // Already has data URL prefix
      : `data:${mimeType || "image/jpeg"};base64,${image}`; // Add prefix if missing

    const { object: extractedData,usage } = await generateObject({
      model: geminiModel,
      schema: extractedDataSchema,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { 
              type: "image", 
              image: imageData
            },
          ],
        },
      ],
    });

    console.log("Usage:", usage);   

    if (!extractedData) {
      return NextResponse.json(
        { error: "Failed to extract data from image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Handle specific AI SDK errors
    if (error.message?.includes("API_KEY")) {
      return NextResponse.json(
        { 
          error: "Invalid API key. Please check your GOOGLE_GEMINI_API_KEY in .env.local",
          instructions: "Get a new API key from https://aistudio.google.com/apikey"
        },
        { status: 401 }
      );
    }

    if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      return NextResponse.json(
        { 
          error: "API rate limit exceeded. Please try again later or upgrade your plan.",
          details: error.message
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to process image with Gemini API",
        details: error.message || "Unknown error",
        suggestion: "Please try again or use Basic OCR mode"
      },
      { status: 500 }
    );
  }
}
