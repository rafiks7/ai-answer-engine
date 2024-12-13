// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getTopResultsFromGoogle, scrapeWebPage } from "@/app/utils/scraper";
import { systemPrompt, systemPrompt2 } from "@/app/utils/prompts";

type Message = {
  role: "user" | "assistant" | "system" | "ai";
  content: string;
};

export async function POST(req: Request) {
  try {
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1];

    const results = await getTopResultsFromGoogle(userMessage.content);
    console.log("title:", results[0].title);

    const scrapedPage = await scrapeWebPage(results[0].link);
    console.log("scrapedPage:", scrapedPage);

    let completion;
    try {
      completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt2 },
          ...messages.map((msg: Message) => ({
            role: msg.role === "ai" ? "assistant" : msg.role,
            content: msg.content,
          })),
        ],
        stream: false,
        response_format: { type: "json_object" },
        model: "llama3-8b-8192",
      });
    } catch (error) {
      console.error("Error:", error);
      return NextResponse.json({
        status: 500,
        body: "Failed to figure out if it needs a web search",
      });
    }

    let response = completion.choices[0].message.content;
    let searchNeeded = false;
    if (response) {
      searchNeeded = JSON.parse(response).search_needed;
    }

    console.log("searchNeeded:", searchNeeded);

    if (searchNeeded) {
      let topResults;
      try {
        topResults = await getTopResultsFromGoogle(userMessage.content);
      } catch (error) {
        console.error("Error fetching search results:", error);
        return NextResponse.json({
          status: 500,
          body: "Failed to fetch search results",
        });
      }

      const topResult = topResults[0];

      let webPageContent;
      try {
        webPageContent = await scrapeWebPage(topResult.link);
        if (webPageContent) {
          if (webPageContent.length > 5000) {
            webPageContent = webPageContent.substring(0, 5000);
          }
          const finalPrompt = `
          <article>
          ${webPageContent}
          </article>

          <user query>
          ${userMessage.content}
          </user query>
          `;
          userMessage.content = finalPrompt;
        }
      } catch (error) {
        console.error(`Error scraping web page - ${topResult.title}:`, error);
        return NextResponse.json({
          status: 500,
          body: "Failed to scrape a web page",
        });
      }
    }

    try {
      console.log("userMessage:", userMessage);
      const messagesWithoutLastMessage = messages.slice(0, -1);
      completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesWithoutLastMessage.map((msg: Message) => ({
            role: msg.role === "ai" ? "assistant" : msg.role,
            content: msg.content,
          })),
          userMessage,
        ],
        model: "llama3-8b-8192",
      });

      response = completion.choices[0].message.content;
    } catch (error) {
      console.error("Error generating a response:", error);
      return NextResponse.json({
        status: 500,
        body: "Failed to generate a response",
      });
    }

    return NextResponse.json({ status: 200, body: response });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ status: 500, body: "Internal Server Error" });
  }
}
