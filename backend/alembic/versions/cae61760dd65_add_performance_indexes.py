"""add_performance_indexes

Revision ID: cae61760dd65
Revises: 23f2e2a5e70b
Create Date: 2025-09-03 19:52:01.882006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cae61760dd65'
down_revision: Union[str, Sequence[str], None] = '23f2e2a5e70b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for frequently queried fields."""
    
    # Reports table indexes
    op.create_index('idx_reports_author_id', 'reports', ['author_id'])
    op.create_index('idx_reports_status', 'reports', ['status'])
    op.create_index('idx_reports_created_at', 'reports', ['created_at'])
    op.create_index('idx_reports_author_status', 'reports', ['author_id', 'status'])
    
    # Clients table indexes
    op.create_index('idx_clients_author_id', 'clients', ['author_id'])
    op.create_index('idx_clients_created_at', 'clients', ['created_at'])
    
    # Properties table indexes  
    op.create_index('idx_properties_report_id', 'properties', ['report_id'])
    op.create_index('idx_properties_location', 'properties', ['latitude', 'longitude'])
    
    # Files table indexes
    op.create_index('idx_files_uploaded_by', 'files', ['uploaded_by'])
    op.create_index('idx_files_report_id', 'files', ['report_id'])
    op.create_index('idx_files_created_at', 'files', ['created_at'])
    op.create_index('idx_files_file_type', 'files', ['file_type'])
    
    # OCR Results table indexes
    op.create_index('idx_ocr_results_file_id', 'ocr_results', ['file_id'])
    op.create_index('idx_ocr_results_status', 'ocr_results', ['status'])
    
    # Valuation Lines table indexes
    op.create_index('idx_valuation_lines_report_id', 'valuation_lines', ['report_id'])
    
    # Users table indexes (if not already present)
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])


def downgrade() -> None:
    """Remove performance indexes."""
    
    # Drop all the indexes created in upgrade
    op.drop_index('idx_reports_author_id', 'reports')
    op.drop_index('idx_reports_status', 'reports')
    op.drop_index('idx_reports_created_at', 'reports')
    op.drop_index('idx_reports_author_status', 'reports')
    
    op.drop_index('idx_clients_author_id', 'clients')
    op.drop_index('idx_clients_created_at', 'clients')
    
    op.drop_index('idx_properties_report_id', 'properties')
    op.drop_index('idx_properties_location', 'properties')
    
    op.drop_index('idx_files_uploaded_by', 'files')
    op.drop_index('idx_files_report_id', 'files')
    op.drop_index('idx_files_created_at', 'files')
    op.drop_index('idx_files_file_type', 'files')
    
    op.drop_index('idx_ocr_results_file_id', 'ocr_results')
    op.drop_index('idx_ocr_results_status', 'ocr_results')
    
    op.drop_index('idx_valuation_lines_report_id', 'valuation_lines')
    
    op.drop_index('idx_users_email', 'users')
    op.drop_index('idx_users_is_active', 'users')
    op.drop_index('idx_users_created_at', 'users')
