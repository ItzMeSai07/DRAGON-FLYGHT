import math,random
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from .routing import route,energy,distance
from disasters import DISASTERS

def occupancy(b,timestamp,config):
    local=timestamp.astimezone(ZoneInfo(config['timezone']));day=local.weekday()<5;work=day and 8<=local.hour<18
    a=config['assumptions'];kind=b['kind'];res=b['residents']
    if res is None:res=b['resArea']/a['residential_m2_per_person']
    residential=res*(.45 if work else .95)
    multiplier=1 if work else (.35 if kind in ['hospital','retail'] else .08)
    return residential+max(0,b['area']-b['resArea'])/a.get(kind+'_m2_per_person',18)*multiplier

def simulate(config,buildings,disaster='earthquake',timestamp='2026-11-08T12:00:00-05:00',severity=.7,epicenter=(0,0),drones=1,steps=15,seed=1,strategy='optimized'):
    stamp=datetime.fromisoformat(timestamp)
    if stamp.tzinfo is None:raise ValueError('Timestamp must include a timezone offset')
    hazard=DISASTERS[disaster](epicenter,severity,seed);a=config['assumptions'];rng=random.Random(seed)
    # Identical target uncertainty for both strategies, independent of visit order.
    uncertainty={b['id']:rng.uniform(.75,1.25) for b in sorted(buildings,key=lambda x:x['id'])}
    targets=sorted((b for b in buildings if b['height']+12<=max(config['altitudes'])),key=lambda b:b['area'],reverse=True)[:12]
    fleet=[{'id':i,'pos':tuple(config['bases'][i%len(config['bases'])]),'base':tuple(config['bases'][i%len(config['bases'])]),'battery':a['battery_wh'],'saved':0.,'reached':0.,'status':'ready'} for i in range(drones)]
    visited=set();frames=[];exposure=0
    def cost(path,t):
        # Budget against the worst modeled wind over the remaining mission.
        return sum(max(energy(p,q,hazard.wind_field(future),a['payload_kg'],a['wh_per_m']) for future in range(min(int(t),steps-1),steps)) for p,q in zip(path,path[1:]))
    def length(path):return sum(distance(p,q) for p,q in zip(path,path[1:]))
    for t in range(steps):
        assigned=set()
        zones=[z for future in range(t,steps+1) for z in hazard.blocked_zones(future)]+config['no_fly'];frame={'minute':t+1,'hazard':hazard.hazard_state(t),'drones':[]}
        for drone in fleet:
            start=drone['pos'];candidates=[]
            pending=drone.pop('pending',None)
            if pending:
                b,people,risk=pending
                survival=math.exp(-t/(12 if disaster=='flood' else 35))
                drone['battery']-=a['hover_wh_per_min'];visited.add(b['id']);drone['saved']+=people*survival*a['assistance_success'];drone['reached']+=people;exposure+=risk;drone['status']='assistance modeled'
                frame['drones'].append({**drone,'path':[start],'plannedPath':[start],'target':b['id']});continue
            if t<steps-2:
                for b in targets:
                    if b['id'] in visited or b['id'] in assigned:continue
                    # Drone reaches a rooftop observation point. No physical evacuation implied.
                    end=(round(b['x']/config['grid'])*config['grid'],round(b['y']/config['grid'])*config['grid'],150)
                    path=route(start,end,buildings,zones,config)
                    if not path:continue
                    travel=length(path)/a['speed_m_per_min'];arrival=t+travel
                    back=route(end,drone['base'],buildings,zones,config)
                    if not back:continue
                    need=cost(path,t)+cost(back,math.ceil(arrival))+a['hover_wh_per_min']+a['battery_wh']*a['reserve_fraction']
                    if need>drone['battery'] or t+max(1,math.ceil(travel))+1+math.ceil(length(back)/a['speed_m_per_min'])>steps:continue
                    risk=hazard.risk_per_building(b,t);people=occupancy(b,stamp+timedelta(minutes=arrival),config)*risk*uncertainty[b['id']]
                    survival=math.exp(-arrival/(12 if disaster=='flood' else 35));benefit=people*survival*a['assistance_success']
                    score=benefit*hazard.priority_rules().get(b['kind'],1)/(travel+1)/(1+risk*.3)
                    candidates.append((length(path) if strategy=='nearest' else -score,b,path,benefit,people,risk))
            if candidates:
                _,target,path,benefit,people,risk=min(candidates,key=lambda c:c[0]);assigned.add(target['id']);returning=False
            else:
                path=route(start,drone['base'],buildings,zones,config);target=None;benefit=people=risk=0;returning=True
            if not path:
                drone['status']='stranded · no safe path';path=[start]
            used=0.;flown=[path[0]];budget=a['speed_m_per_min'];reserve=a['battery_wh']*a['reserve_fraction']
            for p,q in zip(path,path[1:]):
                e=energy(p,q,hazard.wind_field(t),a['payload_kg'],a['wh_per_m'])
                if distance(p,q)>budget or used+e>drone['battery']-reserve:break
                budget-=distance(p,q);used+=e;flown.append(q)
            drone['pos']=flown[-1];drone['battery']-=used
            arrived=len(flown)==len(path)
            if arrived and target:
                if drone['battery']>=reserve+a['hover_wh_per_min']:
                    drone['pending']=(target,people,risk);visited.add(target['id']);drone['status']='on site · assistance next minute'
            elif returning and drone['pos']==drone['base']:drone['status']='at base'
            elif len(flown)>1:drone['status']='returning' if returning else 'en route'
            frame['drones'].append({**{k:v for k,v in drone.items() if k!='pending'},'path':flown,'plannedPath':path,'target':target['id'] if target else None})
        frame['saved']=sum(d['saved'] for d in fleet);frame['reached']=sum(d['reached'] for d in fleet);frames.append(frame)
    return {'strategy':strategy,'frames':frames,'saved':sum(d['saved'] for d in fleet),'reached':sum(d['reached'] for d in fleet),'risk':exposure,'returned':all(d['pos']==d['base'] for d in fleet)}

def compare(config,buildings,runs=3,**kwargs):
    results=[]
    for seed in range(runs):
        results.append({s:simulate(config,buildings,seed=seed,strategy=s,**kwargs) for s in ['optimized','nearest']})
    summary={s:{'average':sum(r[s]['saved'] for r in results)/runs,'worst':min(r[s]['saved'] for r in results),'returnRate':sum(r[s]['returned'] for r in results)/runs} for s in ['optimized','nearest']}
    return {'runs':runs,'summary':summary,'improvement':summary['optimized']['average']-summary['nearest']['average'],'optimized':results[0]['optimized'],'nearest':results[0]['nearest']}
