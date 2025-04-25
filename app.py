import uuid
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from urllib.parse import urlparse
from functools import wraps
from datetime import datetime, timedelta
from random import randint
import os
from dotenv import load_dotenv
from utils.json_handler import JsonHandler
from routes.api_routes import api_blueprint
from models.sql_models import User, Bowser, Location, Maintenance, Deployment, Invoice, Partner
from database import initialize_database_with_sample_data
from routes.protected_routes import protected_blueprint
from config import Config
from flask_wtf.csrf import CSRFProtect

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize CSRF protection
csrf = CSRFProtect(app)

# Initialize JSON handler
json_handler = JsonHandler('data/test_db.json' if app.config['TESTING'] else 'data/db.json')

# Database configuration
if app.config['TESTING']:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
else:
    # Use instance folder for database
    instance_path = os.path.join(app.instance_path, 'aquaalert.db')
    os.makedirs(app.instance_path, exist_ok=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{instance_path}'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = "Please log in to access this page."
login_manager.login_message_category = 'info'

load_dotenv()  # Load environment variables from .env file

# Register blueprints
app.register_blueprint(api_blueprint, url_prefix='/api')
app.register_blueprint(protected_blueprint, url_prefix='/protected')

# Initialize database with sample data
with app.app_context():
    try:
        # Create all tables
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {str(e)}")
        raise

# Flask-Login User Loader Callback
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Access Control Decorators ---

def admin_required(f):
    """Decorator to restrict access to admin users only."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            flash('Please log in to access this page.', 'info')
            return redirect(url_for('login', next=request.url))
        elif current_user.role != 'admin':
            if request.is_json:
                return jsonify({'error': 'Administrator access required'}), 403
            flash('Administrator access required. You do not have sufficient permissions.', 'danger')
            return redirect(url_for('public_map'))
        return f(*args, **kwargs)
    return decorated_function

def staff_required(f):
    """Decorator to restrict access to staff and admin users."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            flash('Please log in to access this page.', 'info')
            return redirect(url_for('login', next=request.url))
        elif current_user.role not in ['staff', 'admin']:
            if request.is_json:
                return jsonify({'error': 'Staff access required'}), 403
            flash('Staff access required. You do not have sufficient permissions.', 'danger')
            return redirect(url_for('public_map'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

# --- Authentication Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return jsonify({
            'status': 'success',
            'success': True,
            'message': 'Already logged in',
            'redirect': url_for('dashboard')
        }), 200
        
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
        else:
            username = request.form.get('username')
            password = request.form.get('password')
            
        if not username or not password:
            if request.is_json:
                return jsonify({
                    'status': 'error',
                    'success': False,
                    'message': 'Missing username or password'
                }), 200
            flash('Missing username or password', 'error')
            return render_template('auth/login.html'), 200
            
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session.clear()
            login_user(user)
            session.permanent = True
            session.modified = True
            
            if request.is_json:
                return jsonify({
                    'status': 'success',
                    'success': True,
                    'message': 'Login successful',
                    'redirect': url_for('dashboard'),
                    'user': user.to_dict()
                }), 200
            return redirect(url_for('dashboard'))
            
        if request.is_json:
            return jsonify({
                'status': 'error',
                'success': False,
                'message': 'Invalid username or password'
            }), 200
        flash('Invalid username or password', 'error')
        return render_template('auth/login.html'), 200
        
    return render_template('auth/login.html')

@app.route('/logout')
@login_required
def logout():
    session.clear()
    logout_user()
    flash('You have been logged out', 'success')
    return redirect(url_for('login'))

@app.before_request
def before_request():
    """Ensure user session is valid and update last seen."""
    if current_user.is_authenticated:
        session.permanent = True
        session.modified = True
        app.permanent_session_lifetime = timedelta(days=31)
        
        # Ensure session has all required data
        if 'user_id' not in session or session['user_id'] != current_user.id:
            session['user_id'] = current_user.id
            session['username'] = current_user.username
            session['role'] = current_user.role
            session['_fresh'] = True

@app.after_request
def add_header(response):
    """Add headers to prevent caching."""
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    return response

# Root route to direct users based on authentication status
@app.route('/')
def index():
    return redirect(url_for('public_map'))
    
# Separate route for authorized dashboards
@app.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
        
    # Get all bowsers and their current status
    bowsers = Bowser.query.all()
    bowser_status = {}
    for bowser in bowsers:
        bowser_status[bowser.id] = {
            'number': bowser.number,
            'capacity': bowser.capacity,
            'status': bowser.status,
            'current_location': None
        }
        # Get current deployment if any
        current_deployment = Deployment.query.filter_by(
            bowser_id=bowser.id,
            status='active'
        ).first()
        if current_deployment:
            location = Location.query.get(current_deployment.location_id)
            if location:
                bowser_status[bowser.id]['current_location'] = location.name
                
    return render_template('dashboard.html', bowser_status=bowser_status)

# --- Public Routes (No Decorators) ---
@app.route('/public_map')
def public_map():
    """Public view of bowser locations and status"""
    bowsers = Bowser.query.all()
    locations = Location.query.all()
    return render_template('public.html', bowsers=bowsers, locations=locations)

# --- Staff Routes ---
@app.route('/management')
@staff_required
def management():
    """Management dashboard for staff and admin users."""
    bowsers = Bowser.query.all()
    locations = Location.query.all()
    deployments = Deployment.query.all()
    maintenance_records = Maintenance.query.all()
    
    return render_template('management.html',
                         bowsers=bowsers,
                         locations=locations,
                         deployments=deployments,
                         maintenance_records=maintenance_records)

@app.route('/maintenance')
@staff_required
def maintenance():
    """Maintenance management page."""
    bowsers = Bowser.query.all()
    maintenance_records = Maintenance.query.order_by(Maintenance.date.desc()).all()
    
    return render_template('maintenance.html',
                         bowsers=bowsers,
                         maintenance_records=maintenance_records)

@app.route('/locations/manage')
@staff_required
def manage_locations():
    """Location management page."""
    locations = Location.query.all()
    return render_template('locations.html', locations=locations)

@app.route('/deployments/manage')
@staff_required
def manage_deployments():
    """Deployment management page."""
    bowsers = Bowser.query.all()
    locations = Location.query.all()
    deployments = Deployment.query.order_by(Deployment.start_date.desc()).all()
    
    return render_template('deployments.html',
                         bowsers=bowsers,
                         locations=locations,
                         deployments=deployments)

# --- Admin Routes ---
@app.route('/admin/users')
@admin_required
def admin_users():
    """User management page for admins."""
    users = User.query.all()
    return render_template('admin/users.html', users=users)

@app.route('/finance')
@admin_required
def finance():
    """Finance management page."""
    invoices = Invoice.query.order_by(Invoice.issue_date.desc()).all()
    return render_template('finance/index.html', invoices=invoices)

@app.route('/finance/invoices')
@admin_required
def manage_invoices():
    """Invoice management page."""
    invoices = Invoice.query.order_by(Invoice.issue_date.desc()).all()
    return render_template('finance/invoices.html', invoices=invoices)

@app.route('/finance/invoices/create', methods=['GET', 'POST'])
@admin_required
def create_invoice():
    if request.method == 'POST':
        invoice_number = request.form.get('invoice_number')
        client_name = request.form.get('client_name')
        issue_date = datetime.strptime(request.form.get('issue_date'), '%Y-%m-%d')
        due_date = datetime.strptime(request.form.get('due_date'), '%Y-%m-%d')
        amount = float(request.form.get('amount'))
        status = request.form.get('status')
        notes = request.form.get('notes')

        new_invoice = Invoice(
            id=str(uuid.uuid4()),  # Generate a UUID for the invoice ID
            invoice_number=invoice_number,
            client_name=client_name,
            issue_date=issue_date,
            due_date=due_date,
            amount=amount,
            status=status,
            notes=notes
        )

        try:
            db.session.add(new_invoice)
            db.session.commit()
            flash('Invoice created successfully!', 'success')
            return redirect(url_for('manage_invoices'))
        except Exception as e:
            db.session.rollback()
            flash('Error creating invoice: ' + str(e), 'error')
            return redirect(url_for('create_invoice'))

    return render_template('create_invoice.html')

@app.route('/finance/schemes')
@admin_required
def manage_schemes():
    """Mutual Aid Scheme management interface"""
    schemes = json_handler.get_all('mutual_aid_schemes')
    # Sort schemes by start_date in descending order
    schemes.sort(key=lambda x: x.get('start_date', ''), reverse=True)
    return render_template('manage_schemes.html', schemes=schemes)

@app.route('/finance/schemes/create', methods=['GET', 'POST'])
@admin_required
def create_scheme():
    """Create new mutual aid scheme"""
    if request.method == 'POST':
        # Create new scheme from form data using JSON model
        from models.mutual_aid_models import MutualAidScheme
        
        # Parse dates from form
        start_date = datetime.strptime(request.form['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(request.form['end_date'], '%Y-%m-%d').date() if request.form.get('end_date') else None
        
        # Create scheme object
        new_scheme = MutualAidScheme(
            name=request.form['name'],
            start_date=start_date,
            end_date=end_date,
            contribution_amount=float(request.form['contribution_amount']),
            balance=float(request.form.get('initial_balance', 0)),
            status=request.form.get('status', 'active'),
            notes=request.form.get('notes', '')
        )
        
        try:
            # Save to JSON storage
            json_handler.create('mutual_aid_schemes', new_scheme.to_dict())
            flash('Mutual Aid Scheme created successfully!', 'success')
            return redirect(url_for('manage_schemes'))
        except Exception as e:
            flash(f'Error creating scheme: {str(e)}', 'danger')
    
    # GET request - show form
    return render_template('create_scheme.html')

@app.route('/finance/schemes/<scheme_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_scheme(scheme_id):
    """Edit existing mutual aid scheme"""
    scheme = json_handler.get_by_id('mutual_aid_schemes', scheme_id)
    if not scheme:
        flash('Scheme not found', 'danger')
        return redirect(url_for('manage_schemes'))
    
    if request.method == 'POST':
        # Update scheme from form data
        updates = {
            'name': request.form['name'],
            'start_date': datetime.strptime(request.form['start_date'], '%Y-%m-%d').isoformat(),
            'end_date': datetime.strptime(request.form['end_date'], '%Y-%m-%d').isoformat() if request.form.get('end_date') else None,
            'contribution_amount': float(request.form['contribution_amount']),
            'status': request.form['status'],
            'notes': request.form.get('notes', '')
        }
        
        try:
            json_handler.update('mutual_aid_schemes', scheme_id, updates)
            flash('Mutual Aid Scheme updated successfully!', 'success')
            return redirect(url_for('manage_schemes'))
        except Exception as e:
            flash(f'Error updating scheme: {str(e)}', 'danger')
    
    # GET request - show form with scheme data
    return render_template('edit_scheme.html', scheme=scheme)

@app.route('/admin/reports')
@admin_required
def admin_reports():
    """Administrative reports"""
    return render_template('reports.html', title='Administrative Reports')

@app.route('/emergency/priority')
@admin_required
def emergency_priority():
    """Emergency priority management interface"""
    # Get all deployments
    deployments = Deployment.query.filter_by(status='active').order_by(Deployment.priority.desc()).all()
    return render_template('emergency_priority.html', deployments=deployments)

@app.route('/emergency/priority/<int:deployment_id>', methods=['GET', 'POST'])
@admin_required
def update_priority(deployment_id):
    """Update emergency priority for a deployment"""
    deployment = Deployment.query.get_or_404(deployment_id)
    
    if request.method == 'POST':
        # Update priority and related fields
        deployment.priority = request.form['priority']
        deployment.emergency_reason = request.form.get('emergency_reason', '')
        deployment.population_affected = int(request.form.get('population_affected', 0))
        deployment.expected_duration = int(request.form.get('expected_duration', 1))
        deployment.alternative_sources = 'alternative_sources' in request.form
        deployment.vulnerability_index = int(request.form.get('vulnerability_index', 0))
        deployment.notes = request.form.get('notes', '')
        
        try:
            db.session.commit()
            flash('Emergency priority updated successfully!', 'success')
            return redirect(url_for('emergency_priority'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating priority: {str(e)}', 'danger')
    
    # GET request - show form with deployment data
    return render_template('update_priority.html', deployment=deployment)

# API Endpoints
@app.route('/api/bowsers')
@login_required
def api_bowsers():
    bowsers = Bowser.query.all()
    return jsonify([bowser.to_dict() for bowser in bowsers])

@app.route('/api/locations')
@login_required
def api_locations():
    locations = Location.query.all()
    return jsonify([location.to_dict() for location in locations])

@app.route('/api/maintenance')
@staff_required
def api_maintenance():
    records = Maintenance.query.all()
    return jsonify([record.to_dict() for record in records])

@app.route('/api/deployments')
@staff_required
def api_deployments():
    deployments = Deployment.query.all()
    return jsonify([deployment.to_dict() for deployment in deployments])

# --- Staff & Admin Routes ---

# === Test Dashboard Routes ===
@app.route('/testing')
def test_dashboard():
    """Render the test dashboard page."""
    return render_template('test_dashboard.html')

@app.route('/testing_guide')
def testing_guide():
    """Render the testing guide page."""
    try:
        with open('TESTING.md', 'r') as file:
            content = file.read()
            return render_template('markdown.html', content=content, title='Testing Guide')
    except FileNotFoundError:
        return render_template('error.html', message='Testing guide not found.')

@app.route('/run_tests/<test_type>')
def run_tests_api(test_type):
    """API endpoint to run tests and return results as JSON."""
    import subprocess
    import sys
    
    # Map test types to the appropriate command
    test_commands = {
        'core': ['python', 'run_tests.py', 'core'],
        'financial_api': ['python', '-m', 'unittest', 'test_financial_api.py'],
        'all': ['python', 'run_tests.py']
    }
    
    if test_type not in test_commands:
        return jsonify({'success': False, 'output': 'Invalid test type'}), 400
    
    try:
        # Run the tests and capture output
        process = subprocess.run(
            test_commands[test_type],
            capture_output=True,
            text=True
        )
        
        # Return the results
        return jsonify({
            'success': process.returncode == 0,
            'output': process.stdout + process.stderr
        })
    except Exception as e:
        return jsonify({'success': False, 'output': str(e)}), 500

# === Main Routes ===

# === User Management Routes ===

@app.route('/admin/users/edit/<int:user_id>', methods=['GET', 'POST'])
@admin_required
def edit_user(user_id):
    """Edit an existing user."""
    user = User.query.get_or_404(user_id)
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        role = request.form.get('role')
        password = request.form.get('password')
        
        # Validate input
        if not all([username, email, role]):
            flash('Username, email, and role are required.', 'danger')
            return redirect(url_for('admin_users'))
            
        # Check if username already exists (excluding current user)
        existing_user = User.query.filter_by(username=username).first()
        if existing_user and existing_user.id != user_id:
            flash('Username already exists.', 'danger')
            return redirect(url_for('admin_users'))
            
        # Check if email already exists (excluding current user)
        existing_user = User.query.filter_by(email=email).first()
        if existing_user and existing_user.id != user_id:
            flash('Email already exists.', 'danger')
            return redirect(url_for('admin_users'))
        
        # Update user
        user.username = username
        user.email = email
        user.role = role
        
        # Only update password if provided
        if password:
            user.set_password(password)
        
        try:
            db.session.commit()
            flash('User updated successfully.', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating user: {str(e)}', 'danger')
        
        return redirect(url_for('admin_users'))
    
    # GET request - return JSON data for the user
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role
    })

@app.route('/admin/users/delete/<int:user_id>', methods=['POST'])
@admin_required
def delete_user(user_id):
    """Delete a user."""
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('admin_users'))
    
    try:
        db.session.delete(user)
        db.session.commit()
        flash('User deleted successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting user: {str(e)}', 'danger')
    
    return redirect(url_for('admin_users'))

# Clear any existing sessions and cookies on app startup via a route
@app.route('/clear_session')
@admin_required
def clear_session():
    # This will force all users to re-login
    # It helps prevent persistent logins
    session.clear()
    if current_user.is_authenticated:
        logout_user()
    flash('Your session has been cleared.', 'info')
    return redirect(url_for('public_map'))

# Set a permanent cookie removal to prevent auto-login
@app.after_request
def remove_session_cookies_on_logout(response):
    if request.path == '/logout':
        # Instruct browser to delete the cookie by setting expiry in the past
        response.set_cookie('session', '', expires=0)
    return response

# Create a function to clear all sessions in the database
def clear_all_sessions():
    # This is a more direct approach to clear sessions on startup
    # It removes the session cookie for each request
    for key in list(session.keys()):
        session.pop(key)
    print("All sessions cleared at startup")

# Force clear sessions on index page load
@app.before_request
def clear_sessions_on_first_request():
    # Only run on the first request after server restart
    if not hasattr(app, '_session_cleared'):
        clear_all_sessions()
        app._session_cleared = True
        if current_user.is_authenticated:
            logout_user()
            print("Automatically logged out all users on server start")

@app.route('/admin/users/create', methods=['POST'])
@admin_required
def create_user():
    """Create a new user."""
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    role = request.form.get('role')
    
    # Validate input
    if not all([username, email, password, role]):
        flash('All fields are required.', 'danger')
        return redirect(url_for('admin_users'))
        
    # Check if username already exists
    if User.query.filter_by(username=username).first():
        flash('Username already exists.', 'danger')
        return redirect(url_for('admin_users'))
        
    # Check if email already exists
    if User.query.filter_by(email=email).first():
        flash('Email already exists.', 'danger')
        return redirect(url_for('admin_users'))
    
    # Create new user
    user = User(username=username, email=email, role=role)
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        flash('User created successfully.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error creating user: {str(e)}', 'danger')
    
    return redirect(url_for('admin_users'))

# Add error handlers
@app.errorhandler(401)
def unauthorized_error(error):
    if request.is_json:
        return jsonify({'error': 'Authentication required', 'status': 'error'}), 401
    return render_template('errors/401.html'), 401

@app.errorhandler(403)
def forbidden_error(error):
    if request.is_json:
        return jsonify({'error': 'Insufficient permissions', 'status': 'error'}), 403
    return render_template('errors/403.html'), 403

@app.errorhandler(404)
def not_found_error(error):
    if request.is_json:
        return jsonify({'error': 'Resource not found', 'status': 'error'}), 404
    return render_template('errors/404.html'), 404

@app.errorhandler(405)
def method_not_allowed_error(error):
    if request.is_json:
        return jsonify({'error': 'Method not allowed', 'status': 'error'}), 405
    return render_template('errors/405.html'), 405

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    if request.is_json:
        return jsonify({'error': 'Internal server error', 'status': 'error'}), 500
    return render_template('errors/500.html'), 500

@app.route('/deployments/create', methods=['GET', 'POST'])
@login_required
def create_deployment():
    if request.method == 'POST':
        data = request.form
        try:
            deployment = Deployment(
                bowser_id=data['bowser_id'],
                location_id=data['location_id'],
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d'),
                end_date=datetime.strptime(data['end_date'], '%Y-%m-%d'),
                status=data.get('status', 'scheduled')
            )
            db.session.add(deployment)
            db.session.commit()
            flash('Deployment created successfully', 'success')
            return redirect(url_for('deployments'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating deployment: {str(e)}', 'error')
    return render_template('deployments/create.html')

@app.route('/maintenance/create', methods=['GET', 'POST'])
@login_required
def create_maintenance():
    if request.method == 'POST':
        data = request.form
        try:
            maintenance = Maintenance(
                bowser_id=data['bowser_id'],
                maintenance_type=data['maintenance_type'],
                description=data['description'],
                date=datetime.strptime(data['date'], '%Y-%m-%d'),
                status=data.get('status', 'scheduled')
            )
            db.session.add(maintenance)
            db.session.commit()
            flash('Maintenance record created successfully', 'success')
            return redirect(url_for('maintenance'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating maintenance record: {str(e)}', 'error')
    return render_template('maintenance/create.html')

if __name__ == '__main__':
    app.run(debug=True)
