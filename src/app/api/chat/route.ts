import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { getTopResultsFromGoogle, scrapeWebPage } from "@/app/utils/scraper";
import { systemPrompt, webSystemPrompt } from "@/app/utils/prompts";
import { Redis } from "@upstash/redis";

type Message = {
  role: "user" | "assistant" | "system" | "ai";
  content: string;
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const generateId = (): string => {
  return [...Array(20)].map(() => Math.random().toString(36)[2]).join("");
};

export async function POST(req: Request) {
  try {
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Get the messages from the request body
    const { messages, finalPrompt, id } = await req.json();
    
    let completion;
    let response;
    // Generate a response
    try {
      const messagesWithoutLastMessage = messages.slice(0, -1);
      completion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesWithoutLastMessage.map((msg: Message) => ({
            role: msg.role === "ai" ? "assistant" : msg.role,
            content: msg.content,
          })),
          { role: "user", content: finalPrompt },
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

    // cache messages
    let chatId = id;
    if (id == "new") {
      chatId = generateId();
      await redis.set(
        `chat ${chatId}`,
        JSON.stringify([...messages, { role: "ai", content: response }]),
        { ex: 7 * 24 * 60 * 60 }
      );
    } else {
      const ttl = await redis.ttl(`chat ${chatId}`);
      await redis.set(
        `chat ${chatId}`,
        JSON.stringify([...messages, { role: "ai", content: response }]),
        { ex: ttl }
      );
    }

    return NextResponse.json({ status: 200, message: response, id: chatId });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ status: 500, body: "Internal Server Error" });
  }
}
