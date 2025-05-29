#  CodeGenie - Setup

CodeGenie is a powerful, locally hosted AI coding assistant designed to enhance your development workflow with intelligent code generation, completions, and suggestions. This guide walks you through the full setup, from backend to UI, and launching the extension in VS Code.

---

 **Backend Setup and Dependency Installation**

Navigate to the `codegenie` directory and install the required backend dependencies using `pip`. This includes FastAPI, Uvicorn, Transformers, Torch, and other essential libraries for the AI model and API service.

```bash
cd codegenie
pip install fastapi uvicorn transformers torch accelerate safetensors huggingface_hub
```

---

 **Frontend Dependency Installation**

Navigate back to the `codegenie` directory and install all necessary frontend dependencies using `npm`. First, use `npm install` to fetch and set up the packages listed in `package.json`, then use `npm ci` to ensure a clean and consistent install based on the lock file.

```bash
cd codegenie
npm install
npm ci
```

---

 **Model Initialization**

Navigate to the backend folder and run `main.py` to download and initialize the AI model. This script sets up the backend server using FastAPI and ensures the required model files are loaded and ready for inference.

```bash
cd backend
python main.py
```

 This step may take a few minutes during the first run as it downloads the model from Hugging Face.

---

🖥 **CodeGenie UI Setup**

Navigate to the `src` directory, then into the `codegenie-ui` directory and install the frontend dependencies. This UI is built with React and TypeScript, and you’ll need to run the following commands to ensure everything is properly installed and locked:

```bash
cd src
cd codegenie-ui
npm install
npm ci
```

---

 **Launching the CodeGenie UI**

To verify that the CodeGenie UI is working correctly, run the development server using:

```bash
npm run start
```

This will start the React app and open it in your default browser (usually at `http://localhost:3000`). You should see the CodeGenie interface up and running! 🎉

 Make sure your backend (`main.py`) is also running for full functionality.
 `npm install` fetches the dependencies, and `npm ci` ensures consistency with the `package-lock.json`.

---

 **Connecting the Backend**

After setting up the frontend, fire up the FastAPI backend to handle prompt-to-code requests from CodeGenie:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

 The server started successfully at `http://0.0.0.0:8000`, and you’ll see real-time API requests being processed — a clear sign that CodeGenie is now communicating with the backend model.

 The `/generate` endpoint is actively handling requests coming from the React UI!

---

 **Launching CodeGenie Extension in VS Code**

Press `F5` in VS Code, which opens a new Extension Development Host window. This is where the CodeGenie extension boots up and becomes fully functional. From here, you can interact with it in three powerful ways:

🗨️ **Chat Panel**: Ask any code-related question directly in the CodeGenie chat interface.

💬 **Commented Prompt**: Write a comment in code like:
```js
// generate a login form in React
```
and let CodeGenie generate it right inside the file.

🎛 **Command Palette (Ctrl + Shift + P)**:
Access commands like:
- CodeGenie: Generate Code
- CodeGenie: Enable Autocomplete
- CodeGenie: Toggle Inline Suggestions

 Your AI assistant is now fully armed and ready to boost your productivity like never before!

