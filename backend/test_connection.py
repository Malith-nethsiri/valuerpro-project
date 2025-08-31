#!/usr/bin/env python3
"""Test database connection"""
from app.db import engine
from sqlalchemy import text
import sys

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version()'))
        version = result.fetchone()[0]
        print("SUCCESS: Database connection successful!")
        print(f"PostgreSQL version: {version[:50]}...")
        
        # Test tables exist
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        print(f"SUCCESS: Found {len(tables)} tables: {', '.join(tables[:5])}...")
        
except Exception as e:
    print(f"ERROR: Database connection failed: {e}")
    sys.exit(1)