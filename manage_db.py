import sqlite3
import os
import json
from datetime import datetime
import sys
from app import create_app, db
from models import User, Location, Bowser, Deployment, Maintenance, Alert

# Function to serialize datetime objects for JSON
def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# Connect to the database
db_path = os.path.join('instance', 'aquaalert.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row  # This enables column access by name

# Create a cursor
cur = conn.cursor()

def print_help():
    print("""
AquaAlert Database Management Utility
====================================

Commands:
  view                   - View all database tables and their contents
  view [table]           - View contents of a specific table
  delete [table] [id]    - Delete a record from a table by ID
  clear [table]          - Clear all records from a table
  reset                  - Reset the entire database (drop and recreate tables)
  help                   - Show this help message
  exit                   - Exit the utility

Examples:
  python manage_db.py view
  python manage_db.py view bowser
  python manage_db.py delete bowser 2
  python manage_db.py clear maintenance
  python manage_db.py reset
""")

# Function to print table data
def print_table(table_name):
    print(f"\n=== {table_name.upper()} TABLE ===")
    cur.execute(f"SELECT * FROM {table_name}")
    rows = cur.fetchall()
    
    if not rows:
        print("No records found.")
        return
    
    # Convert to list of dicts for easier display
    records = [dict(row) for row in rows]
    for record in records:
        print(json.dumps(record, indent=2, default=json_serial))
        print("-" * 30)
    
    print(f"Total {table_name} records: {len(records)}")

# View all tables or a specific table
def view_tables(table_name=None):
    # Get list of tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cur.fetchall()]
    
    if not tables:
        print("No tables found in the database.")
        return
    
    print(f"Database tables: {', '.join(tables)}\n")
    
    # Print data from all tables or a specific one
    if table_name:
        if table_name in tables:
            print_table(table_name)
        else:
            print(f"Table '{table_name}' not found in database.")
    else:
        for table in tables:
            print_table(table)

# Delete a record from a table
def delete_record(table_name, record_id):
    try:
        # Check if table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not cur.fetchone():
            print(f"Table '{table_name}' does not exist.")
            return
        
        # Check if record exists
        cur.execute(f"SELECT * FROM {table_name} WHERE id=?", (record_id,))
        if not cur.fetchone():
            print(f"Record with ID {record_id} not found in table '{table_name}'.")
            return
        
        # Delete the record
        cur.execute(f"DELETE FROM {table_name} WHERE id=?", (record_id,))
        conn.commit()
        print(f"Record with ID {record_id} deleted from table '{table_name}'.")
    except sqlite3.Error as e:
        print(f"Error deleting record: {e}")

# Clear all records from a table
def clear_table(table_name):
    try:
        # Check if table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not cur.fetchone():
            print(f"Table '{table_name}' does not exist.")
            return
        
        # Ask for confirmation
        confirm = input(f"Are you sure you want to delete ALL records from '{table_name}'? (y/n): ")
        if confirm.lower() != 'y':
            print("Operation cancelled.")
            return
        
        # Delete all records
        cur.execute(f"DELETE FROM {table_name}")
        conn.commit()
        print(f"All records deleted from table '{table_name}'.")
    except sqlite3.Error as e:
        print(f"Error clearing table: {e}")

# Reset the entire database
def reset_database():
    try:
        # Ask for confirmation
        confirm = input("Are you sure you want to reset the ENTIRE database? This will delete ALL data. (y/n): ")
        if confirm.lower() != 'y':
            print("Operation cancelled.")
            return
        
        # Get list of tables
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cur.fetchall()]
        
        # Drop all tables
        for table in tables:
            cur.execute(f"DROP TABLE IF EXISTS {table}")
        
        conn.commit()
        print("Database reset completed. All tables have been dropped.")
        print("Please restart your Flask application to recreate the database schema.")
    except sqlite3.Error as e:
        print(f"Error resetting database: {e}")

def init_db():
    """Initialize the database with sample data."""
    app = create_app()
    with app.app_context():
        # Create the instance directory if it doesn't exist
        os.makedirs(app.instance_path, exist_ok=True)
        
        # Create all tables
        db.create_all()
        
        # Check if we need to add sample data
        if not User.query.first():
            # Add sample data
            admin = User(username='admin', role='admin')
            admin.set_password('admin123')
            db.session.add(admin)
            
            # Add sample locations
            locations = [
                Location(name='Location 1', type='residential', latitude=-26.2041, longitude=28.0473),
                Location(name='Location 2', type='commercial', latitude=-26.2042, longitude=28.0474)
            ]
            db.session.add_all(locations)
            
            # Add sample bowsers
            bowsers = [
                Bowser(number='B001', capacity=1000, status='available'),
                Bowser(number='B002', capacity=2000, status='maintenance')
            ]
            db.session.add_all(bowsers)
            
            db.session.commit()
            print("Database initialized with sample data.")
        else:
            print("Database already contains data.")

# Main execution
if __name__ == "__main__":
    # Process command line arguments
    if len(sys.argv) < 2 or sys.argv[1] == "help":
        print_help()
    elif sys.argv[1] == "view":
        if len(sys.argv) > 2:
            view_tables(sys.argv[2])
        else:
            view_tables()
    elif sys.argv[1] == "delete" and len(sys.argv) == 4:
        delete_record(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "clear" and len(sys.argv) == 3:
        clear_table(sys.argv[2])
    elif sys.argv[1] == "reset":
        reset_database()
    elif sys.argv[1] == "exit":
        pass
    else:
        print("Invalid command. Use 'help' to see available commands.")
    
    # Close the connection
    conn.close()
