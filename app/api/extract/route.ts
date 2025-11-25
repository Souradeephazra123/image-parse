import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const geminiModel = google("gemini-2.0-flash-exp");


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



const systemPrompt=`Extract fields: bill_no, amount, purpose.
bill_no: Find Invoice/Receipt/Bill/Order/Transaction number, else "N/A".
amount: Final total only; include currency; if missing "0".
purpose: Classify as one: Conveyance/taxi/auto/uber/ola/parking, Train/railway/irctc/metro, Bus/bus/shuttle, Food/restaurant/cafe/zomato/swiggy/meal, Hotel/accommodation/lodging/room, Project Expense/office/supplies/equipment/software/tools, Other.
Use context from merchant/items. Match largest/final amount. Be exact; keep formatting.
`;

    const userPrompt = "Extract bill_no, amount, purpose.";


   
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
