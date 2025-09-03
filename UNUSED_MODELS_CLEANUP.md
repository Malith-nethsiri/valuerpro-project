# Unused Models Cleanup Plan

## Analysis Results

Based on code analysis, the following models appear to be unused or minimally used:

### 1. `Template` Model
- **Status**: Defined but not actively used
- **Usage**: Only referenced in database migrations
- **Files**: `app/models.py` (definition only)
- **Risk**: Low - appears to be forward-looking feature

### 2. `AISuggestion` Model  
- **Status**: Defined but not actively used
- **Usage**: Only in cascade delete cleanup in reports.py
- **Files**: `app/models.py`, `app/api/api_v1/endpoints/reports.py` (delete only)
- **Risk**: Low - appears to be forward-looking feature

### 3. `Revision` Model
- **Status**: Defined but not actively used  
- **Usage**: Only in cascade delete cleanup in reports.py
- **Files**: `app/models.py`, `app/api/api_v1/endpoints/reports.py` (delete only), migration files
- **Risk**: Medium - has database presence via migrations

## Recommendations

### Option 1: Keep for Future Use (Recommended)
Since these models appear to be forward-looking features for:
- Template management system
- AI-powered suggestions
- Report revision tracking

**Recommend**: Keep the models but add clear documentation about their intended purpose.

### Option 2: Remove Unused Models
If the team decides these features won't be implemented soon:

1. **Create migration to drop tables**:
   ```python
   # Migration to remove unused tables
   def upgrade():
       op.drop_table('revisions')
       op.drop_table('ai_suggestions') 
       op.drop_table('templates')
   ```

2. **Remove model definitions** from `app/models.py`

3. **Update cascade delete** in `reports.py` to remove references

4. **Remove from Report model relationships**

### Option 3: Implement Basic Functionality
Add minimal endpoints to make these models useful:
- Basic template CRUD operations
- Simple revision tracking
- Placeholder AI suggestion system

## Recommended Actions

1. **Document model purposes** in docstrings
2. **Add TODO comments** for future implementation
3. **Keep models** for now as they don't significantly impact performance
4. **Review in 6 months** to see if features are being developed

## Implementation

```python
# Add to models.py - document the models
class Template(Base):
    """
    Template model for storing report templates.
    TODO: Implement template management system
    Status: Placeholder for future feature
    """
    # existing code...

class AISuggestion(Base):
    """
    AI Suggestion model for storing AI-powered report suggestions.
    TODO: Implement AI suggestion system
    Status: Placeholder for future feature  
    """
    # existing code...

class Revision(Base):
    """
    Revision model for tracking report changes and versions.
    TODO: Implement revision tracking system
    Status: Placeholder for future feature
    """
    # existing code...
```

This approach maintains system stability while clearly marking these as future features.