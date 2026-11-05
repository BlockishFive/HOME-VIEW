import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  configureOwner,
  authenticated,
  login,
  logout,
  db,
  putDraft,
  listDrafts,
  getAsset,
  removeDraft,
  PrivateError,
} from "../lib/server/private-store";
const directory = mkdtempSync(join(tmpdir(), "home-view-private-unit-"));
process.env.HOME_VIEW_DATA_DIR = directory;
test("private owner has no public registration, uses hashed credentials and revocable expiring sessions", () => {
  assert.throws(() => configureOwner("pilot", "short"), PrivateError);
  configureOwner("pilot", "Fictitious-pilot-test-only-2026");
  const owner = db().prepare("SELECT password_hash,salt FROM owner").get()!;
  assert.notEqual(owner.password_hash, "Fictitious-pilot-test-only-2026");
  assert.throws(
    () => configureOwner("other", "Fictitious-pilot-test-only-2026"),
    PrivateError,
  );
  assert.equal(authenticated(undefined), false);
  assert.throws(() => login("pilot", "wrong"), PrivateError);
  const token = login("pilot", "Fictitious-pilot-test-only-2026");
  assert.equal(authenticated(token), true);
  assert.equal(
    db()
      .prepare("SELECT token_hash FROM sessions WHERE token_hash=?")
      .get(token),
    undefined,
  );
  logout(token);
  assert.equal(authenticated(token), false);
  const expired = login("pilot", "Fictitious-pilot-test-only-2026");
  db().exec("UPDATE sessions SET expires=0");
  assert.equal(authenticated(expired), false);
});
test("private writes detect stale versions, keep media atomic, and prevent stale deletion", () => {
  const id = randomUUID(),
    asset = randomUUID();
  const first = putDraft(
    {
      id,
      sharedRevision: 0,
      title: "Fictional private draft",
      updatedAt: "2026-01-01",
    },
    [{ id: asset, content: Buffer.from("first") }],
    0,
  );
  assert.equal(first.sharedRevision, 1);
  assert.equal(Buffer.from(getAsset(id, asset)!).toString(), "first");
  assert.throws(
    () =>
      putDraft(
        { id, sharedRevision: 0, title: "stale" },
        [{ id: asset, content: Buffer.from("bad") }],
        0,
      ),
    (e) => e instanceof PrivateError && e.status === 409,
  );
  assert.equal(Buffer.from(getAsset(id, asset)!).toString(), "first");
  const second = putDraft(
    { id, sharedRevision: 1, title: "updated" },
    [{ id: asset, content: Buffer.from("second") }],
    1,
  );
  assert.equal(second.sharedRevision, 2);
  assert.equal(listDrafts()[0].title, "updated");
  assert.throws(() => removeDraft(id, 1), PrivateError);
  removeDraft(id, 2);
  assert.equal(getAsset(id, asset), undefined);
  assert.equal(listDrafts().length, 0);
});
test("private login throttles repeated failures and password reset revokes sessions without removing drafts", () => {
  const token = login("pilot", "Fictitious-pilot-test-only-2026");
  for (let i = 0; i < 10; i++)
    assert.throws(() => login("pilot", "incorrect"), PrivateError);
  assert.throws(
    () => login("pilot", "Fictitious-pilot-test-only-2026"),
    (e) => e instanceof PrivateError && e.status === 429,
  );
  const id = randomUUID();
  putDraft({ id, sharedRevision: 0, title: "retained" }, [], 0);
  configureOwner("pilot", "Replacement-fictitious-password-2026", true);
  assert.equal(authenticated(token), false);
  assert.equal(listDrafts().length, 1);
  assert.equal(
    authenticated(login("pilot", "Replacement-fictitious-password-2026")),
    true,
  );
});
test("consistent backup retains private records and images in a separate database connection", () => {
  const id = randomUUID(),
    asset = randomUUID();
  putDraft(
    { id, sharedRevision: 0, title: "backup fixture" },
    [{ id: asset, content: Buffer.from("image fixture") }],
    0,
  );
  const backup = join(directory, "backup.sqlite");
  db().prepare("VACUUM INTO ?").run(backup);
  const snapshot = new DatabaseSync(backup, { readOnly: true });
  assert.equal(
    (
      snapshot.prepare("SELECT revision FROM drafts WHERE id=?").get(id) as {
        revision: number;
      }
    ).revision,
    1,
  );
  assert.equal(
    Buffer.from(
      (
        snapshot
          .prepare("SELECT content FROM assets WHERE draft_id=?")
          .get(id) as { content: Uint8Array }
      ).content,
    ).toString(),
    "image fixture",
  );
  snapshot.close();
});
test.after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

