from app import db, Bowser, Location, Maintenance, Deployment, Invoice, MutualAidScheme, MutualAidContribution, Partner, Alert
from models.json_models import json_handler
from models.model_converters import (
    bowser_to_json, location_to_json, maintenance_to_json,
    deployment_to_json, invoice_to_json, mutual_aid_scheme_to_json,
    mutual_aid_contribution_to_json, partner_to_json, alert_to_json
)

def migrate_data_to_json():
    """Migrate data from SQLite to JSON storage"""
    # Migrate Bowsers
    bowsers = Bowser.query.all()
    for bowser in bowsers:
        json_handler.create('bowsers', bowser_to_json(bowser))

    # Migrate Locations
    locations = Location.query.all()
    for location in locations:
        json_handler.create('locations', location_to_json(location))

    # Migrate Maintenance Records
    maintenance_records = Maintenance.query.all()
    for record in maintenance_records:
        json_handler.create('maintenance', maintenance_to_json(record))

    # Migrate Deployments
    deployments = Deployment.query.all()
    for deployment in deployments:
        json_handler.create('deployments', deployment_to_json(deployment))

    # Migrate Invoices
    invoices = Invoice.query.all()
    for invoice in invoices:
        json_handler.create('invoices', invoice_to_json(invoice))

    # Migrate Mutual Aid Schemes
    schemes = MutualAidScheme.query.all()
    for scheme in schemes:
        json_handler.create('mutual_aid_schemes', mutual_aid_scheme_to_json(scheme))

    # Migrate Mutual Aid Contributions
    contributions = MutualAidContribution.query.all()
    for contribution in contributions:
        json_handler.create('mutual_aid_contributions', mutual_aid_contribution_to_json(contribution))

    # Migrate Partners
    partners = Partner.query.all()
    for partner in partners:
        json_handler.create('partners', partner_to_json(partner))

    # Migrate Alerts
    alerts = Alert.query.all()
    for alert in alerts:
        json_handler.create('alerts', alert_to_json(alert))

def cleanup_sqlite_tables():
    """Remove migrated tables from SQLite while preserving User table"""
    # Keep the User table but drop others
    tables_to_drop = [
        Bowser.__table__, Location.__table__, Maintenance.__table__,
        Deployment.__table__, Invoice.__table__, MutualAidScheme.__table__,
        MutualAidContribution.__table__, Partner.__table__, Alert.__table__
    ]
    
    for table in tables_to_drop:
        table.drop(db.engine)

if __name__ == '__main__':
    # Migrate data to JSON
    migrate_data_to_json()
    
    # Clean up SQLite tables (optional, uncomment when ready)
    # cleanup_sqlite_tables()