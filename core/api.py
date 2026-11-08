import os
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field
from typing import Literal
from cities import nyc,houston
CITY_LOADERS={'nyc':nyc.load,'houston':houston.load}
from core.simulation import compare,occupancy
from datetime import datetime
router=APIRouter(prefix='/api/rescue')
class RunInput(BaseModel):
    city:Literal['nyc','houston']='houston'
    disaster:Literal['earthquake','flood','hurricane']='hurricane'
    timestamp:datetime
    severity:float=Field(.7,ge=0,le=1)
    drones:int=Field(1,ge=1,le=4)
    steps:int=Field(10,ge=5,le=20)
    runs:int=Field(3,ge=1,le=10)
    epicenter:tuple[float,float]=(0,0)
@router.get('/config')
def configuration(city:Literal['nyc','houston']='houston'):
    try:c,b=CITY_LOADERS[city]()
    except ValueError as e:raise HTTPException(503,str(e))
    return {'city':c,'buildings':b,'googleMapsKey':os.getenv('GOOGLE_MAPS_API_KEY',''),'notice':('OSM building outlines; missing levels assumed 3, missing use assumed office. Occupancy uses assumed floor-area density. No live person locations or confirmed requests are connected.' if city=='houston' else 'PLUTO lot centroids and floor areas; estimated height and footprint; assumed flat-ground elevation. Occupancy and rescue outcomes are estimates.')}
@router.post('/compare')
def comparison(body:RunInput):
    if body.timestamp.tzinfo is None:raise HTTPException(422,'Include a timezone offset in timestamp')
    if any(abs(v)>600 for v in body.epicenter):raise HTTPException(422,'Epicenter must be within the pilot district')
    try:
        c,b=CITY_LOADERS[body.city]();result=compare(c,b,runs=body.runs,disaster=body.disaster,timestamp=body.timestamp.isoformat(),severity=body.severity,drones=body.drones,steps=body.steps,epicenter=body.epicenter)
    except ValueError as e:raise HTTPException(503,str(e))
    return {**result,'occupancy':{a['id']:occupancy(a,body.timestamp,c) for a in b},'inputs':body.model_dump(mode='json'),'assumptions':c['assumptions']}
