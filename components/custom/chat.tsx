"use client";

// Define simple message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  experimental_attachments?: any[];
  toolInvocations?: any[];
}

interface Attachment {
  name: string;
  contentType: string;
  url: string;
}
// import { useChat, useCompletion } from "@ai-sdk/react";
import { useState } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

import { MultimodalInput } from "./multimodal-input";
import { Overview } from "./overview";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  // Use local state to manage messages and input
  const [messages, setMessages] = useState<Array<Message>>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e?: { preventDefault?: () => void }, chatRequestOptions?: any) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (input.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: input.trim(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/chat?id=${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: data.message,
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const stop = () => {
    setIsLoading(false);
  };

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
    <div className="flex flex-row justify-center pb-4 md:pb-8 h-dvh bg-background">
      <div className="flex flex-col justify-between items-center gap-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-6 h-full w-dvw items-center overflow-y-scroll p-6"
        >
          {messages.length === 0 && <Overview />}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`w-full flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%]`}>
                <PreviewMessage
                  chatId={id}
                  role={message.role}
                  content={message.content}
                  attachments={message.experimental_attachments}
                  toolInvocations={message.toolInvocations}
                />
              </div>
            </div>
          ))}

          <div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>

        <form className="flex flex-row gap-2 relative items-end w-full md:max-w-[1000px] max-w-[calc(100dvw-32px) px-6 md:px-0">
          <MultimodalInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
          />
        </form>
      </div>
    </div>
  );
}
