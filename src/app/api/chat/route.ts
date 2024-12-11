// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import { stat } from "fs";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const systemPrompt = "Hello, how can I help you today?";

export async function POST(req: Request) {
  try {
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const { message } = await req.json();
    console.log('message', message)

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama3-8b-8192",
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({ status: 200, body: response });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ status: 500, body: "Internal Server Error" });
  }
}
