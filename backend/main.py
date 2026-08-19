from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import api_router
from backend.config import settings
from database.seed import seed_database

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic, explainable, and multi-tenant AI queue management engine powered by Gemini LLM triage, Scikit-learn ML wait time regression, and autonomous no-show consent recovery.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router (/api)
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    seed_database()
    print("🚀 FastAPI QueueFlow Engine Initialized with multi-tenant data.")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "QueueFlow FastAPI AI Engine",
        "version": "2.0.0",
        "gemini_active": bool(settings.GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
