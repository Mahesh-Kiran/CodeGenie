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

@app.post("/debug")
async def debug_code(request: CodeRequest):
    code_to_debug = request.prompt.strip()
    enhanced_prompt = (
        "Analyze the following code. "
        "List ONLY the syntax or logical errors (if any) found in the code. "
        "If the code is correct, reply with 'No errors found.'\n\n"
        f"Code:\n{code_to_debug}"  
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