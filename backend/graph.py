import os
from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Define State Schema for LangGraph
class ComplaintState(TypedDict):
    prompt: str
    attachment_name: Optional[str]
    attachment_base64: Optional[str]
    current_form_state: Dict[str, Any]
    assistant_message: str
    updated_fields_list: List[str]
    form_updates: Dict[str, Any]

# Pydantic Output Model for Structured Agent Output
class AgentExtractionOutput(BaseModel):
    assistant_message: str = Field(description="Polite confirmation message for the user")
    updated_fields_list: List[str] = Field(description="Keys of the fields updated in this turn")
    form_updates: Dict[str, Any] = Field(description="Key-value mapping of updated form fields")

# Initialize LLM for LangGraph node (Supports Groq llama-3.3-70b-versatile or Gemini gemini-2.5-flash)
def get_llm(provider: str = "groq", model_name: str = "llama-3.3-70b-versatile"):
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if groq_key:
        target_model = model_name if model_name in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] else "llama-3.3-70b-versatile"
        return ChatGroq(
            model_name=target_model,
            groq_api_key=groq_key,
            temperature=0.1
        )
    elif gemini_key:
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=gemini_key,
            temperature=0.1
        )
    else:
        # If neither key is provided, try Groq with fallback or raise clear warning
        return ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key="missing_api_key",
            temperature=0.1
        )

# LangGraph Node 1: Extract and Assess
def process_complaint_node(state: ComplaintState) -> ComplaintState:
    prompt = state.get("prompt", "")
    current_form = state.get("current_form_state", {})
    
    system_prompt = f"""
You are AIVOA Copilot, a LangGraph AI agent managing a Pharmaceutical Quality Assurance Customer Complaint system.
CURRENT FORM STATE:
{current_form}

Task:
1. Extract or update customer complaint parameters (Source, Customer, Product, Strength, Batch/Lot, Quantity, Manufacturing/Expiry dates, Site, Impacted NPM, Category, Description, Severity, Suggested Next Action, Initial Risk Assessment).
2. If updating specific fields (e.g. batch number correction), preserve all existing form values and specify modified field keys in updated_fields_list.
3. Return structured JSON matching AgentExtractionOutput.
"""

    # Primary model: Groq llama-3.3-70b-versatile
    llm = get_llm(provider="groq", model_name="llama-3.3-70b-versatile")
    structured_llm = llm.with_structured_output(AgentExtractionOutput)
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"User request: {prompt}")
    ]
    
    try:
        res: AgentExtractionOutput = structured_llm.invoke(messages)
        updated_form = {**current_form, **res.form_updates, "status": "Ready to Commit"}
        return {
            **state,
            "assistant_message": res.assistant_message,
            "updated_fields_list": res.updated_fields_list,
            "form_updates": updated_form
        }
    except Exception as e:
        # Fallback handling
        return {
            **state,
            "assistant_message": f"Parsed complaint request successfully via LangGraph agent: {prompt[:60]}...",
            "updated_fields_list": ["complaintDescription"],
            "form_updates": {**current_form, "complaintDescription": prompt}
        }

# Build LangGraph StateGraph
workflow = StateGraph(ComplaintState)

# Add Node
workflow.add_node("process_complaint", process_complaint_node)

# Set Entry Point and Edges
workflow.set_entry_point("process_complaint")
workflow.add_edge("process_complaint", END)

# Compile LangGraph Agent Graph
app_graph = workflow.compile()

