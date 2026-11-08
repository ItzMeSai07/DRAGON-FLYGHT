"""Download public lot attributes only. PLUTO lots can contain several buildings."""
import json, os
from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
import httpx
base='https://data.cityofnewyork.us/resource/64uk-42ks.json'
with httpx.Client(timeout=60) as client:
    rows=client.get(base,params={'$select':'bbl,address,latitude,longitude,bldgarea,resarea,numfloors,yearbuilt,bct2020,landuse,numbldgs', '$where':"borough='MN'",'$limit':50000});rows.raise_for_status()
    totals=rows
    census=client.get('https://api.census.gov/data/2024/acs/acs5',params={'get':'NAME,B01003_001E','for':'tract:*','in':'state:36 county:061',**({'key':os.environ['CENSUS_API_KEY']} if os.getenv('CENSUS_API_KEY') else {})});population=census.json() if census.status_code==200 and census.headers.get('content-type','').startswith('application/json') else [['NAME','B01003_001E','state','county','tract']]
    payload={'source':base,'acsSource':'https://api.census.gov/data/2024/acs/acs5','records':[r for r in rows.json() if r.get('latitude') and r.get('longitude') and 40.705<float(r['latitude'])<40.718 and -74.015<float(r['longitude'])<-74.002 and float(r.get('bldgarea') or 0)>0],'tractAreas':[{'bct2020':r.get('bct2020'),'resarea':r.get('resarea')} for r in totals.json()],'population':population,'populationStatus':'available' if len(population)>1 else 'unavailable; density fallback'}
Path('cities/manhattan_data.json').write_text(json.dumps(payload))
print('Downloaded',len(payload['records']),'PLUTO lot records')