test("publication snapshots exclude private fields, survive private edits and reject stale publishing", async () => {
  const {setPublication, publishedProperties, publishedAsset, publicProperty} = await import("../lib/server/publications");
  const id = randomUUID(), photo = randomUUID();
  const metadata = {
    id, sharedRevision:0, title:"Fictional published house", description:"Authorized fictional description",
    operation:"Venta", sale:{purchasePrice:2000000,annualTax:null},
    propertyType:"Casa", area:120, beds:null, baths:null, locationReviewed:true,
    city:"León",state:"Guanajuato",neighborhood:"Fictional zone",latitude:21.12,longitude:-101.68,
    maintenance:{status:"unknown",amount:null,included:"unknown"},community:"unknown",imageRights:true,
    photos:[{id:photo,name:"private-filename.jpg"}],scenes:[],secret:"never public",createdAt:"2026-01-01"
  };
  putDraft(metadata,[{id:photo,content:Buffer.from("old public image")}],0);
  assert.equal(publishedAsset(id,photo),undefined);
  setPublication(id,1,true);
  const snapshot = publishedProperties().find(p=>p.slug===`anuncio-${id}`)!;
  assert.equal(snapshot.title,metadata.title);
  assert.equal(snapshot.beds,null);
  assert.equal(snapshot.builtYear,null);
  assert.equal(snapshot.locationPrecision,"approximate");
  assert.deepEqual(publicProperty({...metadata, publicLocation:"exact"} as never).coordinates,{lat:metadata.latitude,lng:metadata.longitude});
  assert.notEqual(snapshot.coordinates.lat,metadata.latitude);
  assert.notEqual(snapshot.coordinates.lng,metadata.longitude);
  assert.equal("secret" in snapshot,false);
  assert.equal("imageRights" in snapshot,false);
  assert.equal("rental" in snapshot,false);
  assert.equal(JSON.stringify(snapshot).includes("private-filename"),false);
  putDraft({...metadata,title:"Private revision"},[{id:photo,content:Buffer.from("new private image")}],1);
  assert.equal(publishedProperties().find(p=>p.slug===snapshot.slug)!.title,metadata.title);
  assert.equal(Buffer.from(publishedAsset(id,photo)!).toString(),"old public image");
  assert.throws(()=>setPublication(id,1,true),e=>e instanceof PrivateError && e.status===409);
  setPublication(id,2,true);
  assert.equal(publishedProperties().find(p=>p.slug===snapshot.slug)!.title,"Private revision");
  assert.equal(Buffer.from(publishedAsset(id,photo)!).toString(),"new private image");
  setPublication(id,2,false);
  assert.equal(publishedAsset(id,photo),undefined);
  assert.ok(listDrafts().some(d=>d.id===id));
  setPublication(id,2,true);
  removeDraft(id,2);
  assert.equal(publishedProperties().some(p=>p.slug===snapshot.slug),false);
  assert.equal(publishedAsset(id,photo),undefined);
});

test("legacy public snapshots redact exact points and unreviewed locations cannot publish", async()=>{
  const {publicProperty, publishedProperties} = await import("../lib/server/publications");
  const id=randomUUID();
  assert.throws(()=>publicProperty({id} as never),e=>e instanceof PrivateError && e.code==="location_review");
  putDraft({id,sharedRevision:0},[],0);
  db().prepare("INSERT INTO publications VALUES (?,?,?)").run(id,1,JSON.stringify({slug:`anuncio-${id}`,published:true,coordinates:{lat:21.123456,lng:-101.654321}}));
  const snapshot=publishedProperties().find(p=>p.slug===`anuncio-${id}`)!;
  assert.equal(snapshot.locationPrecision,"approximate");
  assert.deepEqual(snapshot.coordinates,{lat:21.125,lng:-101.655});
});
test("geocoding caches identical queries, gates requests across workers and recovers without leaking errors",async()=>{
  const {searchPlaces}=await import("../lib/server/geocoding");
  let calls=0;
  const request=(async(url:URL,init:RequestInit)=>{
    calls++;
    assert.equal(url.origin,"https://photon.komoot.io");
    assert.equal(url.searchParams.get("q"),"Zona ficticia León");
    assert.ok(String((init.headers as Record<string,string>)["User-Agent"]).includes("HomeView"));
    return Response.json({features:[{geometry:{type:"Point",coordinates:[-101.68,21.12]},properties:{name:"Zona ficticia",countrycode:"MX"}}]});
  }) as typeof fetch;
  const first=await searchPlaces("Zona ficticia León","es",request);
  assert.deepEqual(await searchPlaces("Zona ficticia León","es",request),first);
  assert.equal(calls,1);
  await assert.rejects(()=>searchPlaces("otra dirección","es",request),e=>e instanceof PrivateError && e.status===429);
  db().exec("UPDATE geocoder_gate SET until_time=0");
  await assert.rejects(()=>searchPlaces("fallo ficticio","es",(async()=>{throw new Error("sensitive upstream detail");}) as typeof fetch),e=>e instanceof PrivateError && e.code==="geocoder" && !e.message.includes("sensitive"));
});
