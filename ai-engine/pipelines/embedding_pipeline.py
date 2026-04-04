import os
import chromadb
import google.generativeai as genai
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv

# Load env variables (check both ai-engine and ocr_v2 folders just in case)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ocr_v2", ".env"))

# Ensure API key is configured
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_KEY and GEMINI_KEY != "YOUR_GEMINI_API_KEY_HERE":
    genai.configure(api_key=GEMINI_KEY)

def generate_embedding(text: str) -> list[float]:
    """Generates a text embedding using Gemini."""
    if not GEMINI_KEY or GEMINI_KEY == "YOUR_GEMINI_API_KEY_HERE":
        raise ValueError("GEMINI_API_KEY is missing. Cannot generate embeddings.")
    
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def embed_and_store_rubric(rubric_id: str, mongo_uri: str):
    """
    1. Fetches a RubricDocument from MongoDB
    2. Embeds each concept_meaning point
    3. Stores it in ChromaDB
    4. Updates embedding_status to DONE in MongoDB
    """
    print(f"[EmbeddingPipeline] Starting embedding for Rubric: {rubric_id}")
    
    # 1. Connect to MongoDB
    client = MongoClient(mongo_uri)
    db = client.get_default_database() # or explicitly handle DB if encoded in URI
    
    # Depending on how the URI is formatted, get_default_database might fail if auth DB is different. 
    # The URI is mongodb+srv://karthik:***@cluster0.svk1xwj.mongodb.net/ignisia?...
    # so we should use db = client['ignisia']
    db = client['ignisia']

    rubric_doc = db.rubricdocuments.find_one({"_id": ObjectId(rubric_id)})
    if not rubric_doc:
        print(f"[EmbeddingPipeline] ERROR: RubricDocument {rubric_id} not found in DB.")
        return

    # Update state to PROCESSING
    db.rubricdocuments.update_one(
        {"_id": ObjectId(rubric_id)},
        {"$set": {"embedding_status": "PROCESSING"}}
    )

    try:
        # 2. Setup ChromaDB
        chroma_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
        os.makedirs(chroma_dir, exist_ok=True)
        chroma_client = chromadb.PersistentClient(path=chroma_dir)
        
        # We store rubric points in a collection named 'rubrics'
        collection = chroma_client.get_or_create_collection(name="rubrics")
        
        # 3. Generate and Store Embeddings
        docs = []
        metadatas = []
        ids = []
        embeddings = []

        total_points = 0
        for q_idx, question in enumerate(rubric_doc.get("questions", [])):
            q_num = question.get("question_number", q_idx + 1)
            q_text = question.get("question_text", f"Q{q_num}")
            
            for p_idx, point in enumerate(question.get("rubric_points", [])):
                # We embed the concept meaning if available, otherwise the raw point text
                text_to_embed = point.get("concept_meaning") or point.get("point")
                if not text_to_embed:
                    continue
                
                # Combine it with question context to give it better semantic placement
                rich_text = f"Question: {q_text}\nRubric Criterion: {text_to_embed}"
                
                print(f"[EmbeddingPipeline] Generating vector for Q{q_num} Point {p_idx+1}...")
                vector = generate_embedding(rich_text)
                
                # Print vector snippet for the judges!
                dim_count = len(vector)
                snippet = ", ".join([f"{v:.4f}" for v in vector[:5]])
                print(f"      ↳ Vector generated: [{snippet}, ...] ({dim_count} dimensions)")
                
                point_id = f"{rubric_id}_Q{q_num}_P{p_idx}"
                
                docs.append(rich_text)
                embeddings.append(vector)
                metadatas.append({
                    "rubricDocumentId": str(rubric_id),
                    "sessionId": str(rubric_doc.get("sessionId", "")),
                    "question_number": int(q_num) if q_num is not None else -1,
                    "question_text": str(q_text),
                    "point_text": str(point.get("point", "")),
                    "marks": float(point.get("marks", 0) or 0),
                    "type": str(point.get("type", "concept_point"))
                })
                ids.append(point_id)
                total_points += 1

        if total_points > 0:
            print(f"[EmbeddingPipeline] Upserting {total_points} vectors to ChromaDB...")
            collection.upsert(
                documents=docs,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=ids
            )
        else:
            print("[EmbeddingPipeline] WARNING: No valid rubric points found to embed.")

        # 4. Success State
        db.rubricdocuments.update_one(
            {"_id": ObjectId(rubric_id)},
            {"$set": {"embedding_status": "DONE"}}
        )
        print(f"[EmbeddingPipeline] Successfully finished embeddings for {rubric_id}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        # 5. Fail State
        db.rubricdocuments.update_one(
            {"_id": ObjectId(rubric_id)},
            {"$set": {"embedding_status": "FAILED"}}
        )
        print(f"[EmbeddingPipeline] Embedding FAILED for {rubric_id}: {e}")
