from flask import Blueprint, jsonify, request, current_app, session
from flask_login import current_user, login_required
from functools import wraps
from models.sql_models import User, Bowser, Location, Maintenance, Deployment, Invoice, Partner, Alert
from database import db
from datetime import datetime
import logging

api_blueprint = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

def api_login_required(f):
    """Decorator to handle API authentication."""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return error_response('Authentication required', 401)
        return f(*args, **kwargs)
    return decorated_function

def api_admin_required(f):
    """Decorator to require admin role for API routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return error_response('Authentication required', 401)
        if current_user.role != 'admin':
            return error_response('Admin access required', 403)
        return f(*args, **kwargs)
    return decorated_function

def api_staff_required(f):
    """Decorator to require staff role for API routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return error_response('Authentication required', 401)
        if current_user.role not in ['staff', 'admin']:
            return error_response('Staff access required', 403)
        return f(*args, **kwargs)
    return decorated_function

def success_response(data=None, message=None):
    """Helper function to create a success response."""
    response = {'status': 'success'}
    if data is not None:
        response['data'] = data
    if message is not None:
        response['message'] = message
    return jsonify(response), 200

def error_response(message, status_code=400):
    """Helper function to create an error response."""
    return jsonify({
        'status': 'error',
        'message': message
    }), status_code

def handle_api_error(f):
    """Decorator to handle API errors."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"API error: {str(e)}")
            return error_response(str(e), 500)
    return decorated_function

def handle_malformed_json(f):
    """Decorator to handle malformed JSON requests."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            if request.method in ['POST', 'PUT']:
                request.get_json()
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Malformed JSON: {str(e)}")
            return error_response('Invalid JSON data', 400)
    return decorated_function

@api_blueprint.errorhandler(400)
def handle_bad_request(e):
    return error_response('Bad request', 400)

@api_blueprint.errorhandler(401)
def handle_unauthorized(e):
    return error_response('Unauthorized', 401)

@api_blueprint.errorhandler(404)
def handle_not_found(e):
    return error_response('Resource not found', 404)

@api_blueprint.errorhandler(405)
def handle_method_not_allowed(e):
    return error_response('Method not allowed', 405)

@api_blueprint.before_request
def before_request():
    """Ensure user session is valid and update last seen."""
    if current_user.is_authenticated:
        session.permanent = True
        session.modified = True
    if not request.is_json and request.method != 'GET':
        return error_response('Content-Type must be application/json')

# Bowser routes
@api_blueprint.route('/bowsers', methods=['GET'])
@api_login_required
@handle_api_error
def get_bowsers():
    """Get all bowsers."""
    try:
        bowsers = Bowser.query.all()
        return success_response(
            data=[bowser.to_dict() for bowser in bowsers],
            message="Bowsers retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving bowsers: {str(e)}")
        return error_response(f"Error retrieving bowsers: {str(e)}", 500)

@api_blueprint.route('/bowsers/<int:bowser_id>', methods=['GET'])
@login_required
def get_bowser(bowser_id):
    bowser = Bowser.query.get_or_404(bowser_id)
    return jsonify(bowser.to_dict()), 200

@api_blueprint.route('/bowsers', methods=['POST'])
@api_login_required
@handle_malformed_json
def create_bowser():
    """Create a new bowser."""
    try:
        data = request.get_json()
        if not all(field in data for field in ['number', 'capacity', 'status']):
            return error_response('Missing required fields')
            
        bowser = Bowser(
            number=data['number'],
            capacity=data['capacity'],
            status=data['status']
        )
        db.session.add(bowser)
        db.session.commit()
        return success_response(
            data=bowser.to_dict(),
            message="Bowser created successfully"
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"Error creating bowser: {str(e)}")

# Location routes
@api_blueprint.route('/locations', methods=['GET'])
@api_login_required
@handle_api_error
def get_locations():
    """Get all locations."""
    try:
        locations = Location.query.all()
        return success_response(
            data=[location.to_dict() for location in locations],
            message="Locations retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving locations: {str(e)}")
        return error_response(f"Error retrieving locations: {str(e)}", 500)

