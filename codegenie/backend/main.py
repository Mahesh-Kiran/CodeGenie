from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer # DL Library Developed by Hugging Face

Model_Name = "deepseek-ai/deepseek-coder-1.3b-instruct"  # Model Used
Model_location = "./deepseek_model" # Model Location
OFFLOAD_FOLDER = "./offload" # Loads the Model into ROM if RAM being used is completely filled. Only used for better the loading.

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"   # Set device to GPU if available, otherwise CPU

tokenizer = AutoTokenizer.from_pretrained(Model_Name, cache_dir = Model_location) # Downloads and loads the tokenizer, not the whole model.

model = AutoModelForCausalLM.from_pretrained(
    Model_Name,
    torch_dtype = torch.float16 if DEVICE == "cuda" else torch.float32,  # Makes the usual values from float32 to float16, reducing the data thus making it faster for processing. But Works well only on GPUs.
    device_map = DEVICE,
    offload_folder = OFFLOAD_FOLDER,
    cache_dir = Model_location
).eval() # Disables training-specific behaviors like Droupout, etc.. and puts in evaluating mode.

app = FastAPI()

# Add the CORS middleware to handle cross-origin requests i.e. between different ports
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"], # Allow all domains to make requests to this API
    allow_credentials = True, # Allow credentials such as cookies and authorization headers to be included in requests so that API can recognize the user
    allow_methods = ["*"]  # Allow all HTTP methods: GET, POST, PUT, DELETE, etc.
)

class CodeRequest(BaseModel):
    prompt: str
    max_tokens: int

@app.post("/generate")
async def generate_code(request: CodeRequest): # To Make the Network Communications b/w servers smoother using async 
    inputs = tokenizer(request.prompt, return_tensors = "pt").to(DEVICE) # Returns in the form of Dictionary like {"id": ...}
    
    outputs = model.generate(
        **inputs, # Gives the unpacked dictionary like id = [..], ..., etc.
        max_length = request.max_tokens,
        pad_token_id = model.config.eos_token_id  # Prevents early stopping and only stops when max_tokens are done or it encounters <EOS>
    )

    response = tokenizer.decode(outputs[0], skip_special_tokens = True) # Special Tokens like <EOS> are removed
    return {"response": response}

print(f"✅ FastAPI Server is ready to be Running on {DEVICE}!")

# Run the FastAPI server:
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# We are using 2 servers since we are still developing the model and for better debugging purposes, we are using 2 ports.