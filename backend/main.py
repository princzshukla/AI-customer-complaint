import os
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
from graph import app_graph

load_dotenv()

# Create tables on startup if PostgreSQL / database is available
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Database table auto-creation notice: {e}")

app = FastAPI(
    title="AIVOA Quality Assurance Copilot API",
    description="FastAPI Backend powered by LangGraph AI Agent framework & PostgreSQL database for Pharmaceutical QMS Customer Complaints.",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AttachmentInput(BaseModel):
    name: str
    mimeType: str
    base64: str

class CopilotRequest(BaseModel):
    prompt: str
    attachment: Optional[AttachmentInput] = None
    currentFormState: Dict[str, Any]

class CopilotResponse(BaseModel):
    assistantMessage: str
    updatedFieldsList: List[str]
    formUpdates: Dict[str, Any]

class ComplaintCreateSchema(BaseModel):
    qms_log_id: str
    complaint_source: str
    customer_name: str
    product_name: str
    product_strength: Optional[str] = None
    batch_lot_number: str
    affected_quantity: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    originating_site_block: Optional[str] = None
    impacted_npm: Optional[str] = None
    complaint_category: Optional[str] = None
    complaint_description: str
    status: Optional[str] = "Pending Triage"
    severity_suggested: Optional[str] = None
    suggested_next_action: Optional[str] = None
    initial_risk_assessment: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "framework": "FastAPI + LangGraph",
        "database": "PostgreSQL / SQLAlchemy",
        "version": "1.0.0"
    }

@app.post("/api/copilot/process", response_model=CopilotResponse)
async def process_copilot_request(req: CopilotRequest):
    try:
        # Run LangGraph State Graph
        initial_state = {
            "prompt": req.prompt,
            "attachment_name": req.attachment.name if req.attachment else None,
            "attachment_base64": req.attachment.base64 if req.attachment else None,
            "current_form_state": req.currentFormState,
            "assistant_message": "",
            "updated_fields_list": [],
            "form_updates": {}
        }
        
        final_state = app_graph.invoke(initial_state)
        
        return CopilotResponse(
            assistantMessage=final_state["assistant_message"],
            updatedFieldsList=final_state["updated_fields_list"],
            formUpdates=final_state["form_updates"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/complaints")
def list_complaints(db: Session = Depends(get_db)):
    try:
        complaints = db.query(models.QMSComplaint).order_by(models.QMSComplaint.committed_at.desc()).all()
        return complaints
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/complaints")
def create_complaint(data: ComplaintCreateSchema, db: Session = Depends(get_db)):
    try:
        complaint = models.QMSComplaint(**data.dict())
        db.add(complaint)
        
        # Log to Audit Trail
        audit_entry = models.QMSAuditTrail(
            qms_log_id=data.qms_log_id,
            action="COMPLAINT_REGISTERED",
            changed_by="AIVOA Copilot (LangGraph)",
            details={"severity": data.severity_suggested, "category": data.complaint_category}
        )
        db.add(audit_entry)
        
        db.commit()
        db.refresh(complaint)
        return {"status": "success", "data": complaint}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save complaint to DB: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
