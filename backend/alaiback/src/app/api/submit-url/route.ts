import { NextResponse } from "next/server"
import FireCrawlApp from "@mendable/firecrawl-js"
import { z } from "zod"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { url } = body

    // Validate the URL
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log("Received URL:", url)
    const app = new FireCrawlApp({ apiKey: "fc-0c14c485f96445b9aac3d8d7d19657f5" })

    const schema = z.object({
      content: z.string(),
      goal: z.string(),
      image_links: z.array(z.string()).optional(),
    })

    const extractResult = await app.extract([`${url}`], {
      prompt:
        "Extract the entire content of the page in natural language. Identify the goal of the website. Collect links to all the images used on the page.",
      schema,
    })

    console.log("---------------------------------")
    console.log("Extract Result Structure:", JSON.stringify(extractResult, null, 2))

    // Send the extracted data to the get-ppt endpoint
    try {
      // The extractResult might have a different structure than expected
      // Let's check if the data is in extractResult[0] (if it's an array of results)
      const dataToSend = Array.isArray(extractResult) && extractResult.length > 0 ? extractResult[0] : extractResult

      console.log("Data being sent to get-ppt:", JSON.stringify(dataToSend, null, 2))

      const pptResponse = await fetch(new URL("/api/get-ppt", request.url).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      })

      if (!pptResponse.ok) {
        console.error("Error sending data to get-ppt endpoint:", await pptResponse.text())
      } else {
        console.log("Data successfully sent to get-ppt endpoint")
      }
    } catch (error) {
      console.error("Failed to send data to get-ppt endpoint:", error)
    }

    // Return the URL and the extracted data
    return NextResponse.json({
      success: true,
      message: "URL received and processed successfully",
      url: url,
      content: extractResult.content,
      goal: extractResult.goal,
      image_links: extractResult.image_links || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error processing URL:", error)
    return NextResponse.json({ error: "Failed to process URL" }, { status: 500 })
  }
}

