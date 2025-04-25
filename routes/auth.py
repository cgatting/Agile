from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from datetime import datetime, timedelta
from models.sql_models import User
from database import db
import logging

logger = logging.getLogger(__name__)
auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')

        if not all([username, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400

        # Create new user
        user = User(username=username, email=email, role=role)
        try:
            user.set_password(password)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        db.session.add(user)
        db.session.commit()

        return jsonify({'message': 'User registered successfully'}), 201

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@auth.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not all([username, password]):
            return jsonify({'error': 'Missing username or password'}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'Invalid username or password'}), 401

        # Check if account is locked
        if user.account_locked_until and user.account_locked_until > datetime.utcnow():
            return jsonify({
                'error': 'Account is locked',
                'locked_until': user.account_locked_until.isoformat()
            }), 403

        # Check password
        if not user.check_password(password):
            # Increment failed attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.account_locked_until = datetime.utcnow() + timedelta(minutes=30)
                db.session.commit()
                return jsonify({
                    'error': 'Account locked due to too many failed attempts',
                    'locked_until': user.account_locked_until.isoformat()
                }), 403
            
            db.session.commit()
            return jsonify({'error': 'Invalid username or password'}), 401

        # Reset failed attempts and update last login
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        db.session.commit()

        # Generate and return token (implement your token generation logic here)
        token = generate_token(user)
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
        })

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        username = data.get('username')
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not all([username, current_password, new_password]):
            return jsonify({'error': 'Missing required fields'}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401

        try:
            user.set_password(new_password)
            db.session.commit()
            return jsonify({'message': 'Password reset successfully'}), 200
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Password reset failed'}), 500

def generate_token(user):
    # Implement your token generation logic here
    # This is a placeholder - replace with your actual token generation
    return "dummy_token" 