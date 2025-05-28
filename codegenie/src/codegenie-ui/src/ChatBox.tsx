import React, { useState, useEffect, useRef } from "react";
import { fetchAICompletion } from "./api";
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { IoSendOutline, IoAddCircleOutline } from 'react-icons/io5';
import { MdClearAll } from "react-icons/md";
import { BsCopy } from "react-icons/bs";
import { IoMdHelp } from "react-icons/io";
import ReactMarkdown from 'react-markdown';
import ThemeSwitcher from "./ThemeSwitcher";
import "./styles.css";

const ChatBox = () => {
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingFileContents, setPendingFileContents] = useState<string[]>([]);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showFullHelp, setShowFullHelp] = useState(false);


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

  // On mount: load state from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_messages');
    const savedInput = localStorage.getItem('chat_input');
    const savedFiles = localStorage.getItem('chat_files');
    const savedFileContents = localStorage.getItem('chat_file_contents');
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedInput) setInput(savedInput);
    if (savedFiles) setPendingFiles(JSON.parse(savedFiles));
    if (savedFileContents) setPendingFileContents(JSON.parse(savedFileContents));
  }, []);

  // On state change: save to localStorage
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('chat_input', input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem('chat_files', JSON.stringify(pendingFiles));
  }, [pendingFiles]);

  useEffect(() => {
    localStorage.setItem('chat_file_contents', JSON.stringify(pendingFileContents));
  }, [pendingFileContents]);


  useEffect(() => {
    const timeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
    return () => clearTimeout(timeout);
  }, [messages, isTyping]);

  useEffect(() => {
    function handleVsCodeMessage(event: MessageEvent) {
      const message = event.data;
      if (message && message.type === "explainCode") {
        // Show selected code as user message
        setMessages(prev => [
          ...prev,
          { text: `Explain this code:\n\n${message.code}`, sender: "user" }
        ]);
        setIsTyping(true);

        // Call your backend /explain endpoint
        fetch("http://127.0.0.1:8000/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: message.code,
            max_tokens: 2048
          })
        })
          .then(res => res.json())
          .then(data => {
            setMessages(prev => [
              ...prev,
              { text: data.response, sender: "bot" }
            ]);
          })
          .catch(() => {
            setMessages(prev => [
              ...prev,
              { text: "❌ Error: Could not explain code.", sender: "bot" }
            ]);
          })
          .finally(() => setIsTyping(false));
      }
    }

    window.addEventListener("message", handleVsCodeMessage as EventListener);
    return () => window.removeEventListener("message", handleVsCodeMessage as EventListener);
  }, []);

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
      const totalText = input + pendingFileContents.join('');
      const estimatedTokens = Math.ceil(totalText.length / 4);
      const useLargeModel = estimatedTokens > 1000;
      const API_URL = useLargeModel
        ? "http://127.0.0.1:8000/generate-large"
        : "http://127.0.0.1:8000/generate";
      const maxTokens = useLargeModel ? 4096 : 1000;
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

    e.target.value = "";
  };

  return (
    <div>
      <div className="theme-switcher-fixed">
        <ThemeSwitcher />
      </div>
      <div className="help-button-fixed">
        <button
          className="help-button"
          onClick={() => setShowHelpPopup(true)}
          aria-label="Show help"
          title="Show CodeGenie Help"
        >
          <IoMdHelp size={14} />
        </button>

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
              onClick={() => {
                setMessages([]);
                setInput("");
                setPendingFiles([]);
                setPendingFileContents([]);
              }}
              title="Clear All Chat"
              disabled={isTyping}
            >
              <MdClearAll size={20} />
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
              <IoSendOutline size={25} />
            </button>
          </div>
        </div>
        {showHelpPopup && (
          <div className="help-popup-overlay" onClick={() => setShowHelpPopup(false)}>
            <div className="help-popup" onClick={e => e.stopPropagation()}>
              <h2>CodeGenie Quick Help</h2>
              <ul>
                <li>💬 <b>Chat with AI</b> about code and tasks</li>
                <li>📎 <b>Attach multiple files</b> for context-aware analysis</li>
                <li>🖱️ <b>Right-click code</b> for Explain, Debug, or Improve</li>
                <li>💡 <b>Generate code</b> or comments from prompts</li>
                <li>🐞 <b>Debug code</b> for instant error analysis</li>
                <li>🌓 <b>Switch themes</b> with the moon/sun icon</li>
                <li>⚡ <b>Inline completions</b> for code suggestions</li>
              </ul>
              <button
                className="more-button"
                onClick={() => { setShowFullHelp(true); setShowHelpPopup(false); }}
              >
                More
              </button>
              <button
                className="close-button"
                onClick={() => setShowHelpPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showFullHelp && (
          <div className="help-full-overlay" onClick={() => setShowFullHelp(false)}>
            <div className="help-full-page" onClick={e => e.stopPropagation()}>
              <h1>CodeGenie: Full Guide</h1>
              <h2>Feature, Commands, Access & Usage</h2>
              <table className="cg-feature-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Command</th>
                    <th>How to Access</th>
                    <th>When to Use</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Generate Code</td>
                    <td><code>codegenie.getCode</code></td>
                    <td>Command Palette, Sidebar, Right-click</td>
                    <td>When you want to generate new code from a prompt.</td>
                  </tr>
                  <tr>
                    <td>Generate from Last Comment</td>
                    <td><code>codegenie.generateFromComment</code></td>
                    <td>Command Palette</td>
                    <td>To generate code based on your last code comment.</td>
                  </tr>
                  <tr>
                    <td>Trigger Inline Completion</td>
                    <td><code>codegenie.triggerInlineCompletion</code></td>
                    <td>Command Palette, <kbd>Ctrl+T Ctrl+I</kbd></td>
                    <td>For Copilot-style inline code suggestions.</td>
                  </tr>
                  <tr>
                    <td>Debug Selected Code</td>
                    <td><code>codegenie.debugSelectedCode</code></td>
                    <td>Right-click, Command Palette</td>
                    <td>To analyze selected code for errors and get fixes.</td>
                  </tr>
                  <tr>
                    <td>Explain Code</td>
                    <td><code>codegenie.explainCode</code></td>
                    <td>Right-click, Command Palette</td>
                    <td>When you want a plain-language explanation of code.</td>
                  </tr>
                  <tr>
                    <td>Improve Code</td>
                    <td><code>codegenie.improveCode</code></td>
                    <td>Right-click, Command Palette</td>
                    <td>To optimize, clean up, or refactor existing code.</td>
                  </tr>
                  <tr>
                    <td>Enable/Disable</td>
                    <td>
                      <code>codegenie.enable</code><br />
                      <code>codegenie.disable</code>
                    </td>
                    <td>Command Palette</td>
                    <td>To turn CodeGenie on or off in VS Code.</td>
                  </tr>
                </tbody>
              </table>
              <h2>Multi-file Support</h2>
              <p>
                <b>Attach multiple files</b> using the <b>paperclip</b> icon in the chat input.<br />
                All files will be analyzed together for better, context-aware answers and code generation.<br />
                <i>Tip: Remove files before sending if you want to exclude them.</i>
              </p>
              <h2>Access Methods Explained</h2>
              <ul>
                <li><b>Command Palette</b>: <kbd>Ctrl+Shift+P</kbd> (or <kbd>Cmd+Shift+P</kbd> on Mac), then type the command name.</li>
                <li><b>Sidebar Panel</b>: Open the CodeGenie AI panel from the sidebar (rocket icon).</li>
                <li><b>Right-click (Context Menu)</b>: Select code in the editor, then right-click to see CodeGenie actions.</li>
                <li><b>Keyboard Shortcut</b>: Use <kbd>Ctrl+T Ctrl+I</kbd> for inline completions.</li>
              </ul>
              <button className="close-button" onClick={() => setShowFullHelp(false)}>Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatBox;