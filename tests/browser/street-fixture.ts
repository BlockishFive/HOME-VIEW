import { fromVectorTileJs, GeoJSONWrapper } from "@maplibre/vt-pbf";
import type { GeoJSONVTFeature } from "@maplibre/geojson-vt";
/** Entirely fictional geometry for offline WebGL tests; never used in the application. */
export function streetFixture() {
  const tile = (name:string, features:GeoJSONVTFeature[]) => {
    const layer = new GeoJSONWrapper(features,{version:2,extent:4096});
    layer.name=name;
    return layer;
  };
  const roads:GeoJSONVTFeature[]=[];
  const buildings:GeoJSONVTFeature[]=[];
  for(let i=0;i<=4096;i+=512){
    roads.push({id:i+1,type:2,tags:{class:i===2048?"primary":"minor",name:`Calle ficticia ${i/512+1}`,name_en:`Fictional Street ${i/512+1}`},geometry:[[[0,i],[4096,i]]]});
    roads.push({id:i+2,type:2,tags:{class:"minor",name:`Avenida de prueba ${i/512+1}`,name_en:`Test Avenue ${i/512+1}`},geometry:[[[i,0],[i,4096]]]});
  }
  for(let x=160;x<4096;x+=512)for(let y=160;y<4096;y+=512)
    buildings.push({id:x*4096+y,type:3,tags:{},geometry:[[[x,y],[x+180,y],[x+180,y+180],[x,y+180],[x,y]]]});
  return Buffer.from(fromVectorTileJs({layers:{
    transportation:tile("transportation",roads),
    transportation_name:tile("transportation_name",roads),
    building:tile("building",buildings),
  }}));
}
export const streetTileJSON = {
  tilejson: "3.0.0", minzoom: 0, maxzoom: 14,
  tiles: ["https://tiles.openfreemap.org/fixture/{z}/{x}/{y}.pbf"],
  vector_layers: ["landcover", "landuse", "park", "water", "waterway", "boundary", "building", "transportation", "transportation_name", "place", "poi"].map(id => ({id,fields:{}})),
};
