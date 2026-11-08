"""3D A* with conservative inflated obstacles and wind/payload energy accounting."""
import heapq,math
from functools import lru_cache

def distance(a,b):return math.dist(a,b)
def energy(a,b,wind,payload,rate):
    d=distance(a,b)
    if not d:return 0
    tail=(wind[0]*(b[0]-a[0])+wind[1]*(b[1]-a[1]))/d
    return d*rate*(1+payload*.08)*max(.7,1-tail/20)
@lru_cache(maxsize=32)
def blocked_cells(obstacles,grid,levels,bounds):
    blocked=set();lo,hi,bottom,top=bounds
    for x,y,r,h in obstacles:
        radius=r+grid*.72
        for gx in range(max(int(lo),math.floor((x-radius)/grid)*grid),min(int(hi),math.ceil((x+radius)/grid)*grid)+1,grid):
            for gy in range(max(int(bottom),math.floor((y-radius)/grid)*grid),min(int(top),math.ceil((y+radius)/grid)*grid)+1,grid):
                if math.hypot(gx-x,gy-y)<radius:
                    for z in levels:
                        if z<h+12:blocked.add((gx,gy,z))
    return blocked

def route(start,end,buildings,zones,config):
    g=config['grid'];levels=config['altitudes'];lo,hi,bottom,top=config['bounds']
    def snap(p):return (round(p[0]/g)*g,round(p[1]/g)*g,min(levels,key=lambda z:abs(z-p[2])))
    start,end=snap(start),snap(end)
    obstacles=tuple((b['x'],b['y'],b['radius'],b['height']) for b in buildings)+tuple((z['x'],z['y'],z['radius'],z['top']) for z in zones)
    blocked=blocked_cells(obstacles,g,tuple(levels),tuple(config['bounds']))
    if start in blocked or end in blocked:return None
    frontier=[(distance(start,end),0,start)];cost={start:0};parent={};visited=0
    while frontier and visited<25000:
        _,d,p=heapq.heappop(frontier)
        if d>cost[p]:continue
        if p==end:
            path=[p]
            while p in parent:p=parent[p];path.append(p)
            return list(reversed(path))
        visited+=1
        x,y,z=p;zi=levels.index(z)
        neighbors=[(x+g,y,z),(x-g,y,z),(x,y+g,z),(x,y-g,z)]
        if zi:neighbors.append((x,y,levels[zi-1]))
        if zi<len(levels)-1:neighbors.append((x,y,levels[zi+1]))
        for q in neighbors:
            if not(lo<=q[0]<=hi and bottom<=q[1]<=top) or q in blocked:continue
            nd=d+distance(p,q)
            if nd<cost.get(q,float('inf')):cost[q]=nd;parent[q]=p;heapq.heappush(frontier,(nd+distance(q,end),nd,q))
    return None
