import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getTopResultsFromGoogle, scrapeWebPage } from "@/app/utils/scraper";
import { webSystemPrompt } from "@/app/utils/prompts";
import { Redis } from "@upstash/redis";

type Message = {
  role: "user" | "assistant" | "system" | "ai";
  content: string;
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(req: Request) {
  try {
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Get the messages from the request body
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1];

    let completion;
    // Check if the AI needs to do a web search
    try {
      completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: webSystemPrompt },
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

    const response = completion.choices[0].message.content;
    let searchNeeded = false;
    let googleQuery = "";
    let numberOfArticles = 0;

    if (response) {
      searchNeeded = JSON.parse(response).search_needed;
      googleQuery = JSON.parse(response).google_query;
      numberOfArticles = JSON.parse(response).max_articles;
    }

    let finalPrompt = userMessage.content;
    // if a search is needed, get the top search results from Google
    if (searchNeeded) {
      let topResults;
      try {
        // Get the top search results from Google
        topResults = await getTopResultsFromGoogle(
          googleQuery,
          numberOfArticles
        );
      } catch (error) {
        console.error("Error fetching search results:", error);
        return NextResponse.json({
          status: 500,
          body: "Failed to fetch search results",
        });
      }

      const allWebPageContent = await Promise.all(
        topResults.map(async page => {
          try {
            // check if it is cached
            const cachedContent = await redis.get(`scrape ${page.link}`) as string;
            if (cachedContent) {
              console.log("no need to scrape already in cache", page.link);
              return {
                title: page.title,
                link: page.link,
                content: cachedContent.slice(0, 5000),
              };
            } else {
              console.log("scraping web page", page.link);
              // Scrape the web page content
              const webPageContent = await scrapeWebPage(page.link);
              return {
                title: page.title,
                link: page.link,
                content: webPageContent,
              };
            }
          } catch (error) {
            console.error(`Error scraping web page - ${page.title}:`, error);
            return null; // Return null or handle the error gracefully
          }
        })
      );

      try {
        // Scrape the web page content
        if (allWebPageContent) {
          finalPrompt = `
          <Google Query>
            ${googleQuery}
          </Google Query>

          found ${allWebPageContent.length} results:
          ${allWebPageContent
            .map(
              (page, index) => `
          <Web Page ${index + 1}>
            Title: ${page?.title}
            Link: ${page?.link}
            Content: ${page?.content}
          </Web Page ${index + 1}>
          `
            )
            .join("\n")}
          

          <user query>
            ${userMessage.content}
          </user query>
          `;
          // Update the user message content with the scraped content
          userMessage.content = finalPrompt;
        }
      } catch (error) {
        console.error(`Error scraping web pages:`, error);
        return NextResponse.json({
          status: 500,
          body: "Failed to scrape a web page",
        });
      }
    }

    return NextResponse.json({
      status: 200,
      finalPrompt: finalPrompt,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ status: 500, body: "Internal Server Error" });
  }
}
