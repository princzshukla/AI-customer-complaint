from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class QMSComplaint(Base):
    __tablename__ = "qms_complaints"

    qms_log_id = Column(String(50), primary_key=True, index=True)
    complaint_source = Column(String(100), nullable=False)
    customer_name = Column(String(255), nullable=False)
    product_name = Column(String(255), nullable=False)
    product_strength = Column(String(100))
    batch_lot_number = Column(String(100), nullable=False)
    affected_quantity = Column(String(100))
    manufacturing_date = Column(String(100))
    expiry_date = Column(String(100))
    originating_site_block = Column(String(255))
    impacted_npm = Column(String(255))
    complaint_category = Column(String(100))
    complaint_description = Column(Text, nullable=False)
    status = Column(String(50), default="Pending Triage")
    severity_suggested = Column(String(50))
    suggested_next_action = Column(Text)
    initial_risk_assessment = Column(Text)
    committed_at = Column(DateTime, default=datetime.utcnow)

    audit_trails = relationship("QMSAuditTrail", back_populates="complaint", cascade="all, delete-orphan")
    capa_logs = relationship("QMSCAPALog", back_populates="complaint", cascade="all, delete-orphan")


class QMSAuditTrail(Base):
    __tablename__ = "qms_audit_trail"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    qms_log_id = Column(String(50), ForeignKey("qms_complaints.qms_log_id"))
    action = Column(String(100), nullable=False)
    changed_by = Column(String(100), default="AIVOA Copilot (LangGraph)")
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("QMSComplaint", back_populates="audit_trails")


class QMSCAPALog(Base):
    __tablename__ = "qms_capa_logs"

    capa_id = Column(String(50), primary_key=True, index=True)
    qms_log_id = Column(String(50), ForeignKey("qms_complaints.qms_log_id"))
    immediate_containment = Column(Text)
    corrective_action = Column(Text)
    preventive_action = Column(Text)
    risk_matrix_score = Column(String(50))
    completeness_score = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("QMSComplaint", back_populates="capa_logs")
