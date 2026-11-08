"""Manhattan pilot. Coordinates in local metres, altitude above assumed flat ground."""
import json, math
from pathlib import Path
CONFIG={'id':'nyc','name':'Lower Manhattan','origin':[40.711,-74.009], 'timezone':'America/New_York','bounds':[-650,650,-650,650], 'grid':50,'altitudes':[30,60,90,120,150], 'bases':[[-600,-600,150],[600,600,150]],'no_fly':[],
'assumptions':{'office_m2_per_person':18,'school_m2_per_person':8,'hospital_m2_per_person':35,'retail_m2_per_person':25,'residential_m2_per_person':40,'floor_height_m':3.5,'assistance_success':0.15,'service_minutes':1,'speed_m_per_min':600,'battery_wh':180,'reserve_fraction':0.2,'wh_per_m':0.045,'payload_kg':1,'hover_wh_per_min':3}}

def load():
    path=Path(__file__).with_name('manhattan_data.json')
    if not path.exists():raise ValueError('Manhattan source data missing. Run scripts/fetch_manhattan.py.')
    data=json.loads(path.read_text());areas={}
    for r in data['tractAreas']:
        tract=(r.get('bct2020') or '')[1:];areas[tract]=areas.get(tract,0)+float(r.get('resarea') or r.get('residential_area') or 0)
    pop={r[-1]:max(0,int(r[1])) for r in data['population'][1:]}
    buildings=[]
    for r in data['records']:
        lat,lon=float(r['latitude']),float(r['longitude']);x=(lon-CONFIG['origin'][1])*84300;y=(lat-CONFIG['origin'][0])*111000
        if max(abs(x),abs(y))>575:continue
        area=float(r['bldgarea'])*.092903;res=min(area,float(r.get('resarea') or 0)*.092903);floors=max(1,float(r.get('numfloors') or 1));tract=(r.get('bct2020') or '')[1:]
        kind={'8':'school','4':'office','5':'retail'}.get(r.get('landuse'),'residential' if res>0 else 'office')
        census_count=pop.get(tract,0)*res/(areas.get(tract,0)*.092903) if areas.get(tract,0)>0 and tract in pop else None
        buildings.append({'id':r['bbl'],'name':r.get('address','PLUTO lot'),'lat':lat,'lng':lon,'x':x,'y':y,'height':floors*3.5,'radius':max(8,min(45,math.sqrt(area/floors)/2)), 'area':area,'resArea':res,'residents':census_count,'kind':kind,'year':int(r.get('yearbuilt') or 1950),'ground':0,'source':'NYC PLUTO tax lot; height/footprint/elevation approximated'})
    # Bounded pilot targets, not all of Manhattan. All downloaded lots remain obstacles.
    return CONFIG,buildings
