import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AzureOpenAI
from rag_engine import get_retriever

# Load environment variables
load_dotenv()

app = FastAPI(title="HR AI Assistant API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debug prints for credentials
print(f"DEBUG: Endpoint: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
print(f"DEBUG: Auth Key (start): {os.getenv('AZURE_OPENAI_API_KEY')[:5]}...")
print(f"DEBUG: API Version: {os.getenv('AZURE_OPENAI_API_VERSION')}")
print(f"DEBUG: Model/Deployment Name: {os.getenv('AZURE_OPENAI_MODEL_NAME')}")

# Initialize Azure OpenAI Client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

MODEL_NAME = os.getenv("AZURE_OPENAI_MODEL_NAME")

class ChatRequest(BaseModel):
    message: str
    role: str = "Employee"

class ChatResponse(BaseModel):
    response: str
    model: str = "Azure OpenAI"

@app.get("/")
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
        
        # Call Azure OpenAI
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ]
        )
        
        ai_message = response.choices[0].message.content
        print(f"SUCCESS: Received response from Azure OpenAI ({response.model})")
        return ChatResponse(response=ai_message, model=response.model)
        
    except Exception as e:
        print(f"Error calling Azure OpenAI: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
