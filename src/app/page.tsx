"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Send, Zap, Database, Cpu } from 'lucide-react'
import {motion} from "framer-motion";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = { role: "user" as const, content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      

      const data = await response.json();
      const aiMessage: Message = { role: "ai", content: data.body };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Modify the color schemes, fonts, and UI as needed for a good user experience
  // Refer to the Tailwind CSS docs here: https://tailwindcss.com/docs/customizing-colors, and here: https://tailwindcss.com/docs/hover-focus-and-other-states
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black bg-opacity-30 backdrop-blur-lg border-b border-blue-500 border-opacity-30 p-4"
      >
        <div className="max-w-5xl mx-auto flex items-center">
          <button className="mr-4 text-blue-300 hover:text-blue-100 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-blue-100">AI Researcher</h1>
            <div className="flex items-center text-sm text-blue-300">
              <span className="mr-2 inline-block w-2 h-2 bg-green-400 rounded-full"></span>
              Online
            </div>
          </div>
          {/* <div className="flex space-x-3">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="bg-blue-800 bg-opacity-50 p-2 rounded-full"
            >
              <Zap size={20} className="text-yellow-400" />
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="bg-blue-800 bg-opacity-50 p-2 rounded-full"
            >
              <Database size={20} className="text-green-400" />
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="bg-blue-800 bg-opacity-50 p-2 rounded-full"
            >
              <Cpu size={20} className="text-purple-400" />
            </motion.div>
          </div> */}
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
              className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'ai'
                    ? 'bg-blue-800 bg-opacity-70 text-blue-100'
                    : 'bg-indigo-600 bg-opacity-70 text-white'
                }`}
              >
                <p>{msg.content}</p>
                {msg.role === 'user' && (
                <p className="text-xs mt-1 opacity-70">
                  {new Date().toLocaleTimeString()}
                </p>
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
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
  )
}
