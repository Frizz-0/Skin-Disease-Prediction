from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Important: Allow your Vercel frontend to talk to your Vercel backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your specific domain
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "Neural Engine Online", "location": "Vercel Edge"}

# Your Grad-CAM endpoint logic goes here...