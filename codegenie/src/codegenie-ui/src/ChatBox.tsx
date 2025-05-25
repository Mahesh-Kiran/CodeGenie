import React, { useState, useEffect, useRef } from "react";
import { fetchAICompletion } from "./api";
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { IoSendOutline, IoAddCircleOutline } from 'react-icons/io5';
import { HiDesktopComputer } from 'react-icons/hi';
import { BsPciCard } from 'react-icons/bs';
import { BsCopy } from "react-icons/bs";
import { LuFileCode2 } from "react-icons/lu";
import ReactMarkdown from 'react-markdown';
import ThemeSwitcher from "./ThemeSwitcher";
import "./styles.css";

const ChatBox = () => {
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingFileContents, setPendingFileContents] = useState<string[]>([]);


  function extractCodeBlocksWithLang(text: string) {
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const codeBlocks = [];
    while ((match = codeRegex.exec(text)) !== null) {
      codeBlocks.push({
        lang: match[1] || "text",
        code: match[2].trim()
      });
    }
    return codeBlocks;
  }

  function removeCodeBlocks(text: string) {
    return text.replace(/```(?:[\w]*)?\n[\s\S]*?```/g, "").trim();
  }

  const renderMessage = (msg: { text: string; sender: string }) => {
    if (msg.sender === "bot") {
      const codeBlocks = extractCodeBlocksWithLang(msg.text);
      const displayText = removeCodeBlocks(msg.text);

      return (
        <div className="bot-message">
          {displayText && (
            <div className="markdown" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              <ReactMarkdown>
                {displayText}
              </ReactMarkdown>
            </div>
          )}
          {codeBlocks.map(({ lang, code }, idx) => (
            <div className="code-block" key={idx}>
              <SyntaxHighlighter language={lang} style={darcula} wrapLongLines={true}
                customStyle={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {code}
              </SyntaxHighlighter>
              <div className="code-actions">
                <button onClick={() => handleCopy(code, idx)}>
                  {copiedIndex === idx ? "Copied" : <BsCopy size={15} />}
                </button>

                <button onClick={() => {
                  const vscode = (window as any).acquireVsCodeApi?.();
                  if (vscode) {
                    vscode.postMessage({ type: "insertCode", code });
                  }

                }}><LuFileCode2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <pre className="user-message">{msg.text}</pre>;
  };

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 5000);
  };

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
    return () => clearTimeout(timeout);
  }, [messages, isTyping]);


  const sendMessage = async () => {
    if (!input.trim() && pendingFiles.length === 0) return;
    if (pendingFiles.length > 0 && pendingFileContents.length < pendingFiles.length) return;

    // What to show in chat history:
    let userDisplay = input.trim();
    if (pendingFiles.length > 0) {
      userDisplay += (userDisplay ? "\n" : "") + "Attachments: " + pendingFiles.map(f => f.name).join(", ");
    }

    // What to send to backend:
    let promptToSend = input.trim();
    if (pendingFiles.length > 0) {
      pendingFiles.forEach((file, idx) => {
        promptToSend += `\n\nFile: ${file.name}\n\n${pendingFileContents[idx]}`;
      });
    }

    setMessages(prev => [
      ...prev,
      { text: userDisplay, sender: "user" }
    ]);
    setInput("");
    setPendingFiles([]);
    setPendingFileContents([]);
    setIsTyping(true);

    try {
      const API_URL = pendingFiles.length > 0
        ? "http://127.0.0.1:8000/generate-large"
        : "http://127.0.0.1:8000/generate";
      const maxTokens = pendingFiles.length > 0 ? 4096 : 1000;
      const aiResponse = await fetchAICompletion(promptToSend, API_URL, maxTokens);

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


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const filesArray = Array.from(files);

    setPendingFiles(prev => [...prev, ...filesArray]);

    // Read all files as text
    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingFileContents(prev => [...prev, reader.result as string]);
      };
      reader.readAsText(file);
    });
  };


  return (
    <div>
      <div className="theme-switcher-fixed">
        <ThemeSwitcher />
      </div>
      <div className="chatbox-container">
        <div className="chatbox-history" ref={chatRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}>
              {renderMessage(msg)}
            </div>
          ))}
          {isTyping && <div className="typing-indicator">CodeGenie is thinking...</div>}
          <div ref={bottomRef} />
        </div>
        <div className="chatbox-input-area" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              {pendingFiles.map((file, idx) => (
                <div className="attached-file-chip show" key={file.name + idx}>
                  <span className="file-name">{file.name}</span>
                  <button
                    className="remove-file-btn"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => {
                      setPendingFiles(pendingFiles.filter((_, i) => i !== idx));
                      setPendingFileContents(pendingFileContents.filter((_, i) => i !== idx));
                    }}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="input-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="action-button" onClick={() => fileInputRef.current?.click()} title="Attachments">
              <IoAddCircleOutline size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              onChange={handleFileUpload}
            />
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
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={
                isTyping ||
                (pendingFiles.length > 0 && pendingFileContents.length < pendingFiles.length)
              }
            >
              <IoSendOutline size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;