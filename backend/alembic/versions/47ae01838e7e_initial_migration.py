"""Initial migration

Revision ID: 47ae01838e7e
Revises: 
Create Date: 2025-08-23 00:50:16.226873

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47ae01838e7e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('qualifications', sa.String(), nullable=True),
        sa.Column('panel_memberships', sa.String(), nullable=True),
        sa.Column('business_address', sa.Text(), nullable=True),
        sa.Column('contact_numbers', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create reports table
    op.create_table('reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('reference_number', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, default='draft'),
        sa.Column('property_address', sa.Text(), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('author_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_reference_number'), 'reports', ['reference_number'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_reports_reference_number'), table_name='reports')
    op.drop_table('reports')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
