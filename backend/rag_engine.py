import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Lazy loading for the embedding model to improve startup performance on Render
_embeddings = None

def get_embeddings():
    """Lazily initialize and return the embedding model."""
    global _embeddings
    if _embeddings is None:
        print("Loading HuggingFace embedding model (all-MiniLM-L6-v2)...")
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings

def build_vector_db(pdf_path: str):
    """Load PDF, split text, and create FAISS index."""
    embeddings = get_embeddings()
    print(f"Loading {pdf_path}...")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = text_splitter.split_documents(docs)
    
    print(f"Creating vector store from {len(splits)} splits...")
    vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
    
    # Save the index locally for persistence
    vectorstore.save_local("faiss_index")
    print("Vector store saved to 'faiss_index'")
    return vectorstore

def get_retriever():
    """Load existing index and return a retriever."""
    if os.path.exists("faiss_index"):
        embeddings = get_embeddings()
        vectorstore = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
        return vectorstore.as_retriever(search_kwargs={"k": 3})
    return None

if __name__ == "__main__":
    # If run directly, build the DB from the sample PDF
    build_vector_db("hr_policy.pdf")
