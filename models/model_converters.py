from datetime import datetime

def convert_to_json(model_obj):
    """Convert SQLAlchemy model instance to JSON-compatible dict"""
    data = {}
    for column in model_obj.__table__.columns:
        value = getattr(model_obj, column.name)
        if isinstance(value, datetime):
            value = value.isoformat()
        data[column.name] = value
    return data

def convert_from_json(json_data, model_class):
    """Convert JSON data to SQLAlchemy model attributes"""
    model_data = {}
    for column in model_class.__table__.columns:
        if column.name in json_data:
            value = json_data[column.name]
            if isinstance(column.type, db.DateTime) and isinstance(value, str):
                value = datetime.fromisoformat(value)
            model_data[column.name] = value
    return model_data

def bowser_to_json(bowser):
    """Convert Bowser model to JSON format"""
    return {
        'id': str(bowser.id),
        'number': bowser.number,
        'capacity': bowser.capacity,
        'current_level': bowser.current_level,
        'status': bowser.status,
        'owner': bowser.owner,
        'last_maintenance': bowser.last_maintenance.isoformat() if bowser.last_maintenance else None,
        'notes': bowser.notes,
        'created_at': bowser.created_at.isoformat() if bowser.created_at else None
    }

def location_to_json(location):
    """Convert Location model to JSON format"""
    return {
        'id': str(location.id),
        'name': location.name,
        'address': location.address,
        'coordinates': {
            'lat': location.latitude,
            'lng': location.longitude
        },
        'type': location.type,
        'created_at': location.created_at.isoformat() if location.created_at else None
    }

def maintenance_to_json(maintenance):
    """Convert Maintenance model to JSON format"""
    return {
        'id': str(maintenance.id),
        'bowserId': str(maintenance.bowser_id),
        'date': maintenance.scheduled_date.isoformat() if maintenance.scheduled_date else None,
        'type': maintenance.type,
        'description': maintenance.description,
        'status': maintenance.status,
        'technician': maintenance.assigned_to,
        'created_at': maintenance.created_at.isoformat() if maintenance.created_at else None
    }

def deployment_to_json(deployment):
    """Convert Deployment model to JSON format"""
    return {
        'id': str(deployment.id),
        'bowserId': str(deployment.bowser_id),
        'locationId': str(deployment.location_id),
        'startDate': deployment.start_date.isoformat() if deployment.start_date else None,
        'endDate': deployment.end_date.isoformat() if deployment.end_date else None,
        'status': deployment.status,
        'priority': deployment.priority,
        'emergencyReason': deployment.emergency_reason,
        'populationAffected': deployment.population_affected,
        'expectedDuration': deployment.expected_duration,
        'alternativeSources': deployment.alternative_sources,
        'vulnerabilityIndex': deployment.vulnerability_index,
        'notes': deployment.notes,
        'created_at': deployment.created_at.isoformat() if deployment.created_at else None
    }

def invoice_to_json(invoice):
    """Convert Invoice model to JSON format"""
    return {
        'id': str(invoice.id),
        'invoiceNumber': invoice.invoice_number,
        'clientName': invoice.client_name,
        'issueDate': invoice.issue_date.isoformat() if invoice.issue_date else None,
        'dueDate': invoice.due_date.isoformat() if invoice.due_date else None,
        'amount': invoice.amount,
        'status': invoice.status,
        'deploymentId': str(invoice.deployment_id) if invoice.deployment_id else None,
        'notes': invoice.notes,
        'created_at': invoice.created_at.isoformat() if invoice.created_at else None
    }

def mutual_aid_scheme_to_json(scheme):
    """Convert MutualAidScheme model to JSON format"""
    return {
        'id': str(scheme.id),
        'name': scheme.name,
        'startDate': scheme.start_date.isoformat() if scheme.start_date else None,
        'endDate': scheme.end_date.isoformat() if scheme.end_date else None,
        'contributionAmount': scheme.contribution_amount,
        'balance': scheme.balance,
        'status': scheme.status,
        'notes': scheme.notes,
        'created_at': scheme.created_at.isoformat() if scheme.created_at else None
    }

def mutual_aid_contribution_to_json(contribution):
    """Convert MutualAidContribution model to JSON format"""
    return {
        'id': str(contribution.id),
        'schemeId': str(contribution.scheme_id),
        'contributorName': contribution.contributor_name,
        'amount': contribution.amount,
        'contributionDate': contribution.contribution_date.isoformat() if contribution.contribution_date else None,
        'receiptNumber': contribution.receipt_number,
        'notes': contribution.notes,
        'created_at': contribution.created_at.isoformat() if contribution.created_at else None
    }

def partner_to_json(partner):
    """Convert Partner model to JSON format"""
    return {
        'id': str(partner.id),
        'name': partner.name,
        'contactPerson': partner.contact_person,
        'email': partner.email,
        'phone': partner.phone,
        'balance': partner.balance,
        'partnershipStart': partner.partnership_start.isoformat() if partner.partnership_start else None,
        'status': partner.status,
        'notes': partner.notes,
        'created_at': partner.created_at.isoformat() if partner.created_at else None
    }

def alert_to_json(alert):
    """Convert Alert model to JSON format"""
    return {
        'id': str(alert.id),
        'title': alert.title,
        'message': alert.message,
        'priority': alert.priority,
        'status': alert.status,
        'targetUsers': alert.target_users,
        'created_at': alert.created_at.isoformat() if alert.created_at else None,
        'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
    }