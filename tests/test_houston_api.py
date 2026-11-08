from fastapi.testclient import TestClient
from backend.main import app

def test_houston_config_and_timezone_validation(monkeypatch):
    monkeypatch.delenv('GOOGLE_MAPS_API_KEY',raising=False)
    with TestClient(app) as client:
        response=client.get('/api/rescue/config?city=houston')
        assert response.status_code==200
        body=response.json()
        assert body['city']['id']=='houston'
        assert body['googleMapsKey']==''
        assert body['buildings'] and all(29<b['lat']<30 and -96<b['lng']<-95 for b in body['buildings'])
        assert client.post('/api/rescue/compare',json={'city':'houston','disaster':'hurricane','timestamp':'2026-11-08T12:00:00'}).status_code==422

def test_houston_hurricane_endpoint():
    with TestClient(app) as client:
        response=client.post('/api/rescue/compare',json={'city':'houston','disaster':'hurricane','timestamp':'2026-11-08T12:00:00-06:00','runs':1,'drones':2,'steps':10})
        assert response.status_code==200
        data=response.json()
        assert len(data['optimized']['frames'])==10
        assert data['optimized']['returned']
        assert data['inputs']['city']=='houston'
        assert all('plannedPath' in drone for frame in data['optimized']['frames'] for drone in frame['drones'])
