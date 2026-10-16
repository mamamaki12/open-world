import { useId } from 'react';
import type { Garment } from '../catalog/clothes';

/** Original flat lays keep the catalog light: only the fitting room uses WebGL. */
export function GarmentIllustration({garment:g}:{garment:Garment}) {
  const id=useId().replace(/:/g,'');
  const outer=g.style==='coat'||g.style==='jacket',long=g.style==='coat',tee=g.style==='tee';
  return <svg viewBox="0 0 240 290" role="img" aria-label={g.name+'の商品イラスト'}>
    <defs><linearGradient id={id}><stop stopColor="#fff" stopOpacity=".18"/><stop offset=".4" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".22"/></linearGradient><filter id={id+'s'} x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="5" floodOpacity=".13"/></filter></defs>
    <g filter={`url(#${id}s)`} fill={g.color} stroke="#000" strokeOpacity=".17" strokeWidth="1.1" strokeLinejoin="round">
      {g.slot==='top'&&<>
        <path d={tee?'M91 66L65 77 28 118 54 139 74 118 70 219Q120 228 170 219L166 118 186 139 212 118 175 77 149 66Q120 81 91 66Z':`M92 57L65 71 38 111 23 200 53 205 76 122 70 ${long?248:220}Q120 ${long?255:228} 170 ${long?248:220}L164 122 187 205 217 200 202 111 175 71 148 57Q120 73 92 57Z`}/>
        <path d={tee?'M92 67Q120 102 148 67L141 65Q120 88 99 65Z':'M92 58Q120 88 148 58L140 55Q120 75 100 55Z'} fill={g.accent??g.color}/>
        {outer&&<><path d="M104 64L120 88 136 64 128 211 112 211Z" fill={g.accent??'#eee9dd'}/><path d="M96 60L82 99 106 123 118 87ZM144 60L158 99 134 123 122 87Z"/><path d={`M120 120V${long?246:220}M82 169L105 171M135 171L158 169`} fill="none"/>{[145,175,205].map(y=><circle key={y} cx="125" cy={y} r="2" fill="#50483f"/>)}</>}
        {g.style==='shirt'&&<><path d="M97 57L120 76 107 94 89 66ZM143 57L120 76 133 94 151 66Z" fill={g.accent??g.color}/><path d="M120 80V219M135 116H155V140H135Z" fill="none"/>{[102,126,150,174,198].map(y=><circle key={y} cx="120" cy={y} r="1.7" fill="#ddd"/>)}</>}
        {g.style==='hoodie'&&<><path d="M94 59Q88 24 120 26Q152 24 146 59L139 78Q120 91 101 78Z"/><path d="M101 64Q120 40 139 64M109 79L106 113M131 79L134 113M94 172L87 196Q120 205 153 196L146 172Z" fill="none" stroke={g.accent??'#ddd'} strokeOpacity=".8" strokeWidth="2"/></>}
        <path d={`M75 ${long?241:213}Q120 ${long?248:222} 165 ${long?241:213}M78 131Q85 168 80 199M162 131Q155 168 160 199`} fill="none" strokeOpacity=".12"/>
      </>}
      {g.slot==='bottom'&&(g.style==='skirt'?<><path d="M85 57H155L185 232Q120 246 55 232Z"/>{[78,94,110,130,146,162].map(x=><path key={x} d={`M${120+(x-120)*.65} 68L${x} 235`} fill="none" strokeOpacity=".12"/>)}<path d="M85 68H155"/></>:<><path d={`M76 53Q120 48 164 53L173 ${g.style==='shorts'?176:241} 129 ${g.style==='shorts'?180:244} 120 124 111 ${g.style==='shorts'?180:244} 67 ${g.style==='shorts'?176:241}Z`}/><path d={`M77 66H163M120 55V107M81 70Q88 98 72 108M159 70Q152 98 168 108M86 118L83 ${g.style==='shorts'?171:237}M154 118L157 ${g.style==='shorts'?171:237}`} fill="none"/><circle cx="120" cy="59" r="2" fill="#999"/></>)}
      {g.slot==='shoes'&&<g transform="rotate(-18 120 145)">{[0,1].map(i=><g key={i} transform={`translate(${i*69-28} ${i*15})`}><path d={g.style==='boot'?'M69 78H108L110 167Q137 184 134 204Q113 218 65 207L62 168Z':'M74 103Q98 92 107 112L112 168Q139 185 134 204Q103 218 63 205L62 172Z'}/><path d="M64 195Q101 209 134 195V207Q100 224 63 209Z" fill={g.accent??'#d8d6ce'}/>{g.style!=='leather'&&[135,147,159,171].map(y=><path key={y} d={`M77 ${y}L101 ${y+2}`} stroke="#eee" strokeOpacity=".8" strokeWidth="3"/>)}</g>)}</g>}
      {g.slot==='hat'&&(g.style==='beanie'?<><path d="M65 169V136Q67 76 120 75Q173 76 175 136V169Z"/><path d="M63 155H177V186Q120 198 63 186Z"/>{[78,92,106,120,134,148,162].map(x=><path key={x} d={`M${x} 159V187`} strokeOpacity=".15"/>)}</>:<><ellipse cx="120" cy="176" rx={g.style==='cap'?70:89} ry="25"/><path d="M70 166L76 108Q120 81 164 108L170 166Q120 187 70 166Z"/><path d="M72 151Q120 169 168 151L170 165Q120 185 70 165Z" fill={g.accent??g.color}/></>)}
    </g>
  </svg>;
}
