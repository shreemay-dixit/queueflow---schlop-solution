# QueueFlow Python FastAPI Backend

High-performance, async Python backend built on **FastAPI**, **Pydantic v2**, **Google GenAI SDK (Gemini)**, and **Scikit-Learn ML Regression**.

## Architecture & Features

- **Asynchronous FastAPI Router**: High-throughput REST API with automated interactive OpenAPI/Swagger documentation at `/docs`.
- **Gemini 3.7 / 2.5 Flash Triage Engine**: Parses ambiguous, colloquial, and multilingual user statements into structured triage outcomes (`priority_score`, `queue_type`, `clinical_reasoning`).
- **Scikit-Learn ML Wait-Time Regression Engine**: Adjusts base wait times according to real-time busy curves and queue depth.
- **Autonomous Slot Recapture**: Intercepts customer cancellations, isolated candidates, and opens 5-minute decision windows.

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Run with Uvicorn:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
3. Open API documentation:
   Navigate to `http://localhost:8000/docs`.
