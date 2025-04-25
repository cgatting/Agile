import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

class JsonHandler:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.ensure_file_exists()

    def ensure_file_exists(self):
        """Ensure the JSON file exists with initial structure."""
        if not os.path.exists(self.file_path):
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            initial_data = {
                'bowsers': [],
                'locations': [],
                'deployments': [],
                'maintenance': [],
                'invoices': [],
                'schemes': [],
                'partners': [],
                'alerts': []
            }
            with open(self.file_path, 'w') as f:
                json.dump(initial_data, f, indent=4)

    def load_data(self) -> Dict:
        """Load data from the JSON file."""
        try:
            with open(self.file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}

    def save_data(self, data: Dict):
        """Save data to the JSON file."""
        with open(self.file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def get_all(self, collection: str) -> List[Dict]:
        """Get all documents from a collection."""
        data = self.load_data()
        return data.get(collection, [])

    def get_by_id(self, collection: str, doc_id: str) -> Optional[Dict]:
        """Get a document by its ID from a collection."""
        data = self.load_data()
        for doc in data.get(collection, []):
            if str(doc.get('id')) == str(doc_id):
                return doc
        return None

    def create(self, collection: str, doc: Dict) -> Dict:
        """Create a new document in a collection."""
        data = self.load_data()
        if collection not in data:
            data[collection] = []

        # Generate a new ID if not provided
        if 'id' not in doc:
            doc['id'] = str(uuid.uuid4())

        # Add timestamps
        doc['created_at'] = datetime.utcnow().isoformat()
        doc['updated_at'] = doc['created_at']

        data[collection].append(doc)
        self.save_data(data)
        return doc

    def update(self, collection: str, doc_id: str, updates: Dict) -> Optional[Dict]:
        """Update a document in a collection."""
        data = self.load_data()
        for doc in data.get(collection, []):
            if str(doc.get('id')) == str(doc_id):
                doc.update(updates)
                doc['updated_at'] = datetime.utcnow().isoformat()
                self.save_data(data)
                return doc
        return None

    def delete(self, collection: str, doc_id: str) -> bool:
        """Delete a document from a collection."""
        data = self.load_data()
        if collection not in data:
            return False

        initial_length = len(data[collection])
        data[collection] = [doc for doc in data[collection] if str(doc.get('id')) != str(doc_id)]
        if len(data[collection]) < initial_length:
            self.save_data(data)
            return True
        return False

    def query(self, collection: str, query: Dict) -> List[Dict]:
        """Query documents in a collection."""
        data = self.load_data()
        results = []
        for doc in data.get(collection, []):
            matches = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    matches = False
                    break
            if matches:
                results.append(doc)
        return results

    def bulk_create(self, collection: str, docs: List[Dict]) -> List[Dict]:
        """Create multiple documents in a collection."""
        data = self.load_data()
        if collection not in data:
            data[collection] = []

        created_docs = []
        for doc in docs:
            # Generate a new ID if not provided
            if 'id' not in doc:
                doc['id'] = str(uuid.uuid4())

            # Add timestamps
            doc['created_at'] = datetime.utcnow().isoformat()
            doc['updated_at'] = doc['created_at']

            data[collection].append(doc)
            created_docs.append(doc)

        self.save_data(data)
        return created_docs

    def bulk_update(self, collection: str, updates: List[Dict]) -> List[Dict]:
        """Update multiple documents in a collection."""
        data = self.load_data()
        updated_docs = []
        for update in updates:
            doc_id = update.get('id')
            if not doc_id:
                continue

            for doc in data.get(collection, []):
                if str(doc.get('id')) == str(doc_id):
                    doc.update(update)
                    doc['updated_at'] = datetime.utcnow().isoformat()
                    updated_docs.append(doc)
                    break

        if updated_docs:
            self.save_data(data)
        return updated_docs

    def bulk_delete(self, collection: str, doc_ids: List[str]) -> int:
        """Delete multiple documents from a collection."""
        data = self.load_data()
        if collection not in data:
            return 0

        initial_length = len(data[collection])
        data[collection] = [doc for doc in data[collection] if str(doc.get('id')) not in doc_ids]
        deleted_count = initial_length - len(data[collection])
        if deleted_count > 0:
            self.save_data(data)
        return deleted_count 