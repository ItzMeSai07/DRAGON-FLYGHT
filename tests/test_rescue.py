from datetime import datetime
import pytest
from core.routing import route
from core.simulation import simulate,compare,occupancy
from cities.nyc import CONFIG

def configuration():
    return {**CONFIG,'bounds':[-200,200,-200,200],'bases':[[-200,0,150]],'no_fly':[]}
def building(id,x,area=1000):
    return {'id':id,'x':x,'y':0,'radius':10,'height':20,'area':area,'resArea':area,'residents':100,'kind':'residential','year':1920}
def test_astar_avoids_obstacles_and_returns_none_for_blocked_goal():
    c=configuration();obstacle=building('wall',0);obstacle.update(radius=45,height=70)
    p=route((-200,0,30),(200,0,30),[obstacle],[],c)
    assert p and all(not(abs(x)<80 and abs(y)<80 and z<82) for x,y,z in p)
    assert route((-200,0,30),(0,0,30),[obstacle],[],c) is None

def test_timestamp_changes_occupancy_and_requires_timezone():
    c=configuration();b=building('a',0)
    assert occupancy(b,datetime.fromisoformat('2026-11-09T12:00:00-05:00'),c)<occupancy(b,datetime.fromisoformat('2026-11-09T23:00:00-05:00'),c)
    with pytest.raises(ValueError):simulate(c,[b],timestamp='2026-11-08T12:00:00')

@pytest.mark.parametrize('disaster',['earthquake','flood'])
def test_paired_seed_and_reserve(disaster):
    c=configuration();bs=[building('a',0),building('b',150,2000)]
    a=compare(c,bs,runs=2,steps=8,disaster=disaster)
    assert a==compare(c,bs,runs=2,steps=8,disaster=disaster)
    for strategy in ['optimized','nearest']:
        for f in a[strategy]['frames']:
            for d in f['drones']:assert d['battery']>=c['assumptions']['battery_wh']*c['assumptions']['reserve_fraction']
        assert a[strategy]['returned']

def test_zero_severity_does_not_create_saves():
    r=simulate(configuration(),[building('a',0)],severity=0)
    assert r['saved']==0

def test_multiple_drones_do_not_double_count_people():
    c=configuration();b=building('a',0)
    one=simulate(c,[b],steps=8,drones=1)
    two=simulate(c,[b],steps=8,drones=2)
    assert two['saved']==pytest.approx(one['saved'])

def test_headwind_costs_more_energy():
    from core.routing import energy
    a,b=(0,0,150),(100,0,150)
    assert energy(a,b,(-8,0),1,.045)>energy(a,b,(8,0),1,.045)

def test_transit_assignments_are_unique():
    c={**configuration(),'bounds':[-650,650,-650,650],'bases':[[-600,-600,150]]}
    result=simulate(c,[building('far',400)],steps=10,drones=2)
    single=simulate(c,[building('far',400)],steps=10,drones=1)
    assert result['saved']==pytest.approx(single['saved'])

def test_houston_hurricane_returns_with_reserve():
    from cities.houston import load
    config,buildings=load()
    assert buildings and all(b['outline'] for b in buildings)
    result=compare(config,buildings,runs=3,disaster='hurricane',drones=2,steps=10,severity=1)
    for strategy in ['optimized','nearest']:
        assert result['summary'][strategy]['returnRate']==1
        for frame in result[strategy]['frames']:
            assert all(d['battery']>=36 for d in frame['drones'])
