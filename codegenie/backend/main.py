from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# ✅ Load DeepSeek Coder model
MODEL_NAME = "deepseek-ai/deepseek-coder-1.3b-instruct"  # Ensure correct model version

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir="./deepseek_model")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME, 
    torch_dtype=torch.float16,  
    device_map="cuda",  
    offload_folder="./offload",  
    cache_dir="./deepseek_model"
).eval()

# ✅ Create FastAPI app
app = FastAPI()

# ✅ Fix CORS issues for browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class CodeRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000  # Increased max tokens

@app.post("/generate")
async def generate_code(request: CodeRequest):
    inputs = tokenizer(request.prompt, return_tensors="pt").to("cuda")

    outputs = model.generate(
        **inputs, 
        max_length=request.max_tokens,  
        temperature=0.2,  # Lower temperature for deterministic responses
        do_sample=True,
        pad_token_id=model.config.eos_token_id  # Prevents early stopping
    )
    full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = full_output[len(request.prompt):].strip()
    return {"response": response}

@app.post("/generate-large")
async def generate_large_code(request: CodeRequest):
    max_tokens = min(request.max_tokens, 4096)  # or whatever your model can handle
    inputs = tokenizer(request.prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(
        **inputs,
        max_length=max_tokens,
        temperature=0.2,
        do_sample=True,
        pad_token_id=model.config.eos_token_id
    )
    full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = full_output[len(request.prompt):].strip()
    return {"response": response}

@app.post("/explain")
async def explain_code(request: CodeRequest):
    explain_prompt = (
        "Explain the following code in detail, including what it does, how it works, and any important concepts:\n\n"
        f"{request.prompt}\n\n"
        "Explanation:"
    )
    max_tokens = min(request.max_tokens, 2048)  # or whatever your model supports
    inputs = tokenizer(explain_prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(
        **inputs,
        max_length=max_tokens,
        temperature=0.2,
        do_sample=True,
        pad_token_id=model.config.eos_token_id
    )
    full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = full_output[len(explain_prompt):].strip()
    return {"response": response}

@app.post("/improve")
async def improve_code(request: CodeRequest):
    code_to_improve = request.prompt.strip()
    improve_prompt = (
        "Improve the following code by:\n"
        "- Fixing any syntax or logical errors\n"
        "- Optimizing for better time and space efficiency\n"
        "- Removing redundant or unnecessary lines\n"
        "Return only the improved code. Do not include explanations or comments.\n\n"
        f"Code:\n{code_to_improve}\n"
        "Improved Code:"
    )
    inputs = tokenizer(improve_prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(
        **inputs,
        max_length=request.max_tokens,
        temperature=0.2,
        do_sample=True,
        pad_token_id=model.config.eos_token_id,
        eos_token_id=model.config.eos_token_id
    )
    full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Remove the prompt from the output if the model echoes it
    if full_output.startswith(improve_prompt):
        response = full_output[len(improve_prompt):].lstrip("\n\r ")
    else:
        response = full_output
    return {"response": response}


@app.post("/debug")
async def debug_code(request: CodeRequest):
    code_to_debug = request.prompt.strip()
    enhanced_prompt = (
    "You are a code review assistant. "
    "Analyze the following code and do the following:\n"
    "1. List ONLY the actual syntax or logical errors found in the code. "
    "2. Do NOT repeat the same error multiple times. "
    "3. For each error, provide a one-line description.\n"
    "4. After listing errors, provide the corrected version of the code.\n"
    "5. If the code is already correct, reply with 'No errors found.' and show the code as is.\n\n"
    f"Code:\n{code_to_debug}\n"
    "Errors (if any):"
    )
    inputs = tokenizer(enhanced_prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(
    **inputs,
    max_length=request.max_tokens  ,
    temperature=0.3,              # Slightly more randomness (avoids loops)
    do_sample=True,
    pad_token_id=model.config.eos_token_id,
    eos_token_id=model.config.eos_token_id
    )

    full_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Remove the prompt from the output if the model echoes it
    if full_output.startswith(enhanced_prompt):
        response = full_output[len(enhanced_prompt):].lstrip("\n\r ")
    else:
        response = full_output
    return {"response": response}

print("✅ FastAPI Server is ready!")

# Run the FastAPI server:
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload