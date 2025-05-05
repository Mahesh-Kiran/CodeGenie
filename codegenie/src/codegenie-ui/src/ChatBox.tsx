import React, { useState, useEffect, useRef } from "react";
import { fetchAICompletion } from "./api";
import "./styles.css";
import { IoSendOutline, IoAddCircleOutline } from 'react-icons/io5';
import { HiDesktopComputer } from 'react-icons/hi';
import { BsPciCard } from 'react-icons/bs';
import { MdCopyAll } from "react-icons/md";
import { MdSimCardDownload } from "react-icons/md";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatBox = () => {
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function extractCodeBlocks(text: string) {
    const codeRegex = /```(?:[\w]*)?\n([\s\S]*?)```/g;
    let match;
    const codeBlocks = [];
    while ((match = codeRegex.exec(text)) !== null) {
      codeBlocks.push(match[1].trim());
    }
    return codeBlocks;
  }
  
  function removeCodeBlocks(text: string) {
    return text.replace(/```(?:[\w]*)?\n[\s\S]*?```/g, "").trim();
  }
  
  const renderMessage = (msg: { text: string; sender: string }) => {
    if (msg.sender === "bot") {
      const codeBlocks = extractCodeBlocks(msg.text);
      const displayText = removeCodeBlocks(msg.text);

      return (
        <div className="bot-message">
          {displayText && <pre>{displayText}</pre>}
          {codeBlocks.map((code, idx) => (
            <div className="code-block" key={idx}>
              <SyntaxHighlighter language="tsx" style={darcula} wrapLongLines={true}
  customStyle={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {code}
              </SyntaxHighlighter>
              <div className="code-actions">
                <button onClick={() => navigator.clipboard.writeText(code)}>
                  <MdCopyAll />Copy</button>
                <button onClick={() => {
                  const vscode = (window as any).acquireVsCodeApi?.();
                  if (vscode) {
                    vscode.postMessage({ type: "insertCode", code });
                  }
                }}><MdSimCardDownload /> Insert</button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <pre className="user-message">{msg.text}</pre>;
  };

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120;
      const minHeight = 40;
      if (scrollHeight > minHeight) {
        textarea.style.height = Math.min(scrollHeight, maxHeight) + "px";
        textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
      } else {
        textarea.style.height = minHeight + "px";
        textarea.style.overflowY = "hidden";
      }
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const prompt = input.trim();
    setMessages(prev => [...prev, { text: prompt, sender: "user" }]);
    setInput("");
    setIsTyping(true);
    try {
      const API_URL = isOnline
        ? "http://<rtx-4050-server-ip>:8000/generate"
        : "http://127.0.0.1:8000/generate";
      const aiResponse = await fetchAICompletion(prompt, API_URL, 1000);
      setMessages(prev => [...prev, { text: aiResponse, sender: "bot" }]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [
        ...prev,
        { 
          text: "❌ Error: Failed to get response from AI backend. Please check your connection.", 
          sender: "bot" 
        }
      ]);
    }
    setIsTyping(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = reader.result as string;
      setMessages(prev => [
        ...prev,
        { text: `📎 Attached: ${file.name}\n`, sender: "user" }
      ]);
      try {
        const API_URL = isOnline
          ? "http://<rtx-4050-server-ip>:8000/generate"
          : "http://127.0.0.1:8000/generate";
        const aiResponse = await fetchAICompletion(
          `User uploaded file: ${file.name}\n\n${fileContent}`,
          API_URL,
          1000
        );
        setMessages(prev => [...prev, { text: aiResponse, sender: "bot" }]);
      } catch (err) {
        console.error("AI File Upload Error:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-history" ref={chatRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}>
            {renderMessage(msg)}
          </div>
        ))}
        {isTyping && <div className="typing-indicator">CodeGenie is typing...</div>}
      </div>
      <div className="chatbox-input-area">
        <button className="action-button" onClick={() => fileInputRef.current?.click()}>
          <IoAddCircleOutline size={20} />
        </button>
        <button
          className="action-button"
          onClick={() => setIsOnline(prev => !prev)}
          title={isOnline ? "RTX Mode (Remote)" : "Local Mode (on device)"}
        >
          {isOnline ? <BsPciCard size={20} /> : <HiDesktopComputer size={20} />}
        </button>
        <textarea
          ref={textareaRef}
          className="chatbox-input"
          placeholder="Type your task here"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button className="send-button" onClick={sendMessage}>
          <IoSendOutline size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
