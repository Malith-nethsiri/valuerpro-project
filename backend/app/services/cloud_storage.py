"""
Cloud storage service for file uploads and management.
Supports AWS S3 with fallback to local storage.
"""

import os
import boto3
import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import BinaryIO, Optional, Dict, Any, List
from urllib.parse import urljoin
from uuid import uuid4

import aiofiles
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import UploadFile, HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class CloudStorageError(Exception):
    """Custom exception for cloud storage operations."""
    pass


class StorageProvider:
    """Abstract storage provider interface."""
    
    async def upload_file(
        self,
        file: BinaryIO,
        key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        raise NotImplementedError
    
    async def download_file(self, key: str) -> bytes:
        raise NotImplementedError
    
    async def delete_file(self, key: str) -> bool:
        raise NotImplementedError
    
    async def get_file_url(
        self, 
        key: str, 
        expires_in: int = 3600
    ) -> str:
        raise NotImplementedError
    
    async def list_files(
        self, 
        prefix: str = "", 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError


class S3StorageProvider(StorageProvider):
    """AWS S3 storage provider."""
    
    def __init__(self):
        self.bucket_name = settings.AWS_S3_BUCKET
        self.region = settings.AWS_REGION
        
        # Initialize S3 client
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.region
            )
            
            # Test connection
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 storage initialized for bucket: {self.bucket_name}")
            
        except (NoCredentialsError, ClientError) as e:
            logger.error(f"S3 initialization failed: {e}")
            raise CloudStorageError(f"Failed to initialize S3: {e}")
    
    async def upload_file(
        self,
        file: BinaryIO,
        key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Upload file to S3."""
        try:
            extra_args = {
                'ContentType': content_type,
                'Metadata': metadata or {},
                'ServerSideEncryption': 'AES256'
            }
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.s3_client.upload_fileobj(
                    file, self.bucket_name, key, ExtraArgs=extra_args
                )
            )
            
            # Get file info
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            
            return {
                'provider': 's3',
                'key': key,
                'bucket': self.bucket_name,
                'url': f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}",
                'size': response.get('ContentLength', 0),
                'etag': response.get('ETag', '').strip('"'),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType', content_type),
                'metadata': response.get('Metadata', {})
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"S3 upload error ({error_code}): {e}")
            raise CloudStorageError(f"S3 upload failed: {error_code}")
        except Exception as e:
            logger.error(f"Unexpected S3 upload error: {e}")
            raise CloudStorageError(f"Upload failed: {str(e)}")
    
    async def download_file(self, key: str) -> bytes:
        """Download file from S3."""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            )
            return response['Body'].read()
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise CloudStorageError(f"File not found: {key}")
            logger.error(f"S3 download error: {e}")
            raise CloudStorageError(f"Download failed: {e}")
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from S3."""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            )
            return True
            
        except ClientError as e:
            logger.error(f"S3 delete error: {e}")
            return False
    
    async def get_file_url(
        self, 
        key: str, 
        expires_in: int = 3600
    ) -> str:
        """Generate presigned URL for file access."""
        try:
            loop = asyncio.get_event_loop()
            url = await loop.run_in_executor(
                None,
                lambda: self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': key},
                    ExpiresIn=expires_in
                )
            )
            return url
            
        except ClientError as e:
            logger.error(f"S3 presigned URL error: {e}")
            raise CloudStorageError(f"URL generation failed: {e}")
    
    async def list_files(
        self, 
        prefix: str = "", 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files in S3 bucket."""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=prefix,
                    MaxKeys=limit
                )
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'etag': obj['ETag'].strip('"'),
                    'storage_class': obj.get('StorageClass', 'STANDARD')
                })
            
            return files
            
        except ClientError as e:
            logger.error(f"S3 list error: {e}")
            raise CloudStorageError(f"List operation failed: {e}")


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider."""
    
    def __init__(self):
        self.storage_path = settings.STORAGE_DIR
        self.storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage initialized at: {self.storage_path}")
    
    def _get_file_path(self, key: str) -> Path:
        """Get full file path for key."""
        # Ensure key doesn't contain path traversal
        safe_key = key.replace('..', '').replace('/', '_').replace('\\', '_')
        return self.storage_path / safe_key
    
    async def upload_file(
        self,
        file: BinaryIO,
        key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Save file to local storage."""
        try:
            file_path = self._get_file_path(key)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file content
            async with aiofiles.open(file_path, 'wb') as f:
                content = file.read()
                await f.write(content)
            
            # Get file stats
            stat = file_path.stat()
            
            return {
                'provider': 'local',
                'key': key,
                'path': str(file_path),
                'url': f"/api/v1/files/{key}",  # Local file serving endpoint
                'size': stat.st_size,
                'last_modified': datetime.fromtimestamp(stat.st_mtime),
                'content_type': content_type,
                'metadata': metadata or {}
            }
            
        except Exception as e:
            logger.error(f"Local upload error: {e}")
            raise CloudStorageError(f"Local upload failed: {str(e)}")
    
    async def download_file(self, key: str) -> bytes:
        """Read file from local storage."""
        try:
            file_path = self._get_file_path(key)
            
            if not file_path.exists():
                raise CloudStorageError(f"File not found: {key}")
            
            async with aiofiles.open(file_path, 'rb') as f:
                return await f.read()
                
        except Exception as e:
            logger.error(f"Local download error: {e}")
            raise CloudStorageError(f"Local download failed: {str(e)}")
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from local storage."""
        try:
            file_path = self._get_file_path(key)
            
            if file_path.exists():
                file_path.unlink()
                return True
            return False
            
        except Exception as e:
            logger.error(f"Local delete error: {e}")
            return False
    
    async def get_file_url(
        self, 
        key: str, 
        expires_in: int = 3600
    ) -> str:
        """Get local file URL (doesn't expire)."""
        return f"/api/v1/files/{key}"
    
    async def list_files(
        self, 
        prefix: str = "", 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files in local storage."""
        try:
            files = []
            count = 0
            
            for file_path in self.storage_path.rglob("*"):
                if count >= limit:
                    break
                
                if file_path.is_file():
                    relative_path = file_path.relative_to(self.storage_path)
                    key = str(relative_path).replace('\\', '/')
                    
                    if key.startswith(prefix):
                        stat = file_path.stat()
                        files.append({
                            'key': key,
                            'size': stat.st_size,
                            'last_modified': datetime.fromtimestamp(stat.st_mtime),
                            'path': str(file_path)
                        })
                        count += 1
            
            return files
            
        except Exception as e:
            logger.error(f"Local list error: {e}")
            raise CloudStorageError(f"List operation failed: {str(e)}")


class CloudStorageService:
    """Main cloud storage service with automatic provider selection."""
    
    def __init__(self):
        self.provider = self._initialize_provider()
    
    def _initialize_provider(self) -> StorageProvider:
        """Initialize the appropriate storage provider."""
        # Try S3 first if credentials are available
        if all([
            settings.AWS_ACCESS_KEY_ID,
            settings.AWS_SECRET_ACCESS_KEY,
            settings.AWS_S3_BUCKET,
            settings.AWS_REGION
        ]):
            try:
                return S3StorageProvider()
            except CloudStorageError as e:
                logger.warning(f"S3 initialization failed, falling back to local: {e}")
        
        # Fall back to local storage
        return LocalStorageProvider()
    
    def _generate_storage_key(
        self, 
        filename: str, 
        user_id: str, 
        prefix: str = "uploads"
    ) -> str:
        """Generate a unique storage key for a file."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        unique_id = str(uuid4())[:8]
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
        
        return f"{prefix}/{user_id}/{timestamp}/{unique_id}_{safe_filename}"
    
    async def upload_file(
        self,
        file: UploadFile,
        user_id: str,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Upload file with automatic key generation."""
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Validate file size
        if file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Validate content type
        if file.content_type not in settings.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Generate storage key
        storage_key = self._generate_storage_key(file.filename, user_id)
        
        # Add upload metadata
        upload_metadata = {
            'original_filename': file.filename,
            'uploaded_by': user_id,
            'upload_time': datetime.utcnow().isoformat(),
            **(metadata or {})
        }
        
        try:
            # Upload file
            result = await self.provider.upload_file(
                file.file,
                storage_key,
                file.content_type or "application/octet-stream",
                upload_metadata
            )
            
            # Add original filename to result
            result['original_filename'] = file.filename
            result['uploaded_by'] = user_id
            
            logger.info(f"File uploaded successfully: {storage_key}")
            return result
            
        except CloudStorageError as e:
            logger.error(f"File upload failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def download_file(self, key: str) -> bytes:
        """Download file by key."""
        try:
            return await self.provider.download_file(key)
        except CloudStorageError as e:
            raise HTTPException(status_code=404, detail=str(e))
    
    async def delete_file(self, key: str) -> bool:
        """Delete file by key."""
        return await self.provider.delete_file(key)
    
    async def get_file_url(
        self, 
        key: str, 
        expires_in: int = 3600
    ) -> str:
        """Get accessible URL for file."""
        try:
            return await self.provider.get_file_url(key, expires_in)
        except CloudStorageError as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def list_user_files(
        self, 
        user_id: str, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List files for a specific user."""
        prefix = f"uploads/{user_id}/"
        return await self.provider.list_files(prefix, limit)
    
    def is_cloud_provider(self) -> bool:
        """Check if using cloud storage provider."""
        return isinstance(self.provider, S3StorageProvider)


# Global service instance
storage_service = CloudStorageService()