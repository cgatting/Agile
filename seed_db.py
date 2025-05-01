#!/usr/bin/env python
from app import app
from database import initialize_database_with_sample_data

if __name__ == '__main__':
    with app.app_context():
        # Drop existing data and seed tables with sample entries
        initialize_database_with_sample_data(app, force_reset=True)
        print("Database seeded with sample data successfully.") 