from app import app, db
from models.sql_models import User

with app.app_context():
    users = User.query.all()
    for u in users:
        u.password_hash = u.username  # set plaintext password to username
    db.session.commit()
    print(f"Reset passwords for {len(users)} users to their usernames (plaintext).") 