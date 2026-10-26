"""PlantSignal integrated design 03. mm CAD, metre GLB. Requires requirements.txt."""
from pathlib import Path
import json, math
import numpy as np
import trimesh as tm
from trimesh.visual.material import PBRMaterial

OUT=Path(__file__).resolve().parent
(OUT/'stl').mkdir(parents=True,exist_ok=True)

def outline(w,d,r,n=32):
    r=min(r,w/2,d/2)
    pts=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for a in np.linspace(start,start+90,n,endpoint=False):
            pts.append([cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a))])
    return np.array(pts)

def loft(w,d,r,profiles):
    rings=[np.column_stack([outline(w-2*k,d-2*k,r-k),np.full(128,z)]) for z,k in profiles]
    verts=np.vstack(rings).tolist();faces=[];N=128
    for j in range(len(rings)-1):
        for i in range(N):
            a=j*N+i;b=j*N+(i+1)%N;c=(j+1)*N+i;e=(j+1)*N+(i+1)%N
            faces.extend([[a,b,c],[b,e,c]])
    bottom=len(verts);verts.append([0,0,profiles[0][0]])
    top=len(verts);verts.append([0,0,profiles[-1][0]])
    for i in range(N):faces.extend([[bottom,(i+1)%N,i],[top,(len(rings)-1)*N+i,(len(rings)-1)*N+(i+1)%N]])
    m=tm.Trimesh(vertices=verts,faces=faces,process=True)
    assert m.is_volume
    return m
def rr(w,d,r,h,z=0):return loft(w,d,r,[(z,0),(z+h,0)])
def cy(r,h,z=0,x=0,y=0):
    m=tm.creation.cylinder(radius=r,height=h,sections=128);m.apply_translation([x,y,z+h/2]);return m
def box(size,pos):
    m=tm.creation.box(extents=size);m.apply_translation(pos);return m
def move(m,v):
    m=m.copy();m.apply_translation(v);return m
def union(*m):return tm.boolean.union(list(m),engine='manifold')
def diff(a,*b):return tm.boolean.difference([a,*b],engine='manifold')
def upright_slot(w,h,r,depth,position):
    m=rr(w,h,r,depth);m.apply_transform(tm.transformations.rotation_matrix(math.pi/2,[1,0,0]));m.apply_translation(position);return m

outer=loft(230,160,80,[(12,4),(14,1),(16,0),(153,0),(155,1),(157,3)])
shell=diff(outer,rr(222,152,76,146,16))
deck=loft(230,160,80,[(151,0),(153,0),(155,1),(157,3)])
well=cy(70,112,45,-31)
bosses=[cy(4.5,16,14,x,y) for x in [-45,45] for y in [-50,50]]
body=union(shell,deck,well,*bosses)
body=diff(body,cy(67,120,49,-31),move(rr(42,96,21,18,147),[76,0,0]),*[cy(1.35,16,10,x,y) for x in [-45,45] for y in [-50,50]])
body=diff(body,upright_slot(9,64,4.5,30,[62,-55,82]),upright_slot(54,26,5,12,[0,85,34]))
base=loft(222,152,76,[(0,4),(2,1),(4,0),(10,0),(12,1)])
base=diff(base,*[cy(1.7,18,-3,x,y) for x in [-45,45] for y in [-50,50]])
lid=move(loft(48,106,24,[(0,2),(1,0),(4,0),(6,1)]),[76,0,156])
lid=diff(lid,cy(7,5,160,76,-51))
cover=upright_slot(58,30,7,3,[0,82,34])
clip=union(box([24,3,20],[0,-4.5,10]),box([24,3,20],[0,4.5,10]),box([24,12,3],[0,0,20.5]))
clip=diff(clip,box([19,2,12],[0,4.5,17]))
clip.apply_transform(tm.transformations.rotation_matrix(math.radians(30),[0,0,1]));clip.apply_translation([-65,58,137])

parts={'main-shell':body,'base-plinth':base,'refill-lid':lid,'rear-service-cover':cover,'sensor-holder':clip}
colours={'main-shell':'#eee9df','base-plinth':'#25463b','refill-lid':'#879b86','rear-service-cover':'#eee9df','sensor-holder':'#365442'}
report={}
for name,m in parts.items():
    assert m.is_volume and m.is_watertight and len(m.split())==1,name
    printable=m.copy();printable.apply_translation(-printable.bounds[0]*[0,0,1])
    printable.export(OUT/'stl'/f'{name}.stl')
    check=tm.load_mesh(OUT/'stl'/f'{name}.stl')
    assert check.is_volume and check.is_watertight and len(check.split())==1,name
    report[name]={'watertight':True,'connected_solids':1,'triangles':len(check.faces),'bounds_mm':np.round(check.bounds,3).tolist(),'volume_mm3':round(float(check.volume),2)}

