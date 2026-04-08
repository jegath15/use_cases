import os
from dotenv import load_dotenv

load_dotenv()

# Lazy loading for the embedding model to improve startup performance on Render
_embeddings = None

def get_embeddings():
    """Lazily initialize and return the Azure OpenAI embedding model."""
    global _embeddings
    if _embeddings is None:
        print("Initializing AzureOpenAIEmbeddings...")
        from langchain_openai import AzureOpenAIEmbeddings
        
        # Use specific embedding deployment or fallback to a common name
        deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
        
        _embeddings = AzureOpenAIEmbeddings(
            azure_deployment=deployment,
            openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        )
    return _embeddings

def build_vector_db():
    """Load all PDFs from documents folder, split text, and create FAISS index."""
    # Deferred imports
    from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS
    
    DOCS_DIR = os.path.join(os.path.dirname(__file__), "documents")
    if not os.path.exists(DOCS_DIR):
        os.makedirs(DOCS_DIR)

    try:
        embeddings = get_embeddings()
        print(f"Scanning {DOCS_DIR} for documents...")
        
        # Load all PDFs in the directory
        loader = DirectoryLoader(DOCS_DIR, glob="./*.pdf", loader_cls=PyPDFLoader)
        docs = loader.load()
        
        if not docs:
            print("No documents found in documents folder.")
            # If no docs, we might want to clear the index or keep the existing one?
            # For now, let's just return None if empty.
            return None

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = text_splitter.split_documents(docs)
        
        print(f"Creating vector store from {len(splits)} splits...")
        vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
        
        # Save the index locally for persistence
        vectorstore.save_local("faiss_index")
        print("Vector store saved to 'faiss_index'")
        return vectorstore
    except Exception as e:
        print(f"\nCRITICAL WARNING: Failed to build vector database: {e}")
        return None

def get_retriever():
    """Load existing index and return a retriever."""
    if os.path.exists("faiss_index"):
        # Deferred imports
        from langchain_community.vectorstores import FAISS
        
        try:
            embeddings = get_embeddings()
            vectorstore = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
            return vectorstore.as_retriever(search_kwargs={"k": 3})
        except Exception as e:
            print(f"Error loading FAISS index: {e}")
            return None
    return None

if __name__ == "__main__":
    # If run directly, build the DB from the documents folder
    build_vector_db()
