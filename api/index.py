import sys
import os

# Add backend directory to path so FastAPI imports work seamlessly on Vercel
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app
