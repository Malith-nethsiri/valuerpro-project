"""
Expert-level configuration management for optimal system performance
Dynamic configuration based on usage patterns and system capabilities
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class AIExtractionConfig:
    """AI extraction configuration parameters"""
    model: str = "gpt-4o"
    max_tokens: int = 4000
    temperature: float = 0.1
    cache_duration_minutes: int = 120
    retry_attempts: int = 3
    timeout_seconds: int = 300
    
    # Performance tuning
    batch_size: int = 5
    concurrent_extractions: int = 3
    enable_caching: bool = True
    enable_validation: bool = True
    
    # Quality settings
    validation_level: str = "moderate"  # strict, moderate, lenient
    auto_correct_common_mistakes: bool = True
    enable_context_enhancement: bool = True

@dataclass
class PerformanceConfig:
    """Performance optimization configuration"""
    memory_threshold_mb: int = 500
    cache_cleanup_interval_minutes: int = 60
    max_cache_entries: int = 1000
    enable_async_processing: bool = True
    
    # Monitoring thresholds
    slow_operation_threshold_seconds: float = 5.0
    high_error_rate_threshold_percent: float = 10.0
    
    # Auto-optimization
    auto_tune_performance: bool = True
    adaptive_timeout: bool = True

@dataclass
class ValidationConfig:
    """Data validation configuration"""
    enable_strict_validation: bool = False
    auto_correct_formatting: bool = True
    validate_coordinates: bool = True
    validate_dates: bool = True
    validate_numeric_ranges: bool = True
    
    # Sri Lankan specific validations
    validate_administrative_divisions: bool = True
    validate_postal_codes: bool = True
    validate_extent_formats: bool = True

@dataclass
class LoggingConfig:
    """Logging and monitoring configuration"""
    log_level: str = "INFO"
    enable_performance_logging: bool = True
    enable_json_logs: bool = True
    log_ai_requests: bool = True
    log_validation_results: bool = True
    
    # Analytics
    enable_usage_analytics: bool = True
    track_user_workflows: bool = True
    performance_metrics_retention_days: int = 30

class ExpertConfigManager:
    """Dynamic configuration manager with auto-optimization"""
    
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
        
        self._configs = {
            'ai_extraction': AIExtractionConfig(),
            'performance': PerformanceConfig(),
            'validation': ValidationConfig(),
            'logging': LoggingConfig()
        }
        
        self._load_configs()
        self._setup_auto_optimization()
    
    def _load_configs(self):
        """Load configuration from files"""
        for config_name in self._configs.keys():
            config_file = self.config_dir / f"{config_name}.json"
            if config_file.exists():
                try:
                    with open(config_file, 'r') as f:
                        config_data = json.load(f)
                    
                    # Update config with loaded values
                    config_class = type(self._configs[config_name])
                    self._configs[config_name] = config_class(**config_data)
                    
                    logger.info(f"Loaded {config_name} configuration from file")
                    
                except Exception as e:
                    logger.error(f"Failed to load {config_name} config: {str(e)}")
            else:
                # Save default config
                self._save_config(config_name)
    
    def _save_config(self, config_name: str):
        """Save configuration to file"""
        try:
            config_file = self.config_dir / f"{config_name}.json"
            config_data = asdict(self._configs[config_name])
            
            with open(config_file, 'w') as f:
                json.dump(config_data, f, indent=2, default=str)
                
            logger.debug(f"Saved {config_name} configuration")
            
        except Exception as e:
            logger.error(f"Failed to save {config_name} config: {str(e)}")
    
    def get_ai_extraction_config(self) -> AIExtractionConfig:
        """Get AI extraction configuration"""
        return self._configs['ai_extraction']
    
    def get_performance_config(self) -> PerformanceConfig:
        """Get performance configuration"""
        return self._configs['performance']
    
    def get_validation_config(self) -> ValidationConfig:
        """Get validation configuration"""
        return self._configs['validation']
    
    def get_logging_config(self) -> LoggingConfig:
        """Get logging configuration"""
        return self._configs['logging']
    
    def update_config(self, config_type: str, **kwargs):
        """Update configuration parameters"""
        if config_type not in self._configs:
            raise ValueError(f"Unknown config type: {config_type}")
        
        config = self._configs[config_type]
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
                logger.info(f"Updated {config_type}.{key} = {value}")
            else:
                logger.warning(f"Unknown config parameter: {config_type}.{key}")
        
        self._save_config(config_type)
    
    def _setup_auto_optimization(self):
        """Setup automatic performance optimization"""
        try:
            from app.utils.advanced_logger import expert_logger
            
            # Monitor system performance and adjust configs
            performance_stats = expert_logger.get_performance_summary()
            
            if performance_stats:
                self._optimize_based_on_performance(performance_stats)
                
        except ImportError:
            logger.debug("Advanced logging not available, skipping auto-optimization")
    
    def _optimize_based_on_performance(self, stats: Dict[str, Any]):
        """Automatically optimize configuration based on performance data"""
        ai_config = self.get_ai_extraction_config()
        perf_config = self.get_performance_config()
        
        # Optimize based on extraction performance
        if 'extraction_performance' in stats:
            for doc_type, metrics in stats['extraction_performance'].items():
                avg_time = metrics.get('average_time_seconds', 0)
                
                # If extractions are slow, reduce batch size and increase timeout
                if avg_time > perf_config.slow_operation_threshold_seconds:
                    if ai_config.batch_size > 1:
                        self.update_config('ai_extraction', batch_size=max(1, ai_config.batch_size - 1))
                    
                    if ai_config.timeout_seconds < 600:
                        self.update_config('ai_extraction', timeout_seconds=ai_config.timeout_seconds + 60)
                
                # If extractions are fast, we can increase batch size
                elif avg_time < 2.0 and ai_config.batch_size < 10:
                    self.update_config('ai_extraction', batch_size=ai_config.batch_size + 1)
        
        # Optimize based on error rates
        if 'error_rates' in stats:
            high_error_rate = False
            for doc_type, error_info in stats['error_rates'].items():
                if error_info.get('error_rate_percentage', 0) > perf_config.high_error_rate_threshold_percent:
                    high_error_rate = True
                    break
            
            if high_error_rate:
                # Enable stricter validation and more retries
                self.update_config('ai_extraction', retry_attempts=min(5, ai_config.retry_attempts + 1))
                self.update_config('validation', enable_strict_validation=True)
    
    def get_optimized_prompt_config(self, document_type: str) -> Dict[str, Any]:
        """Get optimized prompt configuration for specific document type"""
        ai_config = self.get_ai_extraction_config()
        
        # Base configuration
        config = {
            'model': ai_config.model,
            'max_tokens': ai_config.max_tokens,
            'temperature': ai_config.temperature,
            'timeout': ai_config.timeout_seconds
        }
        
        # Document-specific optimizations
        if document_type == 'survey_plan':
            config.update({
                'temperature': 0.05,  # Lower for more precise extraction
                'max_tokens': 4500,   # Higher for complex survey data
            })
        elif document_type == 'deed':
            config.update({
                'temperature': 0.1,
                'max_tokens': 3500,
            })
        elif document_type == 'valuation_report':
            config.update({
                'temperature': 0.15,
                'max_tokens': 4000,
            })
        
        return config
    
    def export_config(self) -> Dict[str, Any]:
        """Export all configurations"""
        return {
            config_name: asdict(config) 
            for config_name, config in self._configs.items()
        }
    
    def import_config(self, config_data: Dict[str, Any]):
        """Import configuration from data"""
        for config_name, data in config_data.items():
            if config_name in self._configs:
                config_class = type(self._configs[config_name])
                self._configs[config_name] = config_class(**data)
                self._save_config(config_name)
                logger.info(f"Imported {config_name} configuration")
    
    def reset_to_defaults(self, config_type: Optional[str] = None):
        """Reset configuration to defaults"""
        if config_type:
            if config_type in self._configs:
                config_classes = {
                    'ai_extraction': AIExtractionConfig,
                    'performance': PerformanceConfig,
                    'validation': ValidationConfig,
                    'logging': LoggingConfig
                }
                self._configs[config_type] = config_classes[config_type]()
                self._save_config(config_type)
                logger.info(f"Reset {config_type} configuration to defaults")
        else:
            # Reset all configurations
            self._configs = {
                'ai_extraction': AIExtractionConfig(),
                'performance': PerformanceConfig(),
                'validation': ValidationConfig(),
                'logging': LoggingConfig()
            }
            for config_name in self._configs.keys():
                self._save_config(config_name)
            logger.info("Reset all configurations to defaults")

# Global configuration manager instance
config_manager = ExpertConfigManager()

# Convenience functions for easy access
def get_ai_config() -> AIExtractionConfig:
    """Get AI extraction configuration"""
    return config_manager.get_ai_extraction_config()

def get_performance_config() -> PerformanceConfig:
    """Get performance configuration"""
    return config_manager.get_performance_config()

def get_validation_config() -> ValidationConfig:
    """Get validation configuration"""
    return config_manager.get_validation_config()

def get_logging_config() -> LoggingConfig:
    """Get logging configuration"""
    return config_manager.get_logging_config()

def optimize_for_document_type(document_type: str) -> Dict[str, Any]:
    """Get optimized configuration for specific document type"""
    return config_manager.get_optimized_prompt_config(document_type)