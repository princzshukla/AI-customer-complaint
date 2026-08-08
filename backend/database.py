import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default PostgreSQL connection URL (can be overridden via DATABASE_URL environment variable)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:prince12@localhost:5432/complaint-project"
)

# Use SQLite as a fallback if PostgreSQL driver is not installed or SQLite URL is explicitly set
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    except Exception:
# Fallback to sqlite in /tmp for serverless read-only filesystem environments (Vercel)
        sqlite_path = "/tmp/qms_fallback.db" if os.name != "nt" else "./qms_fallback.db"
        engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
