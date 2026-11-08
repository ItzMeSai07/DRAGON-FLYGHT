"""Pure role-specific benefit calculations, independent of routing and the UI."""
import copy
import math

from config.drone_roles import DEFAULT_ROLE, MODEL_VERSION, ROLES, SURVIVAL_DECAY_MINUTES


def role_model(role=DEFAULT_ROLE, overrides=None):
    if role not in ROLES:
        raise ValueError('Unknown drone role')
    definition = ROLES[role]
    parameters = {name: spec['default'] for name, spec in definition['parameters'].items()}
    for name, value in (overrides or {}).items():
        if name not in parameters:
            raise ValueError(f'Unknown parameter for {role}: {name}')
        spec = definition['parameters'][name]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f'{name} must be a finite number')
        if not spec['min'] <= value <= spec['max']:
            raise ValueError(f'{name} must be between {spec["min"]} and {spec["max"]}')
        if spec['step'] == 1 and value != int(value):
            raise ValueError(f'{name} must be a whole number')
        parameters[name] = value
    return {
        'id': role,
        'version': MODEL_VERSION,
        'label': definition['label'],
        'metric': definition['metric'],
        'description': definition['description'],
        'limitations': definition['limitations'],
        'parameters': parameters,
        'parameterDefinitions': copy.deepcopy(definition['parameters']),
        'survivalDecayMinutes': dict(SURVIVAL_DECAY_MINUTES),
    }


def expected_benefit(affected_people, completion_minute, disaster, model):
    """Expected people served once, conditional on assumed survivor availability.

    Events are multiplied as conditional probabilities, not assumed independent
    real-world observations. Each individual outcome is bounded by the estimated
    number of surviving affected people.
    """
    if disaster not in SURVIVAL_DECAY_MINUTES:
        raise ValueError('No survivor-availability assumption for this disaster')
    if not math.isfinite(affected_people) or affected_people < 0:
        raise ValueError('Affected people must be finite and nonnegative')
    if not math.isfinite(completion_minute) or completion_minute < 0:
        raise ValueError('Completion minute must be finite and nonnegative')
    available = affected_people * math.exp(-completion_minute / SURVIVAL_DECAY_MINUTES[disaster])
    p = model['parameters']
    if model['id'] == 'survivor_scouting':
        return available * p['detection_probability'] * p['report_success_probability']
    if model['id'] == 'supply_drop':
        capacity = p['supply_units_per_visit'] / p['units_per_person']
        return min(available, capacity) * p['delivery_success_probability']
    if model['id'] == 'comms_relay':
        return min(available, p['people_capacity_per_visit']) * p['link_success_probability'] * p['contact_success_probability']
    raise ValueError('Unknown drone role')
