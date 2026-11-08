import math
import pytest
from core.benefits import expected_benefit, role_model


def test_default_scouting_formula_and_time_decay():
    model = role_model()
    assert model['id'] == 'survivor_scouting'
    assert expected_benefit(100, 0, 'hurricane', model) == pytest.approx(63)
    assert expected_benefit(100, 35, 'hurricane', model) == pytest.approx(63 / math.e)


def test_role_capacities_and_zero_probability():
    assert expected_benefit(100, 0, 'hurricane', role_model('supply_drop')) == pytest.approx(4.8)
    assert expected_benefit(100, 0, 'hurricane', role_model('comms_relay')) == pytest.approx(12.75)
    assert expected_benefit(1, 0, 'hurricane', role_model('supply_drop')) <= 1
    assert expected_benefit(100, 0, 'hurricane', role_model(overrides={'detection_probability': 0})) == 0


@pytest.mark.parametrize('role', ['survivor_scouting', 'supply_drop', 'comms_relay'])
def test_zero_people_and_bound(role):
    model = role_model(role)
    assert expected_benefit(0, 10, 'flood', model) == 0
    assert 0 <= expected_benefit(100, 10, 'flood', model) <= 100


@pytest.mark.parametrize('overrides', [
    {'unknown': 1}, {'detection_probability': -1}, {'detection_probability': 1.1},
    {'detection_probability': float('nan')}, {'service_minutes': 1.5},
])
def test_invalid_parameters(overrides):
    with pytest.raises(ValueError):
        role_model(overrides=overrides)


def test_overrides_do_not_mutate_defaults():
    custom = role_model(overrides={'detection_probability': .2})
    custom['parameterDefinitions']['service_minutes']['default'] = 5
    assert role_model()['parameters']['detection_probability'] == .7
    assert role_model()['parameterDefinitions']['service_minutes']['default'] == 1
