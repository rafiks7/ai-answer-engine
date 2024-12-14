import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(req: Request) {
  const { id } = await req.json();

  const messages = await redis.get(`chat ${id}`);

  if (!messages) {
    return NextResponse.json({
      status: 404,
      body: "No messages found",
    });
  }

  return NextResponse.json({
    body: messages,
  });
}
