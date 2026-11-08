"""Educational hazard models. Parameters are assumptions, not calibrated forecasts."""
import math
class Disaster:
    def __init__(self,epicenter,severity,seed):self.center=epicenter;self.severity=severity;self.seed=seed
    def wind_field(self,t):return (0,0)
    def priority_rules(self):return {'hospital':1.5,'school':1.2}
    def hazard_state(self,t):return {'time':t,'zones':self.blocked_zones(t)}
    def exposure(self,x,y,t):return max(0,1-math.hypot(x-self.center[0],y-self.center[1])/650)*self.severity
class Earthquake(Disaster):
    def blocked_zones(self,t):
        # Repeating aftershock cordon moves deterministically for paired comparisons.
        return [{'x':self.center[0]+90*math.sin(t/5+self.seed),'y':self.center[1], 'radius':35+35*self.severity,'top':45,'kind':'debris / aftershock cordon'}]
    def risk_per_building(self,b,t):return min(.95,self.exposure(b['x'],b['y'],t)*(.35+max(0,1980-b['year'])/180+b['height']/600))
class Flood(Disaster):
    def blocked_zones(self,t):return [{'x':self.center[0],'y':self.center[1],'radius':min(450,60+t*12)*self.severity,'top':12,'kind':'assumed rising-water area'}]
    def risk_per_building(self,b,t):
        # A flat-ground stress scenario until surveyed elevation is supplied.
        return min(.95,self.exposure(b['x'],b['y'],t)*(.2+t/35))
    def wind_field(self,t):return (4,2)
DISASTERS={'earthquake':Earthquake,'flood':Flood}

class Hurricane(Disaster):
    """Synthetic inland rain/wind bands; not an actual hurricane forecast."""
    def blocked_zones(self,t):
        # A high-wind/debris corridor spans all modeled flight altitudes.
        return [{'x':self.center[0]-160+t*24,'y':self.center[1]+120*math.sin(t/4), 'radius':25+55*self.severity,'top':180,'kind':'modeled wind / debris exclusion'}]
    def risk_per_building(self,b,t):
        distance_to_band=abs(b['x']-(self.center[0]-160+t*24))
        return min(.95,self.severity*(.25+.5*math.exp(-distance_to_band/300)+min(.15,b['height']/800)))
    def wind_field(self,t):
        speed=self.severity*(8+3*math.sin(t/4))
        angle=.5+t*.08
        return (math.cos(angle)*speed,math.sin(angle)*speed)
    def hazard_state(self,t):
        return {**super().hazard_state(t),'wind':self.wind_field(t),'description':'Synthetic inland hurricane wind and debris band'}
DISASTERS['hurricane']=Hurricane