@api_blueprint.route('/locations', methods=['POST'])
@api_login_required
@handle_malformed_json
def create_location():
    """Create a new location."""
    try:
        data = request.get_json()
        if not all(field in data for field in ['name', 'latitude', 'longitude', 'type', 'status']):
            return error_response('Missing required fields')
            
        location = Location(
            name=data['name'],
            address=data.get('address', ''),
            latitude=data['latitude'],
            longitude=data['longitude'],
            type=data['type'],
            status=data['status']
        )
        db.session.add(location)
        db.session.commit()
        return success_response(
            data=location.to_dict(),
            message="Location created successfully"
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating location: {str(e)}")
        return error_response(f"Error creating location: {str(e)}", 500)

# Deployment routes
@api_blueprint.route('/deployments', methods=['GET'])
@api_login_required
@handle_api_error
def get_deployments():
    """Get all deployments."""
    try:
        deployments = Deployment.query.all()
        return success_response(
            data=[deployment.to_dict() for deployment in deployments],
            message="Deployments retrieved successfully"
        )
    except Exception as e:
        return error_response(f"Error retrieving deployments: {str(e)}")

@api_blueprint.route('/deployments', methods=['POST'])
@api_login_required
@handle_malformed_json
def create_deployment():
    """Create a new deployment."""
    try:
        data = request.get_json()
        if not all(field in data for field in ['bowser_id', 'location_id', 'start_date', 'end_date', 'status']):
            return error_response('Missing required fields')
            
        deployment = Deployment(
            bowser_id=data['bowser_id'],
            location_id=data['location_id'],
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d'),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d'),
            status=data['status']
        )
        db.session.add(deployment)
        db.session.commit()
        return success_response(
            data=deployment.to_dict(),
            message="Deployment created successfully"
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"Error creating deployment: {str(e)}")

# Maintenance routes
@api_blueprint.route('/maintenance', methods=['GET'])
@api_login_required
@handle_api_error
def get_maintenance():
    """Get all maintenance records."""
    try:
        maintenance = Maintenance.query.all()
        return success_response(
            data=[record.to_dict() for record in maintenance],
            message="Maintenance records retrieved successfully"
        )
    except Exception as e:
        return error_response(f"Error retrieving maintenance records: {str(e)}")

@api_blueprint.route('/maintenance', methods=['POST'])
@api_login_required
@handle_malformed_json
def create_maintenance():
    """Create a new maintenance record."""
    try:
        data = request.get_json()
        if not all(field in data for field in ['bowser_id', 'maintenance_type', 'description', 'date', 'status']):
            return error_response('Missing required fields')
            
        maintenance = Maintenance(
            bowser_id=data['bowser_id'],
            maintenance_type=data['maintenance_type'],
            description=data['description'],
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            status=data['status']
        )
        db.session.add(maintenance)
        db.session.commit()
        return success_response(
            data=maintenance.to_dict(),
            message="Maintenance record created successfully"
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"Error creating maintenance record: {str(e)}")

# User routes
@api_blueprint.route('/users', methods=['GET'])
@api_admin_required
@handle_api_error
def api_users():
    """Get all users."""
    try:
        users = User.query.all()
        return success_response(
            data=[user.to_dict() for user in users],
            message="Users retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving users: {str(e)}")
        return error_response(f"Error retrieving users: {str(e)}", 500)

# Alert routes
@api_blueprint.route('/alerts', methods=['GET'])
@api_staff_required
@handle_api_error
def api_alerts():
    """Get all alerts."""
    try:
        alerts = Alert.query.all()
        return success_response(
            data=[alert.to_dict() for alert in alerts],
            message="Alerts retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving alerts: {str(e)}")
        return error_response(f"Error retrieving alerts: {str(e)}", 500)