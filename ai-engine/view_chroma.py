import os
import chromadb

def inspect_chromadb():
    # Point to your local chroma folder
    chroma_dir = os.path.join(os.path.dirname(__file__), "chroma_db")
    
    if not os.path.exists(chroma_dir):
        print("❌ ChromaDB not found. Have you uploaded a rubric yet?")
        return

    print("🔌 Connecting to Local ChromaDB...\n")
    client = chromadb.PersistentClient(path=chroma_dir)
    
    try:
        collection = client.get_collection("rubrics")
    except Exception:
        print("❌ 'rubrics' collection not found.")
        return

    count = collection.count()
    print(f"✅ Found 'rubrics' Collection!")
    print(f"📊 Total Vector Embeddings Stored: {count}\n")
    print("===================================\n")

    if count == 0:
        return

    # Fetch all data (limit 15 for console readability)
    data = collection.get(limit=15)
    
    for i in range(len(data['ids'])):
        print(f"🆔 ID: {data['ids'][i]}")
        print(f"📄 Text: {data['documents'][i]}")
        
        meta = data['metadatas'][i]
        print(f"✨ Metadata (Marks: {meta.get('marks')}, Type: {meta.get('type')})")
        print("-" * 50)

if __name__ == "__main__":
    inspect_chromadb()
