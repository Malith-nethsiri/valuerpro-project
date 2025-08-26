"""
Appendix Generator Service

Generates professional appendices for valuation reports including:
- Static location maps
- Property photos organization
- Document references
- Comparable sales data (when available)
"""

import os
import requests
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import uuid

from sqlalchemy.orm import Session
from app.models import Report, Property, Location, Appendix, File as FileModel
from app.services.google_maps import generate_static_map_url, is_google_maps_available
from app.core.config import settings


class AppendixGenerator:
    """Service for generating professional report appendices"""
    
    def __init__(self, db: Session):
        self.db = db
        self.storage_base = Path("storage")
        self.appendix_storage = self.storage_base / "appendices"
        self.ensure_storage_dirs()
    
    def ensure_storage_dirs(self):
        """Ensure storage directories exist"""
        self.appendix_storage.mkdir(parents=True, exist_ok=True)
    
    def generate_all_appendices(self, report_id: str) -> Dict[str, str]:
        """
        Generate all appendices for a report
        
        Args:
            report_id: The report ID
            
        Returns:
            Dictionary with appendix types and their file paths
        """
        appendices = {}
        
        # Generate location map (Appendix A)
        location_map_path = self.generate_location_map(report_id)
        if location_map_path:
            appendices['location_map'] = location_map_path
        
        # Organize survey plans (Appendix B)
        survey_plan_files = self.get_survey_plan_files(report_id)
        if survey_plan_files:
            appendices['survey_plans'] = survey_plan_files
        
        # Organize photographs (Appendix C)
        photo_files = self.get_photograph_files(report_id)
        if photo_files:
            appendices['photographs'] = photo_files
        
        # Generate comparable sales summary (Appendix D) - if data available
        comparables_path = self.generate_comparables_summary(report_id)
        if comparables_path:
            appendices['comparables'] = comparables_path
        
        return appendices
    
    def generate_location_map(self, report_id: str) -> Optional[str]:
        """
        Generate static location map for Appendix A
        
        Args:
            report_id: The report ID
            
        Returns:
            Path to generated map image or None if failed
        """
        # Get report properties with location data
        properties = self.db.query(Property).filter(Property.report_id == report_id).all()
        
        if not properties:
            return None
        
        # Use first property for main map (can be enhanced for multi-property)
        property_obj = properties[0]
        location = self.db.query(Location).filter(Location.property_id == property_obj.id).first()
        
        if not location or not location.lat or not location.lng:
            return None
        
        if not is_google_maps_available():
            return None
        
        try:
            # Generate multiple map views for comprehensive appendix
            maps_generated = []
            
            # 1. Street map view
            street_map_url = generate_static_map_url(
                latitude=location.lat,
                longitude=location.lng,
                zoom=16,
                width=800,
                height=600,
                map_type="roadmap"
            )
            
            street_map_path = self._download_and_save_map(
                street_map_url, 
                report_id, 
                "street_map"
            )
            if street_map_path:
                maps_generated.append(street_map_path)
            
            # 2. Satellite view
            satellite_map_url = generate_static_map_url(
                latitude=location.lat,
                longitude=location.lng,
                zoom=18,
                width=800,
                height=600,
                map_type="satellite"
            )
            
            satellite_map_path = self._download_and_save_map(
                satellite_map_url, 
                report_id, 
                "satellite_map"
            )
            if satellite_map_path:
                maps_generated.append(satellite_map_path)
            
            # 3. Wider area context map
            context_map_url = generate_static_map_url(
                latitude=location.lat,
                longitude=location.lng,
                zoom=12,
                width=800,
                height=600,
                map_type="roadmap"
            )
            
            context_map_path = self._download_and_save_map(
                context_map_url, 
                report_id, 
                "context_map"
            )
            if context_map_path:
                maps_generated.append(context_map_path)
            
            # Create composite map layout
            if maps_generated:
                composite_path = self._create_composite_map_layout(
                    maps_generated, 
                    report_id,
                    location
                )
                return composite_path
            
            return None
            
        except Exception as e:
            print(f"Error generating location map: {str(e)}")
            return None
    
    def _download_and_save_map(
        self, 
        map_url: str, 
        report_id: str, 
        map_type: str
    ) -> Optional[str]:
        """Download and save a map image"""
        try:
            response = requests.get(map_url, timeout=30)
            response.raise_for_status()
            
            # Generate unique filename
            filename = f"{report_id}_{map_type}_{uuid.uuid4().hex[:8]}.png"
            file_path = self.appendix_storage / filename
            
            # Save image
            with open(file_path, 'wb') as f:
                f.write(response.content)
            
            return str(file_path)
            
        except Exception as e:
            print(f"Error downloading map {map_type}: {str(e)}")
            return None
    
    def _create_composite_map_layout(
        self, 
        map_paths: List[str], 
        report_id: str,
        location: Location
    ) -> str:
        """
        Create a professional composite map layout for the appendix
        
        Args:
            map_paths: List of individual map file paths
            report_id: Report ID
            location: Location object for details
            
        Returns:
            Path to composite map image
        """
        try:
            # Load images
            images = []
            for path in map_paths:
                if os.path.exists(path):
                    img = Image.open(path)
                    images.append(img)
            
            if not images:
                return None
            
            # Create composite layout (2x2 or 1x3 depending on available maps)
            if len(images) >= 3:
                # 2x2 layout with title
                composite_width = 1600
                composite_height = 1400
                composite = Image.new('RGB', (composite_width, composite_height), 'white')
                
                # Add title
                draw = ImageDraw.Draw(composite)
                try:
                    # Try to load a decent font, fallback to default if not available
                    font_title = ImageFont.truetype("arial.ttf", 24)
                    font_subtitle = ImageFont.truetype("arial.ttf", 16)
                except:
                    font_title = ImageFont.load_default()
                    font_subtitle = ImageFont.load_default()
                
                title = "APPENDIX A - LOCATION MAPS"
                subtitle = f"Property Location: {location.address_full or 'Property Address'}"
                
                # Center title
                title_bbox = draw.textbbox((0, 0), title, font=font_title)
                title_width = title_bbox[2] - title_bbox[0]
                title_x = (composite_width - title_width) // 2
                
                draw.text((title_x, 20), title, font=font_title, fill='black')
                
                # Center subtitle
                subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
                subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
                subtitle_x = (composite_width - subtitle_width) // 2
                
                draw.text((subtitle_x, 55), subtitle, font=font_subtitle, fill='gray')
                
                # Position maps
                map_positions = [
                    (50, 100),   # Top left
                    (850, 100),  # Top right
                    (450, 750),  # Bottom center
                ]
                
                labels = ["Street Map", "Satellite View", "Area Context"]
                
                for i, (img, pos, label) in enumerate(zip(images[:3], map_positions, labels)):
                    # Resize image to fit layout
                    img_resized = img.resize((700, 600), Image.Resampling.LANCZOS)
                    composite.paste(img_resized, pos)
                    
                    # Add label
                    label_x = pos[0] + 350 - (len(label) * 6)  # Rough centering
                    draw.text((label_x, pos[1] + 610), label, font=font_subtitle, fill='black')
            
            else:
                # Simple vertical layout for fewer images
                composite_width = 800
                composite_height = len(images) * 650 + 100
                composite = Image.new('RGB', (composite_width, composite_height), 'white')
                
                y_pos = 50
                for img in images:
                    img_resized = img.resize((700, 600), Image.Resampling.LANCZOS)
                    composite.paste(img_resized, (50, y_pos))
                    y_pos += 650
            
            # Save composite image
            composite_filename = f"{report_id}_location_maps_composite.png"
            composite_path = self.appendix_storage / composite_filename
            composite.save(composite_path, 'PNG', quality=95)
            
            return str(composite_path)
            
        except Exception as e:
            print(f"Error creating composite map layout: {str(e)}")
            # Return first available map as fallback
            return map_paths[0] if map_paths else None
    
    def get_survey_plan_files(self, report_id: str) -> List[Dict[str, str]]:
        """
        Get organized survey plan files for Appendix B
        
        Args:
            report_id: The report ID
            
        Returns:
            List of survey plan file information
        """
        files = self.db.query(FileModel).filter(
            FileModel.report_id == report_id,
            FileModel.kind == 'survey_plan'
        ).all()
        
        survey_files = []
        for file in files:
            survey_files.append({
                'filename': file.original_filename,
                'path': file.file_path,
                'caption': f"Survey Plan - {file.original_filename}",
                'type': 'survey_plan'
            })
        
        return survey_files
    
    def get_photograph_files(self, report_id: str) -> List[Dict[str, str]]:
        """
        Get organized photograph files for Appendix C
        
        Args:
            report_id: The report ID
            
        Returns:
            List of photograph file information with captions
        """
        files = self.db.query(FileModel).filter(
            FileModel.report_id == report_id,
            FileModel.kind == 'photo'
        ).all()
        
        photo_files = []
        for i, file in enumerate(files):
            # Generate professional captions
            caption = f"Figure C.{i+1} - Property View"
            if 'front' in file.original_filename.lower():
                caption = f"Figure C.{i+1} - Front View of Property"
            elif 'rear' in file.original_filename.lower() or 'back' in file.original_filename.lower():
                caption = f"Figure C.{i+1} - Rear View of Property"
            elif 'side' in file.original_filename.lower():
                caption = f"Figure C.{i+1} - Side View of Property"
            elif 'interior' in file.original_filename.lower() or 'inside' in file.original_filename.lower():
                caption = f"Figure C.{i+1} - Interior View"
            elif 'street' in file.original_filename.lower() or 'road' in file.original_filename.lower():
                caption = f"Figure C.{i+1} - Street View"
            
            photo_files.append({
                'filename': file.original_filename,
                'path': file.file_path,
                'caption': caption,
                'type': 'photo',
                'figure_number': f"C.{i+1}"
            })
        
        return photo_files
    
    def generate_comparables_summary(self, report_id: str) -> Optional[str]:
        """
        Generate comparable sales summary for Appendix D
        
        Args:
            report_id: The report ID
            
        Returns:
            Path to generated comparables summary or None
        """
        # This would generate a summary of comparable sales if data is available
        # For now, this is a placeholder that could be extended with actual
        # comparable sales data from the database
        
        return None  # No comparables data implementation yet
    
    def save_appendix_references(self, report_id: str, appendices: Dict[str, str]):
        """
        Save appendix file references to the database
        
        Args:
            report_id: The report ID
            appendices: Dictionary of appendix types and file paths
        """
        # Clear existing appendices for this report
        self.db.query(Appendix).filter(Appendix.report_id == report_id).delete()
        
        sort_order = 1
        for appendix_type, file_path in appendices.items():
            if isinstance(file_path, list):
                # Handle multiple files (like photos)
                for i, file_info in enumerate(file_path):
                    if isinstance(file_info, dict) and 'path' in file_info:
                        appendix = Appendix(
                            report_id=report_id,
                            type=appendix_type,
                            file_id=None,  # These are generated files, not uploaded files
                            caption=file_info.get('caption', f'{appendix_type.title()} {i+1}'),
                            sort_order=sort_order + i
                        )
                        self.db.add(appendix)
                sort_order += len(file_path)
            else:
                # Single file
                appendix_type_display = {
                    'location_map': 'Location Map',
                    'survey_plans': 'Survey Plans',
                    'photographs': 'Photographs',
                    'comparables': 'Comparable Sales'
                }.get(appendix_type, appendix_type.title())
                
                appendix = Appendix(
                    report_id=report_id,
                    type=appendix_type,
                    file_id=None,
                    caption=f"Appendix {chr(64 + sort_order)} - {appendix_type_display}",
                    sort_order=sort_order
                )
                self.db.add(appendix)
                sort_order += 1
        
        self.db.commit()


# Factory function
def create_appendix_generator(db: Session) -> AppendixGenerator:
    """Factory function to create appendix generator with database session"""
    return AppendixGenerator(db)