from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.db import get_db
from app.models import User, ValuerProfile
from app.schemas import (
    UserCreate, User as UserSchema, Token, UserUpdate,
    ValuerProfileCreate, ValuerProfileUpdate,
    ProfileValidationResult, ProfileCompletionStatus
)
from app.deps import get_current_active_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


@router.post("/register", response_model=UserSchema)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role or "valuer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create valuer profile with professional information if provided
    if any([user_in.registration_no, user_in.qualifications, user_in.experience_years,
            user_in.specialization, user_in.firm_name, user_in.designation, user_in.contact_phone]):
        
        profile_data = {
            "user_id": user.id,
            "full_name": user_in.full_name,
            "registration_no": user_in.registration_no,
            "qualifications": [user_in.qualifications] if user_in.qualifications else None,
            "designation": user_in.designation,
            "company_name": user_in.firm_name,
            "contact_phones": [user_in.contact_phone] if user_in.contact_phone else None,
            "contact_email": user_in.email
        }
        
        # Remove None values
        profile_data = {k: v for k, v in profile_data.items() if v is not None}
        
        try:
            profile = ValuerProfile(**profile_data)
            db.add(profile)
            db.commit()
            db.refresh(profile)
            
            # Refresh user to include profile
            db.refresh(user)
        except Exception as e:
            # If profile creation fails, log error but don't fail registration
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Profile creation failed during registration for user {user.email}: {e}")
            db.rollback()
            # Note: Could consider adding a warning field to response in the future
    
    return user


@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserSchema)
def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/valuer-profile", response_model=UserSchema)
def create_valuer_profile(
    profile_in: ValuerProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if profile already exists
    existing_profile = db.query(ValuerProfile).filter(
        ValuerProfile.user_id == current_user.id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Valuer profile already exists for this user"
        )
    
    # Create valuer profile
    profile_data = profile_in.model_dump()
    profile_data["user_id"] = current_user.id
    
    profile = ValuerProfile(**profile_data)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    # Refresh user to include profile
    db.refresh(current_user)
    return current_user


@router.put("/me/valuer-profile", response_model=UserSchema)
def update_valuer_profile(
    profile_in: ValuerProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get existing profile
    profile = db.query(ValuerProfile).filter(
        ValuerProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Valuer profile not found"
        )
    
    # Update profile
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    # Refresh user to include updated profile
    db.refresh(current_user)
    return current_user


def validate_profile_completeness(profile: ValuerProfile) -> ProfileValidationResult:
    """Validate if valuer profile is complete for professional reports"""
    required_fields = {
        'qualifications': 'Professional qualifications',
        'registration_no': 'Registration number',
        'company_name': 'Company name',
        'contact_phones': 'Contact phone numbers'
    }
    
    missing_fields = []
    
    if not profile:
        missing_fields = list(required_fields.values())
        return ProfileValidationResult(
            is_complete=False,
            missing_fields=missing_fields,
            completion_percentage=0.0,
            message="Valuer profile not found. Please create your professional profile."
        )
    
    # Check required fields
    if not profile.qualifications or len(profile.qualifications) == 0:
        missing_fields.append(required_fields['qualifications'])
    
    if not profile.registration_no or profile.registration_no.strip() == "":
        missing_fields.append(required_fields['registration_no'])
    
    if not profile.company_name or profile.company_name.strip() == "":
        missing_fields.append(required_fields['company_name'])
    
    if not profile.contact_phones or len(profile.contact_phones) == 0:
        missing_fields.append(required_fields['contact_phones'])
    
    # Calculate completion percentage
    total_fields = len(required_fields)
    completed_fields = total_fields - len(missing_fields)
    completion_percentage = (completed_fields / total_fields) * 100
    
    is_complete = len(missing_fields) == 0
    message = "Profile complete for report creation" if is_complete else f"Please complete {len(missing_fields)} required field(s)"
    
    return ProfileValidationResult(
        is_complete=is_complete,
        missing_fields=missing_fields,
        completion_percentage=completion_percentage,
        message=message
    )


@router.get("/me/profile-status", response_model=ProfileCompletionStatus)
def get_profile_completion_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile completion status for report creation"""
    profile = current_user.valuer_profile
    validation_result = validate_profile_completeness(profile)
    
    required_fields = ['qualifications', 'registration_no', 'company_name', 'contact_phones']
    
    return ProfileCompletionStatus(
        can_create_reports=validation_result.is_complete,
        profile_complete=validation_result.is_complete,
        required_fields=required_fields,
        missing_fields=validation_result.missing_fields,
        completion_percentage=validation_result.completion_percentage
    )


@router.get("/me/profile-validation", response_model=ProfileValidationResult)
def validate_profile_for_reports(
    current_user: User = Depends(get_current_active_user)
):
    """Validate if user's profile is complete enough for creating professional reports"""
    profile = current_user.valuer_profile
    return validate_profile_completeness(profile)