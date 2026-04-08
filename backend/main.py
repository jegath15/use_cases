import os
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI
from rag_engine import get_retriever

# Load environment variables
load_dotenv()

app = FastAPI(title="HR AI Assistant API")

# 1. Standard CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Manual CORS Assurance Middleware (Fail-safe)
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Debug prints for credentials - Safely handle missing variables
azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")
model_name = os.getenv("AZURE_OPENAI_MODEL_NAME")

print(f"DEBUG: Endpoint: {azure_endpoint}")
print(f"DEBUG: Auth Key Found: {'Yes' if api_key else 'No'}")
if api_key and len(api_key) > 5:
    print(f"DEBUG: Auth Key (start): {api_key[:5]}...")
print(f"DEBUG: API Version: {api_version}")
print(f"DEBUG: Model/Deployment Name: {model_name}")

# Initialize Async Azure OpenAI Client - safely
client = None
if api_key and azure_endpoint and api_version:
    try:
        client = AsyncAzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint
        )
    except Exception as e:
        print(f"Warning: Failed to initialize Async Azure OpenAI client: {e}")
else:
    print("Warning: Missing required environment variables for Async Azure OpenAI Client.")

MODEL_NAME = model_name

class ChatRequest(BaseModel):
    message: str
    role: str = "Employee"

class ChatResponse(BaseModel):
    response: str
    model: str = "Azure OpenAI"

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "HR AI Assistant API is running"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Step 2: RAG Integration
        context = ""
        retriever = get_retriever()
        if retriever:
            try:
                # Use a thread pool for synchronous langchain invoke if needed, 
                # but currently get_retriever is already lazy and handles it.
                docs = retriever.invoke(request.message)
                context = "\n\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"RAG Error: {e}")
                context = "HR Policy: No specific document context found."
        
        system_prompt = f"""You are a professional HR assistant. You are helping an {request.role}.
Use the provided context to answer the user's question accurately. 
If the context mentions specific values like '12 days', use them.
If you don't know the answer, say you don't know.

Context:
{context}
"""
        
        # Call Async Azure OpenAI
        if not client:
            raise HTTPException(status_code=500, detail="Async Azure OpenAI client not initialized.")

        response = await client.chat.completions.create(
            model=MODEL_NAME if MODEL_NAME else "deployment-missing",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        
        ai_message = response.choices[0].message.content
        print(f"SUCCESS: Received response from Async Azure OpenAI ({response.model})")
        return ChatResponse(response=ai_message, model=response.model)
        
    except Exception as e:
        error_msg = str(e)
        print(f"CRITICAL ERROR in chat endpoint: {error_msg}")
        import traceback
        traceback.print_exc()
        
        # Determine if it's an Azure OpenAI specific error
        detail = f"Backend Error: {error_msg}"
        if "rate_limit" in error_msg.lower():
            detail = "Azure OpenAI Rate Limit exceeded. Please wait a moment."
        elif "authentication" in error_msg.lower():
            detail = "Azure OpenAI Authentication failed. Check your API Key."
        elif "not found" in error_msg.lower():
            detail = f"Azure Deployment '{MODEL_NAME}' not found. Check your deployment name."
            
        raise HTTPException(status_code=500, detail=detail)

if __name__ == "__main__":
    import uvicorn
    # Use the PORT provided by Render
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
