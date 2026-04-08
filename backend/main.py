import os
import asyncio
import shutil
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncAzureOpenAI
from rag_engine import get_retriever, build_vector_db
import db as database

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

@app.on_event("startup")
async def startup():
    await database.init_db()
    # Initial build if empty
    if not os.path.exists("faiss_index"):
        build_vector_db()

# Azure config
azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")
model_name = os.getenv("AZURE_OPENAI_MODEL_NAME")

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

MODEL_NAME = model_name

class ChatRequest(BaseModel):
    message: str
    role: str = "Employee"
    session_id: Optional[str] = None
    language: str = "en"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    model: str = "Azure OpenAI"

class HistorySession(BaseModel):
    id: str
    title: str
    created_at: str

class MessageInfo(BaseModel):
    role: str
    content: str

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "HR AI Assistant API is running"}

# --- Document Management ---

DOCS_DIR = os.path.join(os.path.dirname(__file__), "documents")

@app.get("/documents")
async def list_documents():
    if not os.path.exists(DOCS_DIR):
        return []
    files = os.listdir(DOCS_DIR)
    return [{"name": f, "size": os.path.getsize(os.path.join(DOCS_DIR, f))} for f in files if f.endswith(".pdf")]

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_path = os.path.join(DOCS_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Re-index
    build_vector_db()
    return {"message": f"Uploaded {file.filename} and updated knowledge base."}

@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    file_path = os.path.join(DOCS_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        # Re-index
        build_vector_db()
        return {"message": f"Deleted {filename} and updated knowledge base."}
    raise HTTPException(status_code=404, detail="File not found")

# --- Chat History ---

@app.get("/history/sessions", response_model=List[HistorySession])
async def get_sessions():
    sessions = await database.get_sessions()
    # Convert datetime to string
    return [{"id": s["id"], "title": s["title"], "created_at": str(s["created_at"])} for s in sessions]

@app.get("/history/sessions/{session_id}/messages", response_model=List[MessageInfo])
async def get_messages(session_id: str):
    messages = await database.get_messages(session_id)
    return [{"role": m["role"], "content": m["content"]} for m in messages]

@app.delete("/history/sessions/{session_id}")
async def delete_session(session_id: str):
    await database.delete_session(session_id)
    return {"message": "Session deleted"}

# --- Main Chat ---

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # 1. Manage Session
        session_id = request.session_id
        if not session_id:
            session_id = await database.create_session(title=request.message[:30])
        
        # 2. Save User Message
        await database.save_message(session_id, "user", request.message)

        # 3. RAG Integration
        context = ""
        retriever = get_retriever()
        if retriever:
            try:
                docs = retriever.invoke(request.message)
                context = "\n\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"RAG Error: {e}")
                context = "HR Policy: No specific document context found."
        
        # 4. Prompt Engineering (Multi-language)
        lang_instruction = "Respond in English." if request.language == "en" else "Respond in Arabic."
        system_prompt = f"""You are a professional HR assistant. You are helping an {request.role}.
Use the provided context to answer the user's question accurately. 
{lang_instruction}
If the context mentions specific values, use them.
If you don't know the answer, say you don't know.

Context:
{context}
"""
        
        # 5. Call Async Azure OpenAI
        if not client:
            raise HTTPException(status_code=500, detail="Async Azure OpenAI client not initialized.")

        # Get conversation history for context
        history = await database.get_messages(session_id)
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history[-5:]: # Last 5 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})

        response = await client.chat.completions.create(
            model=MODEL_NAME if MODEL_NAME else "deployment-missing",
            messages=messages
        )
        
        ai_message = response.choices[0].message.content
        
        # 6. Save AI Response
        await database.save_message(session_id, "assistant", ai_message)

        return ChatResponse(response=ai_message, session_id=session_id, model=response.model)
        
    except Exception as e:
        error_msg = str(e)
        print(f"CRITICAL ERROR in chat endpoint: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Backend Error: {error_msg}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
