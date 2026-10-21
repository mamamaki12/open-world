import type { FurnitureDef } from './index';

const colors = ['#2c3035', '#f0ece4', '#b18b54'];
/** Local +Z faces away from the wall; wall fixtures share the established nameplate mount pivot. */
export const LIGHTING: FurnitureDef[] = [
  { id:'ceiling-disc-light',name:'丸型シーリングライト',category:'lighting',ceiling:true,colors,
    light:{position:[0,-.15,0],color:'#fff0d5',intensity:24,distance:7},
    parts:[
      {shape:'cylinder',size:[.66,.05,.66],pos:[0,-.025,0],paint:'main'},
      {shape:'cylinder',size:[.6,.09,.6],pos:[0,-.09,0],paint:'white',glow:true},
    ]},
  { id:'ceiling-pendant-light',name:'ペンダントライト',category:'lighting',ceiling:true,colors,
    light:{position:[0,-.65,0],color:'#ffd8a8',intensity:18,distance:6},
    parts:[
      {shape:'cylinder',size:[.16,.04,.16],pos:[0,-.02,0],paint:'main'},
      {shape:'cylinder',size:[.018,.4,.018],pos:[0,-.24,0],paint:'dark'},
      {shape:'cylinder',size:[.46,.18,.46],pos:[0,-.51,0],paint:'main'},
      {shape:'cylinder',size:[.4,.025,.4],pos:[0,-.61,0],paint:'white',glow:true},
    ]},
  { id:'ceiling-panel-light',name:'角型パネルライト',category:'lighting',ceiling:true,colors,
    light:{position:[0,-.12,0],color:'#f1f6ff',intensity:28,distance:7},
    parts:[
      {shape:'box',size:[1.1,.05,.5],pos:[0,-.025,0],paint:'main'},
      {shape:'box',size:[1,.025,.4],pos:[0,-.062,0],paint:'white',glow:true},
    ]},
  { id:'paper-floor-light',name:'和紙のフロア照明',category:'lighting',colors,
    light:{position:[0,.58,0],color:'#ffd5a0',intensity:9,distance:5},
    parts:[
      {shape:'box',size:[.36,.06,.36],pos:[0,.03,0],paint:'wood'},
      {shape:'box',size:[.3,.85,.3],pos:[0,.485,0],paint:'white',glow:true},
      {shape:'box',size:[.34,.035,.34],pos:[0,.93,0],paint:'wood'},
    ]},
  { id:'globe-floor-light',name:'ボールフロアライト',category:'lighting',colors,
    light:{position:[0,.3,0],color:'#ffe9c7',intensity:8,distance:5},
    parts:[
      {shape:'cylinder',size:[.27,.055,.27],pos:[0,.0275,0],paint:'main'},
      {shape:'sphere',size:[.48,.48,.48],pos:[0,.29,0],paint:'white',glow:true},
    ]},
  { id: 'wall-sconce', name: '壁付けブラケットライト', category: 'lighting', colors,
    mount: { width: .28, height: .54, back: .025 },
    light: { position: [0, 1.6, .23], color: '#ffd6a0', intensity: 2.8, distance: 4.5 },
    parts: [
      { shape: 'box', size: [.16,.4,.05], pos: [0,1.6,0], paint: 'main' },
      { shape: 'box', size: [.2,.08,.2], pos: [0,1.81,.09], paint: 'main' },
      { shape: 'box', size: [.2,.08,.2], pos: [0,1.39,.09], paint: 'main' },
      { shape: 'box', size: [.16,.34,.15], pos: [0,1.6,.1], paint: 'white', glow: true },
    ] },
  { id: 'wall-light-bar', name: '壁付け間接バーライト', category: 'lighting', colors,
    mount: { width: .9, height: .2, back: .025 },
    light: { position: [0,1.65,.16], color: '#ffe2b9', intensity: 2.5, distance: 4 },
    parts: [
      { shape: 'box', size: [.84,.12,.05], pos: [0,1.6,0], paint: 'main' },
      { shape: 'box', size: [.84,.04,.15], pos: [0,1.62,.05], paint: 'main' },
      { shape: 'box', size: [.76,.02,.08], pos: [0,1.65,.07], paint: 'white', glow: true },
    ] },
  { id: 'indirect-floor-light', name: '置き型間接照明', category: 'lighting', colors,
    light: { position: [0,.24,0], color: '#ffd6a0', intensity: 2.6, distance: 4.2 },
    parts: [
      { shape: 'cylinder', size: [.32,.035,.32], pos: [0,.0175,0], paint: 'main' },
      { shape: 'cylinder', size: [.24,.26,.24], pos: [0,.165,0], paint: 'white', glow: true },
      { shape: 'cylinder', size: [.28,.035,.28], pos: [0,.315,0], paint: 'main' },
    ] },
  { id: 'garden-bollard-light', name: '庭の間接ポールライト', category: 'lighting', colors,
    light: { position: [0,.58,0], color: '#ffe0ab', intensity: 2.7, distance: 4.5 },
    parts: [
      { shape: 'cylinder', size: [.24,.05,.24], pos: [0,.025,0], paint: 'main' },
      { shape: 'box', size: [.12,.45,.12], pos: [0,.265,0], paint: 'main' },
      { shape: 'box', size: [.16,.16,.16], pos: [0,.57,0], paint: 'white', glow: true },
      { shape: 'box', size: [.22,.04,.22], pos: [0,.67,0], paint: 'main' },
    ] },
];
