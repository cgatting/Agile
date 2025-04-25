# JSON model definitions for Mutual Aid related models
import uuid
from datetime import datetime

class MutualAidScheme:
    """Mutual Aid Scheme data model for JSON storage"""
    def __init__(self, name=None, start_date=None, end_date=None, 
                 contribution_amount=None, balance=0, status='active', notes=''):
        self.id = str(uuid.uuid4())
        self.name = name
        self.start_date = start_date
        self.end_date = end_date
        self.contribution_amount = contribution_amount
        self.balance = balance
        self.status = status
        self.notes = notes
        
    def to_dict(self):
        """Convert scheme to dictionary for JSON storage"""
        return {
            'id': self.id,
            'name': self.name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'contribution_amount': self.contribution_amount,
            'balance': self.balance,
            'status': self.status,
            'notes': self.notes
        }

class MutualAidContribution:
    """Mutual Aid Contribution data model for JSON storage"""
    def __init__(self, contributor_name=None, scheme_id=None, amount=None, 
                 contribution_date=None, receipt_number=None, notes=''):
        self.id = str(uuid.uuid4())
        self.contributor_name = contributor_name
        self.scheme_id = scheme_id
        self.amount = amount
        self.contribution_date = contribution_date
        self.receipt_number = receipt_number
        self.notes = notes
        
    def to_dict(self):
        """Convert contribution to dictionary for JSON storage"""
        return {
            'id': self.id,
            'contributor_name': self.contributor_name,
            'scheme_id': self.scheme_id,
            'amount': self.amount,
            'contribution_date': self.contribution_date.isoformat() if self.contribution_date else None,
            'receipt_number': self.receipt_number,
            'notes': self.notes
        }