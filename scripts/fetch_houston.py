"""Cache public OSM building geometry for a small downtown Houston pilot."""
import json
from datetime import datetime,timezone
from pathlib import Path
import httpx
QUERY='[out:json][timeout:40];way["building"](29.753,-95.376,29.765,-95.362);out tags geom;'
with httpx.Client(timeout=60) as client:
    response=client.post('https://overpass-api.de/api/interpreter',data={'data':QUERY},headers={'User-Agent':'DragonflyStudentSimulation/1.0','Accept':'application/json'})
    response.raise_for_status()
    data=response.json()
payload={'source':'https://www.openstreetmap.org/copyright','retrievedAt':datetime.now(timezone.utc).isoformat(),'elements':data['elements']}
Path('cities/houston_data.json').write_text(json.dumps(payload))
print('Cached',len(payload['elements']),'OSM building outlines')
