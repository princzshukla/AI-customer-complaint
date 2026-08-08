# AIVOA Quality Assurance Copilot - Python FastAPI + LangGraph Backend

This directory contains the Python FastAPI backend powered by the **LangGraph** AI agent framework.

## Tech Stack
- **Framework**: FastAPI
- **AI Agent Orchestration**: LangGraph (`langgraph.graph.StateGraph`)
- **LLM Integration**: LangChain Google GenAI (`langchain-google-genai`) / Gemini API
- **Data Validation**: Pydantic v2

## How to Run locally with Python

1. Create a Python virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Set your Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the FastAPI dev server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. View Interactive API Docs:
   - OpenAPI Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
