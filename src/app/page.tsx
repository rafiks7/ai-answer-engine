/* eslint-disable */
"use client";

import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Send, Share, Plus } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useSearchParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Message = {
  role: "user" | "ai";
  content: string;
};

function Home() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  let id = searchParams.get("id");

  useEffect(() => {
    if (!id) {
      setMessages([
        { role: "ai", content: "Hello! How can I help you today?" },
      ] as Message[]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();
        console.log("data", data.body);
        if (data.status == 404) {
          setMessages([
            { role: "ai", content: "Hello! How can I help you today?" },
          ] as Message[]);
          router.push("/");
        } else {
          setMessages(data.body);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages(); // Call the async function
  }, []);

  const handleSend = async () => {
    console.log("id", id);
    if (!message.trim()) return;

    const userMessage = { role: "user" as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    if (!id) {
      id = "new";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, userMessage], id: id }),
      });

      const data = await response.json();
      const aiMessage: Message = { role: "ai", content: data.message };
      setMessages(prev => [...prev, aiMessage]);

      if (data.id && id !== data.id) {
        id = data.id;
        router.push(`/?id=${id}`);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      // copy current link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      // alert user
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleNewChat = async () => {
    setMessages([
      { role: "ai", content: "Hello! How can I help you today?" },
    ] as Message[]);
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black bg-opacity-30 backdrop-blur-lg border-b border-blue-500 border-opacity-30 p-4"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button className="mr-4 text-blue-300 hover:text-blue-100 transition-colors"></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-blue-100">AI Researcher</h1>
            <div className="flex items-center text-sm text-blue-300">
              <span className="mr-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
              Online
            </div>
          </div>
          {/* Plus button on the right, before the Share button */}
          <button
            className="mr-4 text-blue-300 hover:text-blue-100 transition-colors"
            onClick={handleNewChat}
          >
            <Plus size={24} />
          </button>

          {/* Share button on the far right */}
          <button
            className="mr-4 text-blue-300 hover:text-blue-100 transition-colors"
            onClick={handleShare}
          >
            <Share size={20} className="mr-2" />
          </button>
          <Toaster />
        </div>
      </motion.div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-4 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === "ai"
                    ? "bg-blue-800 bg-opacity-70 text-blue-100"
                    : "bg-indigo-600 bg-opacity-70 text-white"
                }`}
              >
                {msg.role === "ai" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="mb-2" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold mb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-bold mb-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-bold mb-2" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-md font-bold mb-2" {...props} />
                      ),
                      h5: ({ node, ...props }) => (
                        <h5 className="text-sm font-bold mb-2" {...props} />
                      ),
                      h6: ({ node, ...props }) => (
                        <h6 className="text-xs font-bold mb-2" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-2" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className="list-decimal list-inside mb-2"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="mb-1" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          className="text-blue-500 hover:text-blue-700"
                          {...props}
                        />
                      ),
                      img: ({ node, ...props }) => (
                        <img className="max-w-full h-auto rounded" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="border-l-4 pl-4 italic text-gray-600 mb-2"
                          {...props}
                        />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                      code: ({ node, inline, ...props }) =>
                        inline ? (
                          <code
                            className="bg-blue-900 bg-opacity-50 px-1 rounded"
                            {...props}
                          />
                        ) : (
                          <pre
                            className="bg-blue-900 bg-opacity-50 p-2 rounded mb-2 overflow-x-auto"
                            {...props}
                          />
                        ),
                      hr: ({ node, ...props }) => (
                        <hr
                          className="border-t-2 border-dashed my-4"
                          {...props}
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <table className="min-w-full table-auto" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          className="border-b px-4 py-2 text-left"
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border-b px-4 py-2" {...props} />
                      ),
                      sub: ({ node, ...props }) => (
                        <sub className="text-sm" {...props} />
                      ),
                      sup: ({ node, ...props }) => (
                        <sup className="text-sm" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <>
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date().toLocaleTimeString()}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-blue-800 bg-opacity-70 text-blue-100 px-4 py-2 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.5s]"></div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black bg-opacity-30 backdrop-blur-lg border-t border-blue-500 border-opacity-30 p-4"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 bg-blue-900 bg-opacity-50 rounded-full p-2 border border-blue-500 border-opacity-50">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-blue-100 placeholder-blue-300 focus:outline-none px-4 py-2"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <div
            className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-500"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}