def material(m,name,color,alpha=1,rough=.65):
    m=m.copy();srgb=tm.visual.color.hex_to_rgba(color)[:3].astype(float)/255
    linear=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
    rgba=np.r_[linear,alpha]
    m.visual=tm.visual.TextureVisuals(material=PBRMaterial(name=name,baseColorFactor=rgba,roughnessFactor=rough,metallicFactor=0,doubleSided=True,alphaMode='BLEND' if alpha<1 else 'OPAQUE'))
    return m
product=tm.Scene()
for name,m in parts.items():product.add_geometry(material(m,name,colours[name]),node_name=name,geom_name=name)
tank=move(rr(38,90,19,100,43),[76,0,0])
product.add_geometry(material(tank,'tank-reference','#a6c5bb',.3,.22),node_name='ref_reservoir',geom_name='ref_reservoir')
water=move(rr(34,86,17,55,46),[76,0,0])
product.add_geometry(material(water,'water-reference','#76b5b5',.7,.18),node_name='ref_water',geom_name='ref_water')
lens=upright_slot(8,62,4,1.5,[62,-76.5,82])
product.add_geometry(material(lens,'passive-level-window','#91bfbb',.68,.17),node_name='ref_level_window',geom_name='ref_level_window')
liner=diff(cy(64,100,49,-31),cy(61.5,103,52,-31))
product.add_geometry(material(liner,'liner-reference','#4c5541'),node_name='ref_liner',geom_name='ref_liner')
soil=cy(61.4,4,147,-31)
product.add_geometry(material(soil,'soil-reference','#42362a',1,.98),node_name='ref_soil',geom_name='ref_soil')
for name,m in [('ref_controller',box([53,27,12],[-30,0,28])),('ref_pump',box([28,24,20],[45,12,28]))]:
    product.add_geometry(material(m,name,'#34453f'),node_name=name,geom_name=name)
def tube(a,b,r):
    a=np.array(a,float);b=np.array(b,float)
    m=tm.creation.cylinder(radius=r,height=np.linalg.norm(b-a),sections=16)
    m.apply_transform(tm.geometry.align_vectors([0,0,1],b-a));m.apply_translation((a+b)/2);return m
route=[[76,20,55],[45,20,28],[0,65,35],[-25,62,155],[-25,51,158]]
for i,(a,b) in enumerate(zip(route,route[1:])):product.add_geometry(material(tube(a,b,2),'tube-reference','#45594c'),node_name=f'ref_tube_{i}',geom_name=f'ref_tube_{i}')

def export(scene,path):
    s=scene.copy();s.apply_transform(tm.transformations.scale_matrix(.001));s.export(path)
export(product,OUT/'product.glb')

# Curved, cut-leaf context geometry; the plant is not a printable component.
def leaf(length,width,angle,tilt,origin):
    verts=[];faces=[];nu,nv=55,28
    for i in range(nu+1):
        u=i/nu
        span=width/2*max(.018,math.sin(math.pi*(u*.96+.02)))**.85
        for c in [.27,.43,.59,.74]:span*=1-.45*math.exp(-((u-c)/.021)**2)
        for j in range(nv+1):
            v=-1+2*j/nv
            verts.append([length*u,span*v,7*math.sin(math.pi*u)-9*v*v*math.sin(math.pi*u)+5*u*u])
    for i in range(nu):
        for j in range(nv):
            u=(i+.5)/nu;v=-1+2*(j+.5)/nv
            hole=any(((u-c)/.028)**2+((abs(v)-.48)/.13)**2<1 for c in [.33,.5,.66])
            if hole:continue
            a=i*(nv+1)+j;b=a+1;c=a+nv+1;d=c+1
            faces.extend([[a,c,b],[b,c,d]])
    m=tm.Trimesh(vertices=verts,faces=faces,process=False)
    m.apply_transform(tm.transformations.euler_matrix(0,math.radians(tilt),math.radians(angle)));m.apply_translation(origin)
    return m
leaves=[(112,78,155,-14,[-53,4,245]),(102,74,25,-24,[-18,1,267]),(96,70,-68,-22,[-29,-4,225]),(83,61,92,-31,[-32,12,282]),(83,60,210,-12,[-55,-9,205]),(75,55,-8,-45,[-25,7,300])]
for i,(length,width,angle,tilt,origin) in enumerate(leaves):
    stempoints=[[-31+(i-2)*2,0,149],[-31+(i-2)*2,0,(origin[2]+149)/2],origin]
    for j,(a,b) in enumerate(zip(stempoints,stempoints[1:])):product.add_geometry(material(tube(a,b,2.1),'plant-stem','#4f6e34'),node_name=f'plant_stem_{i}_{j}',geom_name=f'plant_stem_{i}_{j}')
    name=f'plant_leaf_{i}'
    product.add_geometry(material(leaf(length,width,angle,tilt,origin),name,['#345c29','#467335','#36652f','#5b803f','#375d28','#68863d'][i],1,.46),node_name=name,geom_name=name)
export(product,OUT/'assembly.glb')
(OUT/'mesh-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'parts':list(parts),'geometry_checks':'All exported STLs reloaded: positive volume, watertight, one solid.','files':str(OUT)},indent=2))
