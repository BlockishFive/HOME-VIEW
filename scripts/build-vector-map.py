"""Build the bundled reference map from licensed, checked local snapshots.
No network calls. Runtime only needs the resulting PMTiles file, not Python.
python -m pip install -r scripts/requirements-maps.txt
python scripts/build-vector-map.py
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import numpy as np
import mapbox_vector_tile
from shapely.geometry import shape, box, mapping
from shapely.strtree import STRtree
from shapely import make_valid, transform
from pmtiles.writer import write
from pmtiles.tile import Compression, TileType, zxy_to_tileid

ROOT=Path(__file__).resolve().parents[1]
INPUT=ROOT/'scripts/map-data'
OUTPUT=ROOT/'public/maps'
PROFILES=[
 ('mexico',3,7,(-118.5,14.3,-86.5,32.8)),
 ('guanajuato',8,10,(-102.2,19.8,-99.6,21.9)),
 ('leon',11,14,(-101.84,20.98,-101.52,21.26)),
]
def project(x,y,z=None):
 x,y=np.asarray(x),np.clip(np.asarray(y),-85.05112878,85.05112878)
 return (x+180)/360,(1-np.arcsinh(np.tan(np.radians(y)))/np.pi)/2

def projected_bounds(bounds):
 west,south,east,north=bounds
 x0,y0=project(west,north);x1,y1=project(east,south)
 return float(x0),float(y0),float(x1),float(y1)

manifest=json.loads((INPUT/'sources.json').read_text())
for snapshot in manifest['snapshots']:
 data=(INPUT/snapshot['file']).read_bytes()
 if hashlib.sha256(data).hexdigest()!=snapshot['sha256']:
  raise ValueError(f"Unverified source snapshot: {snapshot['file']}")

geometries=[];properties=[]
for filename,kind in [('mexico-country','land'),('mexico-states','boundary'),('mexico-roads','road'),('mexico-urban','urban')]:
 collection=json.loads(gzip.decompress((INPUT/f'{filename}.geojson.gz').read_bytes()))
 for feature in collection['features']:
  geom=make_valid(shape(feature['geometry']))
  if kind=='boundary':geom=geom.boundary
  props={'kind':kind,'name':str(feature.get('properties',{}).get('name',''))}
  if kind=='road':
   road_class=str(feature['properties'].get('class',''))
   props['class']='motorway' if 'Expressway' in road_class or 'Motorway' in road_class else 'primary' if 'Major' in road_class else 'secondary'
  geometries.append(transform(geom,project,interleaved=False));properties.append(props)

tiles=[];profile_counts={};feature_counts={}
for scope,minzoom,maxzoom,bounds in PROFILES:
 clip=box(*projected_bounds(bounds))
 selected=[];attributes=[]
 for geom,props in zip(geometries,properties):
  if geom.intersects(clip):
   part=geom.intersection(clip)
   if not part.is_empty:
    selected.append(part);attributes.append({**props,'scope':scope})
 tree=STRtree(selected)
 feature_counts[scope]={kind:sum(p['kind']==kind for p in attributes) for kind in ['land','boundary','road','urban']}
 count=0
 for zoom in range(minzoom,maxzoom+1):
  scale=2**zoom
  x0,y0,x1,y1=projected_bounds(bounds)
  for x in range(int(x0*scale),int(x1*scale)+1):
   for y in range(int(y0*scale),int(y1*scale)+1):
    tile_bounds=(x/scale,y/scale,(x+1)/scale,(y+1)/scale)
    tile_box=box(*tile_bounds)
    features=[]
    for index in sorted(tree.query(tile_box)):
     props=attributes[index]
     if scope=='mexico' and zoom<5 and props['kind'] in ['road','urban']:continue
     geom=selected[index].intersection(tile_box).simplify(.6/(scale*4096),preserve_topology=True)
     if geom.is_empty:continue
     if geom.geom_type=='GeometryCollection':
      parts=[g for g in geom.geoms if g.geom_type not in ['Point','MultiPoint','GeometryCollection']]
     else:parts=[geom]
     for part in parts:
      if part.geom_type in ['Point','MultiPoint']:continue
      features.append({'geometry':mapping(part),'properties':props})
    if not features:continue
    encoded=mapbox_vector_tile.encode({'name':'basemap','features':features},default_options={'quantize_bounds':tile_bounds,'y_coord_down':True,'extents':4096})
    tiles.append((zxy_to_tileid(zoom,x,y),gzip.compress(encoded,mtime=0)))
    count+=1
 profile_counts[scope]=count
 print(f'{scope}: {count} tiles; {feature_counts[scope]}',flush=True)

OUTPUT.mkdir(parents=True,exist_ok=True)
archive=OUTPUT/'home-view.pmtiles'
header={'tile_type':TileType.MVT,'tile_compression':Compression.GZIP,'min_zoom':3,'max_zoom':14,
 'min_lon_e7':-1185000000,'min_lat_e7':143000000,'max_lon_e7':-865000000,'max_lat_e7':328000000,
 'center_zoom':12,'center_lon_e7':-1016860000,'center_lat_e7':211220000}
metadata={'name':'Home View reference basemap','attribution':'Natural Earth — Public domain','format':'pbf','bounds':'-118.5,14.3,-86.5,32.8','minzoom':'3','maxzoom':'14',
 'description':'Reference geography and generalized major roads. Not a complete street map or cadastral survey.',
 'vector_layers':[{'id':'basemap','minzoom':3,'maxzoom':14,'fields':{'kind':'String','name':'String','scope':'String','class':'String'}}]}
with write(str(archive)) as writer:
 for tileid,data in sorted(tiles):writer.write_tile(tileid,data)
 writer.finalize(header,metadata)
metrics={'file':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'tile_count':len(tiles),'profile_tiles':profile_counts,'profile_features':feature_counts,'input_geojson_bytes':sum(s['uncompressed_bytes'] for s in manifest['snapshots']),
 'license':'Natural Earth public domain','coverage':'Mexico/Guanajuato context; generalized major roads in Leon. No complete neighborhood street coverage.','profiles':[{'scope':s,'minzoom':lo,'maxzoom':hi,'bounds':list(b)} for s,lo,hi,b in PROFILES]}
(OUTPUT/'manifest.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
print(f'Published archive: {metrics["bytes"]:,} bytes; {len(tiles)} tiles',flush=True)
