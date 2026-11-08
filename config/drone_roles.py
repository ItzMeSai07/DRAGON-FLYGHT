"""Role-benefit assumptions, version 1.

All values are illustrative student assumptions, not fitted probabilities or
validated predictions. Outputs count expected people receiving a role-specific
service. Comparing outcomes across different roles is not meaningful.
"""

MODEL_VERSION = 'role-benefit-v1'
DEFAULT_ROLE = 'survivor_scouting'

# Exponential decline in modeled survivor availability, in minutes. These are
# inherited scenario assumptions, not medical survival curves.
SURVIVAL_DECAY_MINUTES = {'earthquake': 35.0, 'flood': 12.0, 'hurricane': 35.0}

ROLES = {
    'survivor_scouting': {
        'label': 'Survivor scouting',
        'metric': 'Expected people located · modeled estimate',
        'description': 'Estimate surviving people detected and successfully reported during a site survey.',
        'limitations': 'A location report does not imply rescue, evacuation, or confirmed identity.',
        'sensitivity_parameter': 'detection_probability',
        'parameters': {
            # Fraction of available survivors detected during one survey.
            'detection_probability': {'default': 0.70, 'min': 0.0, 'max': 1.0, 'step': 0.05, 'label': 'Detection probability', 'assumption': 'Illustrative fraction detected during one survey.'},
            # Conditional probability that a detected location reaches responders.
            'report_success_probability': {'default': 0.90, 'min': 0.0, 'max': 1.0, 'step': 0.05, 'label': 'Report success probability', 'assumption': 'Conditional chance that a detected location is successfully reported.'},
            # Whole minutes on site, consuming hover energy each minute.
            'service_minutes': {'default': 1, 'min': 1, 'max': 5, 'step': 1, 'label': 'Survey time (minutes)', 'assumption': 'Whole simulated minutes required to complete the survey.'},
        },
    },
    'supply_drop': {
        'label': 'Supply drop',
        'metric': 'Expected people supplied · modeled estimate',
        'description': 'Estimate people receiving usable supplies, limited by per-visit package capacity.',
        'limitations': 'Capacity is per visit. Stock depletion, loading, and replenishment are not simulated. Supplies do not imply lives saved.',
        'sensitivity_parameter': 'delivery_success_probability',
        'parameters': {
            # Abstract person-sized supply units; mass remains the existing drone
            # payload assumption. Package size/mass are not physically validated.
            'supply_units_per_visit': {'default': 6, 'min': 1, 'max': 100, 'step': 1, 'label': 'Supply units per visit', 'assumption': 'Illustrative package capacity; inventory is abstracted per visit.'},
            'units_per_person': {'default': 1, 'min': 1, 'max': 10, 'step': 1, 'label': 'Units required per person', 'assumption': 'Assumed units needed for one person to receive usable supplies.'},
            # Includes successful drop and the recipient obtaining usable supplies.
            'delivery_success_probability': {'default': 0.80, 'min': 0.0, 'max': 1.0, 'step': 0.05, 'label': 'Usable delivery probability', 'assumption': 'Conditional probability that an allocated supply reaches a person in usable form.'},
            'service_minutes': {'default': 1, 'min': 1, 'max': 5, 'step': 1, 'label': 'Drop time (minutes)', 'assumption': 'Whole simulated minutes required to complete the supply drop.'},
        },
    },
    'comms_relay': {
        'label': 'Communications relay',
        'metric': 'Expected people reconnected · modeled estimate',
        'description': 'Estimate people able to communicate through a successfully established local relay.',
        'limitations': 'Link persistence, radio propagation, bandwidth sharing, and continued station-keeping are not simulated.',
        'sensitivity_parameter': 'link_success_probability',
        'parameters': {
            # Abstract people served during one contact; not concurrent radio users.
            'people_capacity_per_visit': {'default': 20, 'min': 1, 'max': 1000, 'step': 1, 'label': 'People capacity per visit', 'assumption': 'Assumed number of people the relay contact can serve.'},
            'link_success_probability': {'default': 0.85, 'min': 0.0, 'max': 1.0, 'step': 0.05, 'label': 'Link success probability', 'assumption': 'Illustrative chance of establishing the relay contact.'},
            'contact_success_probability': {'default': 0.75, 'min': 0.0, 'max': 1.0, 'step': 0.05, 'label': 'Contact success probability', 'assumption': 'Conditional fraction of allocated people who complete a useful contact.'},
            'service_minutes': {'default': 2, 'min': 1, 'max': 5, 'step': 1, 'label': 'Relay contact time (minutes)', 'assumption': 'Whole simulated minutes to establish and complete one relay contact.'},
        },
    },
}
