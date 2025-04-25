from flask import Flask
from database import initialize_database_with_sample_data, db, migrate
import os
from models.sql_models import User, Location, Bowser, Deployment, Maintenance, Alert

# Initialize Flask app
app = Flask(__name__)

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/aquaalert.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Password policy configuration
app.config['PASSWORD_MIN_LENGTH'] = 8
app.config['PASSWORD_REQUIRE_UPPERCASE'] = True
app.config['PASSWORD_REQUIRE_LOWERCASE'] = True
app.config['PASSWORD_REQUIRE_NUMBERS'] = True
app.config['PASSWORD_REQUIRE_SPECIAL'] = True

# Initialize extensions
db.init_app(app)
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