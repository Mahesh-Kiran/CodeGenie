# ![CodeGenie Icon](images/icon.png) CodeGenie — AI-Powered VS Code Extension

**CodeGenie** is a Visual Studio Code extension that integrates generative AI directly into your coding workflow. Designed by developers, for developers — it empowers users with intelligent suggestions, code generation, debugging assistance, and more.

---

# 🚀 Introduction

**CodeGenie** is an AI-powered coding assistant designed to **revolutionize the software development workflow**. Built on top of the powerful **DeepSeek-Coder** models, it brings intelligent, context-aware coding assistance directly into your editor — helping you write better code, faster.

With native **Visual Studio Code integration** and support for a wide range of programming languages and frameworks, CodeGenie enables developers to:

- ✅ **Generate accurate, context-sensitive code suggestions**  
- 🛠️ **Detect and fix errors in real-time**  
- ⚙️ **Refactor and optimize code for performance and clarity**  
- 🌐 **Work seamlessly across technologies**, from web to machine learning

Whether you're prototyping a web app, building data pipelines, or debugging legacy code, CodeGenie empowers you to stay in flow, reduce cognitive load, and focus on what matters most — building great software.

---

# 💡 Use Cases

Here’s how CodeGenie supports developers across domains:

### 🌐 Web Development
- Generate and refine frontend code (HTML, CSS, JavaScript)  
- Build backend services with Node.js, Django, Flask, and more

### 🤖 Machine Learning & Data Science
- Generate model training scripts and evaluation code  
- Create data cleaning, preprocessing, and visualization pipelines

### 🛠️ General Software Engineering
- Automate boilerplate code generation  
- Implement design patterns and follow best practices  
- Refactor and maintain large codebases

### 🐞 Debugging
- Detect bugs and suggest intelligent fixes in real-time  
- Explain code behavior to assist in troubleshooting

### 📘 Learning & Exploration
- Use natural language to explore code functionality  
- Learn programming concepts with contextual examples  

---
## 🚀 Features
- ⚡ **Inline Autocomplete**  
  - Copilot-style suggestions triggered manually with `Ctrl+T Ctrl+I`.

- 💬 **Prompt-based Code Generation**  
  - Triggered via the command palette or editor menu.
  - Works even when the language is **not explicitly mentioned** in the prompt.
    
- 💡 **Comment-Based Generation**  
  - Triggered from the command `codegenie.generateFromComment` or context menu.
  - Extracts the last comment in the file and generates code accordingly.
  - **Language detection** is automatic based on the active file.

- 🧠 **Explain Code**  
  - Select any code → Right-click → "Explain with CodeGenie".

- 🛠️ **Improve Code**  
  - Auto-optimizes and refactors selected code.

- 🐞 **Debug Code**  
  - Analyzes selected code, identifies syntax/logical errors, and returns a corrected version.
    
- 🐞 **Enable/Disable Extension in VS Code**  
  - Enable `Ctrl+alt+E`
  - Disable `Ctrl+alt+D`

- 📎 **Multi-file Support**  
  - Upload multiple files in WebView for context-aware generation.

- 🎨 **Theme Toggle**  
  - Switch between Dark/Light mode using the WebView button.

---
## 📐 Architecture Diagram (DeepSeek Coder V2)

<p align="center">
  <img src="images/Architecture.png" style="width: 100%; max-height: 400px; object-fit: contain;" />
</p>

---

## 🔄 Workflow Diagram

<p align="center">
  <img src="images/Workflow.png" height: 60%" />
</p>

---

### 📜 License & Acknowledgments

CodeGenie is released under the **MIT License**, permitting free use, modification, and distribution for personal and commercial purposes.

This project utilizes [DeepSeek-Coder](https://github.com/deepseek-ai/DeepSeek-Coder), which is governed by the **DeepSeek License Agreement Version 1.0 (October 2023)**. This license grants broad rights to use, reproduce, and distribute the model and its derivatives, but also includes important **use-based restrictions** to ensure responsible and lawful usage.

#### Important Use Restrictions from DeepSeek License:

- No use violating applicable laws or infringing third-party rights  
- No military use  
- No generating harmful, false, or inappropriate content  
- No unauthorized dissemination of personal data  
- No discriminatory or harmful uses against individuals or groups  

By using CodeGenie, you agree to comply with all relevant terms of the DeepSeek License, including these use-based restrictions, and assume responsibility for your use of outputs generated via the model.

For full details, please review the [DeepSeek License Agreement](https://github.com/deepseek-ai/DeepSeek-Coder/blob/main/LICENSE-MODEL) and associated documentation.
