from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime, timedelta
import uuid
import os
from werkzeug.security import generate_password_hash
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key constraints for SQLite"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

def initialize_database(app):
    """Initialize the database with proper error handling and security features"""
    try:
        # Configure SQLAlchemy
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,
            'pool_recycle': 300,
        }

        # Initialize extensions
        db.init_app(app)
        migrate.init_app(app, db)

        # Create tables
        with app.app_context():
            try:
                db.create_all()
                logger.info("Database tables created successfully")
            except SQLAlchemyError as e:
                logger.error(f"Error creating database tables: {str(e)}")
                raise

            # Create initial admin user if not exists
            from models.sql_models import User
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                try:
                    admin = User(
                        username='admin',
                        email='admin@example.com',
                        role='admin'
                    )
                    admin.set_password(os.getenv('ADMIN_PASSWORD', 'admin123'))
                    db.session.add(admin)
                    db.session.commit()
                    logger.info("Initial admin user created successfully")
                except SQLAlchemyError as e:
                    logger.error(f"Error creating admin user: {str(e)}")
                    db.session.rollback()
                    raise

    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

def get_db():
    """Get database session with error handling"""
    try:
        return db.session
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {str(e)}")
        raise

def initialize_database_with_sample_data(app, force_reset=False):
    """Initialize the database with tables and sample data."""
    with app.app_context():
        if force_reset:
            # Drop all tables
            db.drop_all()
        
        # Create all tables
        db.create_all()
        
        # Check if we need to add sample data
        from models.sql_models import User, Bowser, Location, Maintenance, Deployment, Invoice
        
        if force_reset or User.query.count() == 0:
            try:
                # Create admin user
                admin = User(
                    username='admin_test',
                    email='admin@test.com',
                    role='admin'
                )
                admin.set_password('Admin@123')
                
                # Create staff user
                staff = User(
                    username='staff_test',
                    email='staff@test.com',
                    role='staff'
                )
                staff.set_password('Staff@123')
                
                # Create test user
                user = User(
                    username='testuser',
                    email='test@test.com',
                    role='staff'
                )
                user.set_password('User@123')
                
                db.session.add_all([admin, staff, user])
                db.session.commit()  # Commit users first
                
                # Create sample bowsers
                bowser1 = Bowser(
                    id=str(uuid.uuid4()),
                    number='BW001',
                    capacity=5000.0,
                    current_level=4500.0,
                    status='active',
                    owner='Company A',
                    last_maintenance=datetime.now() - timedelta(days=30),
                    notes='Regular maintenance up to date'
                )
                
                bowser2 = Bowser(
                    id=str(uuid.uuid4()),
                    number='BW002',
                    capacity=3000.0,
                    current_level=2800.0,
                    status='active',
                    owner='Company B',
                    last_maintenance=datetime.now() - timedelta(days=15),
                    notes='New filters installed'
                )
                
                db.session.add_all([bowser1, bowser2])
                db.session.commit()  # Commit bowsers first
                
                # Create sample locations
                location1 = Location(
                    id=str(uuid.uuid4()),
                    name='Central Hospital',
                    address='123 Main St',
                    latitude=51.5074,
                    longitude=-0.1278,
                    type='hospital',
                    status='active'
                )
                
                location2 = Location(
                    id=str(uuid.uuid4()),
                    name='North Community Center',
                    address='456 Park Ave',
                    latitude=51.5204,
                    longitude=-0.1298,
                    type='community',
                    status='active'
                )
                
                db.session.add_all([location1, location2])
                db.session.commit()  # Commit locations before creating deployments
                
                # Create sample maintenance records
                maintenance1 = Maintenance(
                    id=str(uuid.uuid4()),
                    bowser_id=bowser1.id,
                    maintenance_type='routine',
                    description='Regular maintenance check',
                    date=datetime.now() - timedelta(days=30),
                    status='completed'
                )
                
                maintenance2 = Maintenance(
                    id=str(uuid.uuid4()),
                    bowser_id=bowser2.id,
                    maintenance_type='repair',
                    description='Filter replacement',
                    date=datetime.now() - timedelta(days=15),
                    status='completed'
                )
                
                db.session.add_all([maintenance1, maintenance2])
                db.session.commit()  # Commit maintenance records
                
                # Create sample deployments
                deployment1 = Deployment(
                    id=str(uuid.uuid4()),
                    bowser_id=bowser1.id,
                    location_id=location1.id,
                    start_date=datetime.now() - timedelta(days=10),
                    end_date=datetime.now() + timedelta(days=20),
                    status='active',
                    priority='high',
                    notes='Emergency deployment'
                )
                
                deployment2 = Deployment(
                    id=str(uuid.uuid4()),
                    bowser_id=bowser2.id,
                    location_id=location2.id,
                    start_date=datetime.now() + timedelta(days=5),
                    end_date=datetime.now() + timedelta(days=35),
                    status='scheduled',
                    priority='medium',
                    notes='Regular deployment'
                )
                
                db.session.add_all([deployment1, deployment2])
                db.session.commit()  # Commit deployments
                
                # Create sample invoices
                invoice1 = Invoice(
                    id=str(uuid.uuid4()),
                    invoice_number='INV-20240301-1001',
                    client_name='Central Hospital',
                    issue_date=datetime.now() - timedelta(days=5),
                    due_date=datetime.now() + timedelta(days=25),
                    amount=1500.00,
                    status='pending',
                    notes='Emergency deployment charges'
                )
                
                invoice2 = Invoice(
                    id=str(uuid.uuid4()),
                    invoice_number='INV-20240301-1002',
                    client_name='North Community Center',
                    issue_date=datetime.now() - timedelta(days=3),
                    due_date=datetime.now() + timedelta(days=27),
                    amount=1200.00,
                    status='pending',
                    notes='Regular deployment charges'
                )
                
                db.session.add_all([invoice1, invoice2])
                db.session.commit()  # Commit invoices
                
                logger.info("Database initialized with sample data successfully")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database initialization failed: {str(e)}")
                raise
        else:
            logger.info("Database already contains data. Sample data not added.") 