import json
import os
from datetime import datetime
import uuid
from typing import Optional

class JSONDataHandler:
    def __init__(self, json_file_path):
        """Initialize JSON data handler with file path."""
        self.json_file_path = json_file_path
        self.data = {}
        self._ensure_data_dir()
        self._load_data()

    def _ensure_data_dir(self):
        """Ensure the data directory exists."""
        data_dir = os.path.dirname(self.json_file_path)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)

    def _load_data(self):
        """Load data from JSON file or create empty data structure."""
        try:
            if os.path.exists(self.json_file_path):
                with open(self.json_file_path, 'r') as f:
                    self.data = json.load(f)
            else:
                self.data = {}
                self.save_data()
        except Exception as e:
            print(f"Error loading JSON data: {e}")
            self.data = {}

    def save_data(self):
        """Save data to JSON file"""
        try:
            with open(self.json_file_path, 'w') as f:
                json.dump(self.data, f, indent=4)
        except Exception as e:
            print(f"Error saving JSON data: {e}")

    def get_collection(self, collection_name):
        """Get a collection by name."""
        if collection_name not in self.data:
            self.data[collection_name] = []
        return self.data[collection_name]

    def create(self, collection_name, document):
        """Create a new document in a collection."""
        if 'id' not in document:
            document['id'] = str(uuid.uuid4())
        collection = self.get_collection(collection_name)
        collection.append(document)
        self.save_data()
        return document

    def get_by_id(self, collection_name, doc_id):
        """Get a document by ID from a collection."""
        collection = self.get_collection(collection_name)
        for doc in collection:
            if doc.get('id') == doc_id:
                return doc
        return None

    def get_all(self, model_name):
        """Get all records for a model"""
        return self.data.get(model_name, [])

    def update(self, model_name, id, updates):
        """Update a record"""
        items = self.data.get(model_name, [])
        for i, item in enumerate(items):
            if item['id'] == id:
                items[i] = {**item, **updates}
                self.save_data()
                return items[i]
        return None

    def delete(self, model_name, id):
        """Delete a record"""
        items = self.data.get(model_name, [])
        self.data[model_name] = [item for item in items if item['id'] != id]
        self.save_data()
        return True

    def query(self, model_name, filters=None):
        """Query records with filters"""
        items = self.data.get(model_name, [])
        if not filters:
            return items

        results = []
        for item in items:
            matches = True
            for key, value in filters.items():
                if key not in item or item[key] != value:
                    matches = False
                    break
            if matches:
                results.append(item)
        return results

class Bowser:
    id: str
    number: str
    capacity: float
    current_level: float
    status: str
    owner: str
    last_maintenance: str
    notes: str

class Location:
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    type: str

class Maintenance:
    id: str
    bowser_id: str
    scheduled_date: str
    type: str
    description: str
    status: str
    assigned_to: str

class Deployment:
    id: str
    bowser_id: str
    location_id: str
    start_date: str
    end_date: str
    status: str
    priority: str
    notes: str

class Invoice:
    """Invoice data model for JSON storage"""
    def __init__(self, invoice_number: Optional[str] = None, 
                 client_name: Optional[str] = None, 
                 issue_date: Optional[datetime] = None, 
                 due_date: Optional[datetime] = None, 
                 amount: Optional[float] = None, 
                 status: str = 'pending', 
                 notes: str = '', 
                 deployment_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.invoice_number = invoice_number
        self.client_name = client_name
        self.issue_date = issue_date
        self.due_date = due_date
        self.amount = amount
        self.status = status
        self.notes = notes
        self.deployment_id = deployment_id
        
    def to_dict(self):
        """Convert invoice to dictionary for JSON storage"""
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'client_name': self.client_name,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'amount': self.amount,
            'status': self.status,
            'notes': self.notes,
            'deployment_id': self.deployment_id
        }

# Initialize the JSON data handler
json_handler = JSONDataHandler('data/db.json')