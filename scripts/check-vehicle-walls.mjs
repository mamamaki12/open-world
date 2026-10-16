import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(() => window.__ow);
  const result = await page.evaluate(async () => {
    const { useVehicles } = await import('/src/state/vehicles.ts');
    const { useEconomy, currentPlotOf } = await import('/src/state/economy.ts');
    const { plotX, plotZ } = await import('/src/economy/town.ts');
    const { TOWN_HOUSE_PLOTS, townHouseAt } = await import('/src/building/townHouses.ts');
    const { takenPlots } = await import('/src/world/visit.ts');
    const { driveFrame, blockedAt } = await import('/src/world/vehicleLogic.ts');
    const { emptyHouse } = await import('/src/building/types.ts');
    const { CARS } = await import('/src/catalog/cars.ts');
    const { GRID } = await import('/src/building/dimensions.ts');
    const state = useEconomy.getState(), plot = currentPlotOf(state);
    const ox = plotX(plot), oz = plotZ(plot), g = window.__ow;
    const finish = { material: 'siding', color: '#ffffff' }, h = emptyHouse(), d = CARS[0];
    // A short wall stub touches only the front-right corner, outside the former 3 circles.
    h.walls.push({ id: 'corner-wall', level: 0, x0: (10+d.width/2+.02)/GRID, x1: (10+d.width/2+.02)/GRID,
      z0: (10-d.length/2-.6)/GRID, z1: (10-d.length/2-.12)/GRID, exterior: finish, interior: finish });
    g.game.getState().replaceHouse(h);
    const car = { id: 'wall-car', model: d.id, color: '#334455', x: ox+10, z: oz+10, yaw: 0, speed: 0, steer: 0, wheelSpin: 0, braking: false, lights: false };
    useVehicles.setState({ cars: [car], driving: car.id, target: car.id });
    const memory = { x: 10, y: 0, z: 10, yaw: 0, bodyYaw: 0, pitch: 0 };
    for (let i=0;i<100;i++) driveFrame(g.camera, new Set(['KeyW']), .025, memory);
    const stopped = { speed: car.speed, z: car.z-oz };
    for (let i=0;i<20;i++) driveFrame(g.camera, new Set(['KeyS']), .025, memory);
    const escaped = car.z-oz;
    useVehicles.setState({ cars: [], driving: null, target: null });
    g.game.getState().replaceHouse(emptyHouse());
    const taken = takenPlots(state), town = [];
    for (const key of Object.keys(TOWN_HOUSE_PLOTS)) {
      const p = Number(key);
      if (taken.has(p)) continue;
      const house = townHouseAt(p);
      const wall = house.walls.find(w => w.level===0 && w.height==='fence');
      if (!wall) continue;
      const x = plotX(p)-ox + (wall.x0+wall.x1)*GRID/2;
      const z = plotZ(p)-oz + (wall.z0+wall.z1)*GRID/2;
      town.push({ plot:p, blocked:blockedAt(x,z,.2,1.5) });
    }
    // A facility corner must use the same full-body test, in civic-site coordinates.
    const { ESTATE } = await import('/src/building/landmarks.ts');
    const { civicOffset } = await import('/src/state/economy.ts');
    const site = civicOffset(), start = ESTATE.z0 + oz + site.z - d.length/2 - .1;
    Object.assign(car, { x: ESTATE.x0+ox+site.x-d.width/2+.02, z:start, yaw:0, speed:0, steer:0, slipAngle:0, reverseHold:0 });
    useVehicles.setState({ cars:[car], driving:car.id, target:car.id });
    for(let i=0;i<100;i++) driveFrame(g.camera,new Set(['KeyS']),.025,memory);
    const facility = { distance:car.z-start, speed:car.speed };
    useVehicles.setState({ cars:[], driving:null, target:null });
    return { stopped, escaped, town, facility };
  });
  assert.equal(result.stopped.speed, 0, 'front-right corner contact stops the car');
  assert.ok(result.stopped.z >= 9.98, 'car does not enter the wall at the formerly missing corner');
  assert.ok(result.escaped > result.stopped.z+.05, 'reverse can leave the wall after stopping');
  assert.ok(result.town.length > 0);
  assert.ok(result.town.every(x=>x.blocked), 'every available default house fence blocks cars');
  assert.equal(result.facility.speed,0,'facility corner stops the vehicle');
  assert.ok(result.facility.distance>=0 && result.facility.distance<.07,'facility wall catches the full rear corner');
  assert.deepEqual(errors, []);
  console.log('PASS vehicle wall corners, backing away and default-house fences:', JSON.stringify(result));
} finally { await browser.close(); }
