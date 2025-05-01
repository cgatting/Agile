from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from database import initialize_database_with_sample_data, migrate
import os
from models.sql_models import User, Location, Bowser, Deployment, Maintenance, Alert

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
migrate.init_app(app, db)

if __name__ == "__main__":
    with app.app_context():
        try:
            # Remove existing database file
            if os.path.exists('instance/aquaalert.db'):
                os.remove('instance/aquaalert.db')
                print("Removed existing database file.")
            
            # Create database directory if it doesn't exist
            os.makedirs('instance', exist_ok=True)
            
            # Create all tables
            db.create_all()
            print("Database schema created.")
            
            # Initialize with sample data
            initialize_database_with_sample_data(app, force_reset=True)
            print("Database initialization complete.")
        except Exception as e:
            print(f"Error initializing database: {str(e)}") 