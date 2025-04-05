import { NextResponse } from "next/server"
import { z } from "zod"

// Update the schema to match the actual data structure
const dataSchema = z.object({
  goal: z.string(),
  content: z.string(),
  image_links: z.array(z.string()).optional(),
})

const extractedDataSchema = z
  .object({
    success: z.boolean().optional(),
    data: dataSchema,
  })
  .or(dataSchema)

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()

    // Log the raw received data to understand its structure
    console.log("=== RAW DATA RECEIVED IN GET-PPT ENDPOINT ===")
    console.log(JSON.stringify(body, null, 2))
    console.log("============================================")

    // Validate the data against the schema
    const validatedData = extractedDataSchema.parse(body)

    // Extract the actual data, handling both nested and flat structures
    let processedData
    if ("data" in validatedData) {
      processedData = validatedData.data
    } else {
      processedData = validatedData
    }

    // Log the processed data
    console.log("=== PROCESSED DATA IN GET-PPT ENDPOINT ===")
    console.log("Content:", processedData.content || "Not provided")
    console.log("Goal:", processedData.goal || "Not provided")
    console.log("Image Links:", processedData.image_links || [])
    console.log("==========================================")

    return NextResponse.json({
      success: true,
      message: "Data received successfully for PPT generation",
      data: processedData,
    })
  } catch (error) {
    console.error("Error processing data for PPT:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid data format",
          details: error.errors,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to process data for PPT",
      },
      { status: 500 },
    )
  }
}

