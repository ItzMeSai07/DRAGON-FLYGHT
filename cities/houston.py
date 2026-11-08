"""Houston pilot. Real OSM outlines with explicit occupancy and equipment assumptions."""
import json,math,re
from pathlib import Path
from cities.nyc import CONFIG as BASE_CONFIG
CONFIG={**BASE_CONFIG,'id':'houston','name':'Houston, Texas','timezone':'America/Chicago','origin':[29.759,-95.369],'longitude_m_per_degree':96350,'map_zoom':10,'pilot_name':'Downtown Houston · 1.3 km study area','assumptions':{**BASE_CONFIG['assumptions']}}

def number(value,default):
    match=re.match(r'^[0-9.]+',str(value or ''))
    return float(match.group()) if match else default

def load():
    path=Path(__file__).with_name('houston_data.json')
    if not path.exists():raise ValueError('Houston building data missing. Run scripts/fetch_houston.py.')
    data=json.loads(path.read_text());buildings=[]
    for row in data['elements']:
        geometry=row.get('geometry',[])
        if len(geometry)<4:continue
        tags=row.get('tags',{});coords=[((p['lon']-CONFIG['origin'][1])*96350,(p['lat']-CONFIG['origin'][0])*111000) for p in geometry]
        x=sum(p[0] for p in coords[:-1])/(len(coords)-1);y=sum(p[1] for p in coords[:-1])/(len(coords)-1)
        if max(abs(x),abs(y))>560:continue
        footprint=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(coords,coords[1:])))/2
        if footprint<40:continue
        floors=number(tags.get('building:levels'),3);height=number(tags.get('height'),floors*3.5)
        if str(tags.get('height','')).endswith('ft'):height*=.3048
        kind={'apartments':'residential','residential':'residential','hotel':'residential','school':'school','hospital':'hospital','retail':'retail'}.get(tags.get('building'),'office')
        if tags.get('amenity') in ['school','hospital']:kind=tags['amenity']
        buildings.append({'id':str(row['id']),'name':tags.get('name') or tags.get('addr:street','OSM building')+' · '+str(row['id']), 'x':x,'y':y,'lat':29.759+y/111000,'lng':-95.369+x/96350,'height':height,'radius':max(math.hypot(px-x,py-y) for px,py in coords),'area':footprint*floors,'resArea':footprint*floors if kind=='residential' else 0,'residents':None,'kind':kind,'year':int(number(tags.get('start_date'),1980)),'ground':0,'outline':[{'lat':p['lat'],'lng':p['lon']} for p in geometry], 'source':'OpenStreetMap building outline; missing levels assumed 3, missing use assumed office; occupancy estimated'})
    if not buildings:raise ValueError('No usable Houston building outlines in the snapshot')
    return CONFIG,buildings
