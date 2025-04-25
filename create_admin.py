from app import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

# Create the admin user within the app context
with app.app_context():
    # Check if admin already exists
    admin = User.query.filter_by(username='admin').first()
    
    if admin:
        print(f"Admin user '{admin.username}' already exists.")
        print(f"Admin details:")
        print(f"  - ID: {admin.id}")
        print(f"  - Username: {admin.username}")
        print(f"  - Email: {admin.email}")
        print(f"  - Role: {admin.role}")
        print(f"  - Password hash: {admin.password_hash[:20]}...")
        
        # Test if the password would work
        test_password = 'admin123'
        would_login = check_password_hash(admin.password_hash, test_password)
        print(f"\nPassword 'admin123' would work: {would_login}")
        
        # Update password if it wouldn't work
        if not would_login:
            print("Updating admin password...")
            admin.password_hash = generate_password_hash(test_password)
            db.session.commit()
            print("Password updated successfully!")
    else:
        # Create new admin user
        admin = User(
            username='admin',
            email='admin@example.com',
            role='admin'
        )
        admin.set_password('admin123')  # IMPORTANT: Use a strong password in production!
        
        # Add to database
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")
        
    # List all users
    users = User.query.all()
    print("\nAll users:")
    for user in users:
        print(f"- {user.username} ({user.email}): {user.role}")
