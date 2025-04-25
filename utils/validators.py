import re
from datetime import datetime

def validate_email(email):
    """Validate email format using a simple regex pattern."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_date_range(start_date, end_date):
    """Validate that end_date is after start_date."""
    return end_date > start_date 