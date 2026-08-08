import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default PostgreSQL connection URL (can be overridden via DATABASE_URL environment variable)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:prince12@localhost:5432/complaint-project"
)

# Fix Render's "postgres://" prefix if present (SQLAlchemy 1.4+ requires "postgresql://")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def create_active_engine():
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    try:
        pg_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return pg_engine
    except Exception as e:
        print(f"PostgreSQL connection failed ({e}). Falling back to SQLite.")
        sqlite_path = "/tmp/qms_fallback.db" if os.name != "nt" else "./qms_fallback.db"
        return create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

engine = create_active_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

