# tools/ingest_cases.py
import os, json
from supabase import create_client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MODEL = os.getenv("EMBED_MODEL_NAME","all-MiniLM-L6-v2")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
embedder = SentenceTransformer(MODEL)

def upsert_case(case):
    # case must include case_id, title, summary, full_text, jurisdiction, case_type, outcome_label, damages_amount, judges
    resp = supabase.table("legal_cases").upsert(case).execute()
    return resp

def upsert_caselaw_cache(case_id, title, summary, embedding):
    payload = {
        "case_id": case_id,
        "title": title,
        "summary": summary,
        "embedding": embedding
    }
    resp = supabase.table("caselaw_cache").upsert(payload).execute()
    return resp

def process_file(path):
    with open(path,"r",encoding="utf-8") as f:
        for line in tqdm(f):
            case = json.loads(line)
            # compute embedding from summary + title
            text = (case.get("summary") or "")[:2000]
            emb = embedder.encode([text], show_progress_bar=False)[0].tolist()
            # upsert
            upsert_case(case)
            upsert_caselaw_cache(case["case_id"], case.get("case_name"), case.get("summary"), emb)

if __name__ == "__main__":
    import sys
    process_file(sys.argv[1])
