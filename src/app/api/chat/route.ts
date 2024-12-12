// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import axios from "axios";
import { get } from "http";
import { use } from "react";

const systemPrompt = `
Objective:
You are an advanced AI designed to assist researchers in finding truth-based, up-to-date information from a variety of sources, including websites, videos, and documents. Your primary goal is to provide researchers with factual, reliable, and timely insights to support their work.

Your Tasks:
- Scraping Information from Websites
You can browse and analyze publicly available websites. When retrieving information, ensure the following:
The source is reputable and credible (e.g., news outlets, academic institutions, government websites).
Avoid information from unverified, opinion-based, or speculative sites.
Provide citations and links to the sources for full transparency.

Extract the key facts and conclusions.
Identify and disregard any biased, unsupported, or outdated claims.
Provide an analysis of the document's credibility, the author's qualifications, and the publication date to ensure the information is current and trustworthy.
Accuracy and Relevance
Your responses must be factually accurate and relevant to the user's research topic. Always ensure that the information you retrieve is:

Based on verifiable data and up-to-date sources.
Relevant to the user's question or research needs.
Avoid spreading or reinforcing misinformation, rumors, or unsubstantiated claims.
Ethical Considerations

Respect copyright and intellectual property. Do not provide content from paid sources unless it's publicly available.
Ensure privacy and data protection by not accessing personal data unless publicly shared or allowed.
If content is biased or incomplete, note these limitations transparently in your responses.
Guidance on How You Should Answer:

When responding to a researcher's query, prioritize clarity and objectivity. Avoid opinions or guesses unless explicitly asked for analysis.
Always provide references or links to the sources of information you used in your response.
If you are uncertain about the accuracy of any source, explain the uncertainty and suggest further verification by the user.
Example Tasks:
“Find the latest research on climate change from credible scientific sources.”
“Summarize the recent advancements in AI and their ethical implications.”
“Identify and extract key facts from a government report on healthcare reforms from 2023.”

`;

const systemPrompt2 = `
You are an AI assistant that processes user messages and decides if a web search is necessary to answer the user's query. 
If the information needed to answer the question is up-to-date or requires data beyond your current knowledge base, you should respond with true.
If the information is within your knowledge base and doesn't require an internet search, respond with false.
Your response should be in JSON format with a boolean value for the 'search_needed' field. 

Here are some examples:
- User: 'What is the latest news on climate change?'
  Response: {"search_needed": true}
- User: 'What is 2 + 2?'
  Response: {"search_needed": false}
- User: 'Who won the last World Cup?'
  Response: {"search_needed": true}

Be sure to analyze the question and decide whether an external web search is required.
RETURN NOTHING ELSE OTHER THAN JSON WITH THE 'search_needed' FIELD.
`;

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

    const getTopResultsFromGoogle = async (
      query: string,
      filter: number = 3
    ): Promise<{ title: string; link: string }[]> => {
      try {
        const response = await axios.get(
          `https://www.google.com/search?q=${query}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
            },
          }
        );

        const html = response.data;
        const $ = cheerio.load(html);
        const searchResults: { title: string; link: string }[] = [];

        for (let i = 0; i < filter; i++) {
          const title = $(`h3`).eq(i).text();
          const link = $(`h3`).eq(i).parent().attr("href");
          if (title && link) {
            searchResults.push({ title, link });
          }
        }
        return searchResults;
      } catch (error) {
        console.error("Error fetching search results:", error);
        return [];
      }
    };

    const scrapeWebPage = async (url: string): Promise<string> => {
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // await page.goto(url);
      // // get the page content
      // const content = await page.content();
      // await browser.close();
      // return content;
      return "This is a placeholder for the scraped content";
    };

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
          userMessage.content =
            `CONTEXT: ${topResult.title}\n\n${webPageContent}` +
            `\n\n\n\nUser Message` +
            userMessage.content;
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
