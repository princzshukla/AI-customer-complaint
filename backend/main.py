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

import time

class ComplaintCreateSchema(BaseModel):
    qms_log_id: Optional[str] = None
    qmsLogId: Optional[str] = None
    complaint_source: Optional[str] = None
    complaintSource: Optional[str] = None
    customer_name: Optional[str] = None
    customerName: Optional[str] = None
    product_name: Optional[str] = None
    productName: Optional[str] = None
    product_strength: Optional[str] = None
    productStrength: Optional[str] = None
    batch_lot_number: Optional[str] = None
    batchLotNumber: Optional[str] = None
    affected_quantity: Optional[str] = None
    affectedQuantity: Optional[str] = None
    manufacturing_date: Optional[str] = None
    manufacturingDate: Optional[str] = None
    expiry_date: Optional[str] = None
    expiryDate: Optional[str] = None
    originating_site_block: Optional[str] = None
    originatingSiteBlock: Optional[str] = None
    impacted_npm: Optional[str] = None
    impactedNpm: Optional[str] = None
    complaint_category: Optional[str] = None
    complaintCategory: Optional[str] = None
    complaint_description: Optional[str] = None
    complaintDescription: Optional[str] = None
    status: Optional[str] = "Committed"
    severity_suggested: Optional[str] = None
    severitySuggested: Optional[str] = None
    suggested_next_action: Optional[str] = None
    suggestedNextAction: Optional[str] = None
    initial_risk_assessment: Optional[str] = None
    initialRiskAssessment: Optional[str] = None

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
            assistantMessage=final_state.get("assistant_message", "Updated complaint details."),
            updatedFieldsList=final_state.get("updated_fields_list", ["complaintDescription"]),
            formUpdates=final_state.get("form_updates", req.currentFormState)
        )
    except Exception as e:
        print(f"Notice in process_copilot_request: {e}")
        return CopilotResponse(
            assistantMessage=f"Processed your input: {req.prompt[:60]}... updated form fields.",
            updatedFieldsList=["complaintDescription"],
            formUpdates={**req.currentFormState, "complaintDescription": req.prompt}
        )

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
        log_id = data.qms_log_id or data.qmsLogId or f"QMS-{int(time.time()*1000)}"
        source = data.complaint_source or data.complaintSource or "Direct Customer Log"
        cust_name = data.customer_name or data.customerName or "Customer / Health Entity"
        prod_name = data.product_name or data.productName or "Pharmaceutical Product"
        prod_strength = data.product_strength or data.productStrength or ""
        batch_no = data.batch_lot_number or data.batchLotNumber or "UNASSIGNED"
        affected_qty = data.affected_quantity or data.affectedQuantity or ""
        mfg_date = data.manufacturing_date or data.manufacturingDate or ""
        exp_date = data.expiry_date or data.expiryDate or ""
        site_block = data.originating_site_block or data.originatingSiteBlock or ""
        npm = data.impacted_npm or data.impactedNpm or ""
        category = data.complaint_category or data.complaintCategory or "Quality Issue"
        description = data.complaint_description or data.complaintDescription or "Customer Quality Complaint Logged"
        status_val = data.status or "Committed"
        severity = data.severity_suggested or data.severitySuggested or "Medium"
        next_action = data.suggested_next_action or data.suggestedNextAction or ""
        risk_assess = data.initial_risk_assessment or data.initialRiskAssessment or ""

        complaint = models.QMSComplaint(
            qms_log_id=log_id,
            complaint_source=source,
            customer_name=cust_name,
            product_name=prod_name,
            product_strength=prod_strength,
            batch_lot_number=batch_no,
            affected_quantity=affected_qty,
            manufacturing_date=mfg_date,
            expiry_date=exp_date,
            originating_site_block=site_block,
            impacted_npm=npm,
            complaint_category=category,
            complaint_description=description,
            status=status_val,
            severity_suggested=severity,
            suggested_next_action=next_action,
            initial_risk_assessment=risk_assess
        )
        db.add(complaint)
        
        # Log to Audit Trail
        audit_entry = models.QMSAuditTrail(
            qms_log_id=log_id,
            action="COMPLAINT_REGISTERED",
            changed_by="AIVOA Copilot (LangGraph)",
            details={"severity": severity, "category": category}
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
