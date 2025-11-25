import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const geminiModel = google("gemini-2.0-flash-exp");

// Fine-tuned schema for expense tracking
const extractedDataSchema = z.object({
  bill_no: z.string().describe("Bill number, invoice number, or receipt number extracted from the document. If not found, return 'N/A'"),
  amount: z.string().describe("Total amount or bill amount. Extract the final total value with currency symbol if present. If not found, return '0'"),
  purpose: z.enum(["Conveyance", "Train", "Bus", "Food", "Hotel", "Project Expense", "Other"]).describe("Intelligently categorize the expense purpose based on document content. Analyze merchant name, items purchased, and context to determine the most appropriate category."),
  raw_text: z.string().describe("All extracted text from the image for reference"),
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


    const systemPrompt = `You are an expert expense tracking assistant with perfect OCR accuracy.

Your task is to extract specific information from receipts, bills, and invoices for expense tracking.

REQUIRED FIELDS TO EXTRACT:

1. BILL NUMBER (bill_no):
   - Look for: Invoice #, Receipt #, Bill No, Transaction ID, Order #
   - Extract the alphanumeric identifier
   - If not found, return "N/A"

2. AMOUNT (amount):
   - Extract the FINAL TOTAL amount (not subtotal)
   - Include currency symbol if present (₹, $, €, etc.)
   - Look for: Total, Grand Total, Amount Due, Net Amount
   - If multiple amounts, choose the largest/final one
   - If not found, return "0"

3. PURPOSE (purpose):
   Intelligently categorize into ONE of these categories based on context:
   
   - "Conveyance": Auto rickshaw, taxi, cab, Uber, Ola, local transport, parking
   - "Train": Railway tickets, train bookings, IRCTC, metro
   - "Bus": Bus tickets, bus passes, shuttle services
   - "Food": Restaurants, cafes, food delivery, Swiggy, Zomato, meals, snacks
   - "Hotel": Hotel stays, accommodation, lodging, room charges
   - "Project Expense": Office supplies, equipment, software, tools, materials, stationery
   - "Other": Anything that doesn't fit the above categories

CATEGORIZATION RULES:
- Analyze merchant name, items purchased, and document content
- Use context clues (e.g., "Zomato" → Food, "Uber" → Conveyance)
- For ambiguous cases, use "Other"
- Be consistent and logical in categorization

ACCURACY:
- Extract exact bill numbers (preserve formatting)
- Be precise with amounts (include decimals)
- Use contextual intelligence for categorization`;

    const userPrompt = "Extract the bill number, total amount, and intelligently categorize the expense purpose from this receipt/invoice.";

   
    const imageData = image.includes(",") 
      ? image 
      : `data:${mimeType || "image/jpeg"};base64,${image}`; 

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
