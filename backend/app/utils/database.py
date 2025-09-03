"""
Database transaction utilities for ValuerPro application.
Provides context managers and decorators for database operations.
"""

import logging
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable, Optional, TypeVar, Generator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError, OperationalError

from app.middleware.error_handling import (
    BusinessLogicError, 
    DuplicateResourceError, 
    InvalidOperationError
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


@contextmanager
def database_transaction(db: Session) -> Generator[Session, None, None]:
    """
    Context manager for database transactions with automatic rollback on error.
    
    Args:
        db: SQLAlchemy database session
        
    Yields:
        Session: The database session within a transaction
        
    Raises:
        BusinessLogicError: For constraint violations and data errors
        Exception: For unexpected database errors
    """
    try:
        db.begin()
        logger.debug("Started database transaction")
        yield db
        db.commit()
        logger.debug("Committed database transaction")
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error: {e}")
        
        error_msg = str(e).lower()
        if "duplicate key" in error_msg or "unique constraint" in error_msg:
            raise DuplicateResourceError("Record", "unique field") from e
        elif "foreign key" in error_msg:
            raise InvalidOperationError("create record", "Referenced record does not exist") from e
        else:
            raise BusinessLogicError("Database constraint violation") from e
            
    except (DataError, OperationalError) as e:
        db.rollback()
        logger.error(f"Database operation error: {e}")
        raise BusinessLogicError("Database operation failed") from e
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected database error: {e}")
        raise


def transactional(commit: bool = True):
    """
    Decorator for functions that need database transactions.
    
    Args:
        commit: Whether to auto-commit the transaction (default: True)
        
    Usage:
        @transactional()
        def create_report_with_client(db: Session, report_data, client_data):
            # This function will run in a transaction
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Find the database session in args or kwargs
            db_session: Optional[Session] = None
            
            # Check kwargs first
            if 'db' in kwargs and isinstance(kwargs['db'], Session):
                db_session = kwargs['db']
            else:
                # Check args for Session instances
                for arg in args:
                    if isinstance(arg, Session):
                        db_session = arg
                        break
            
            if db_session is None:
                raise ValueError("No database session found in function arguments")
            
            if commit:
                with database_transaction(db_session):
                    return func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
                
        return wrapper
    return decorator


class TransactionalService:
    """
    Base class for services that perform database operations.
    Provides transaction management methods.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    @contextmanager
    def transaction(self):
        """Start a new transaction context"""
        with database_transaction(self.db) as db:
            yield db
            
    def execute_in_transaction(self, operation: Callable[[], T]) -> T:
        """
        Execute an operation within a transaction.
        
        Args:
            operation: Function to execute within transaction
            
        Returns:
            Result of the operation
        """
        with self.transaction():
            return operation()


# Specific transaction patterns for common operations
@contextmanager
def report_creation_transaction(db: Session, user_id: str) -> Generator[Session, None, None]:
    """
    Specialized transaction context for creating reports with related entities.
    
    Args:
        db: Database session
        user_id: ID of the user creating the report
        
    Yields:
        Session: Database session within transaction
    """
    try:
        with database_transaction(db) as session:
            logger.info(f"Starting report creation transaction for user {user_id}")
            yield session
            logger.info(f"Report creation transaction completed for user {user_id}")
            
    except Exception as e:
        logger.error(f"Report creation transaction failed for user {user_id}: {e}")
        raise


@contextmanager  
def batch_operation_transaction(db: Session, operation_type: str, batch_size: int) -> Generator[Session, None, None]:
    """
    Transaction context for batch operations with progress logging.
    
    Args:
        db: Database session
        operation_type: Description of the batch operation
        batch_size: Number of items being processed
        
    Yields:
        Session: Database session within transaction
    """
    try:
        with database_transaction(db) as session:
            logger.info(f"Starting batch {operation_type} transaction for {batch_size} items")
            yield session
            logger.info(f"Batch {operation_type} transaction completed for {batch_size} items")
            
    except Exception as e:
        logger.error(f"Batch {operation_type} transaction failed for {batch_size} items: {e}")
        raise


# Helper functions for common transaction patterns
def safe_create_with_relations(db: Session, primary_model, primary_data: dict, 
                              relations: list[tuple[Any, dict]]) -> Any:
    """
    Safely create a primary record with related records in a single transaction.
    
    Args:
        db: Database session
        primary_model: SQLAlchemy model class for primary record
        primary_data: Data for primary record
        relations: List of tuples (model_class, data_dict) for related records
        
    Returns:
        The created primary record
        
    Example:
        report = safe_create_with_relations(
            db, Report, report_data,
            [(Client, client_data), (Property, property_data)]
        )
    """
    with database_transaction(db) as session:
        # Create primary record
        primary_record = primary_model(**primary_data)
        session.add(primary_record)
        session.flush()  # Get the ID without committing
        
        # Create related records
        for model_class, data in relations:
            if hasattr(model_class, 'report_id'):
                data['report_id'] = primary_record.id
            elif hasattr(model_class, 'parent_id'):
                data['parent_id'] = primary_record.id
                
            related_record = model_class(**data)
            session.add(related_record)
        
        return primary_record


def safe_update_with_relations(db: Session, primary_record, primary_updates: dict,
                              relation_updates: list[tuple[Any, str, dict]]) -> Any:
    """
    Safely update a primary record and its relations in a single transaction.
    
    Args:
        db: Database session
        primary_record: The primary record to update
        primary_updates: Updates for the primary record
        relation_updates: List of (record, field_name, updates) tuples
        
    Returns:
        The updated primary record
    """
    with database_transaction(db) as session:
        # Update primary record
        for field, value in primary_updates.items():
            setattr(primary_record, field, value)
        
        # Update related records
        for record, field_name, updates in relation_updates:
            for field, value in updates.items():
                setattr(record, field, value)
        
        return primary_record


# Transaction monitoring and metrics
class TransactionMetrics:
    """Simple transaction metrics collector"""
    
    def __init__(self):
        self.successful_transactions = 0
        self.failed_transactions = 0
        self.rollback_count = 0
        
    def record_success(self):
        self.successful_transactions += 1
        
    def record_failure(self):
        self.failed_transactions += 1
        
    def record_rollback(self):
        self.rollback_count += 1
        
    def get_stats(self) -> dict:
        total = self.successful_transactions + self.failed_transactions
        success_rate = (self.successful_transactions / total * 100) if total > 0 else 0
        
        return {
            "total_transactions": total,
            "successful": self.successful_transactions,
            "failed": self.failed_transactions,
            "rollbacks": self.rollback_count,
            "success_rate_percent": round(success_rate, 2)
        }


# Global metrics instance
transaction_metrics = TransactionMetrics()