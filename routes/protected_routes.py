from flask import Blueprint, render_template, request, jsonify, abort
from flask_login import login_required, current_user
from models.sql_models import User, Bowser, Location, Deployment, Maintenance
from database import db
from functools import wraps

protected_blueprint = Blueprint('protected', __name__)

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                if request.is_json:
                    return jsonify({'error': 'Authentication required', 'status': 'error'}), 401
                abort(401)
            if not roles or current_user.role in roles:
                return f(*args, **kwargs)
            if request.is_json:
                return jsonify({'error': 'Insufficient permissions', 'status': 'error'}), 403
            abort(403)
        return decorated_function
    return decorator

@protected_blueprint.errorhandler(401)
def unauthorized_error(error):
    if request.is_json:
        return jsonify({'error': 'Authentication required', 'status': 'error'}), 401
    return render_template('errors/401.html'), 401

@protected_blueprint.errorhandler(403)
def forbidden_error(error):
    if request.is_json:
        return jsonify({'error': 'Insufficient permissions', 'status': 'error'}), 403
    return render_template('errors/403.html'), 403

@protected_blueprint.errorhandler(404)
def not_found_error(error):
    if request.is_json:
        return jsonify({'error': 'Resource not found', 'status': 'error'}), 404
    return render_template('errors/404.html'), 404

@protected_blueprint.route('/management')
@login_required
@role_required('admin', 'manager')
def management():
    return render_template('management.html')

@protected_blueprint.route('/users')
@login_required
@role_required('admin')
def users():
    users = User.query.all()
    return render_template('users.html', users=users)

@protected_blueprint.route('/bowsers')
@login_required
def bowsers():
    bowsers = Bowser.query.all()
    return render_template('bowsers.html', bowsers=bowsers)

@protected_blueprint.route('/locations')
@login_required
def locations():
    locations = Location.query.all()
    return render_template('locations.html', locations=locations)

@protected_blueprint.route('/deployments')
@login_required
def deployments():
    deployments = Deployment.query.all()
    return render_template('deployments.html', deployments=deployments)

@protected_blueprint.route('/maintenance')
@login_required
def maintenance():
    maintenance_records = Maintenance.query.all()
    return render_template('maintenance.html', maintenance_records=maintenance_records)

@protected_blueprint.route('/dashboard')
@login_required
def dashboard():
    bowsers = Bowser.query.all()
    bowser_status = {}
    for bowser in bowsers:
        bowser_status[bowser.id] = {
            'number': bowser.number,
            'capacity': bowser.capacity,
            'status': bowser.status,
        }
    return render_template('dashboard.html', bowser_status=bowser_status) 