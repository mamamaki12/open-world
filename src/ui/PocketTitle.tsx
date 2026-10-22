/** Small original pixel illustration for the menu. It never touches the 3D scene. */
export function PocketTitle(){
  return <div className="pocket-title-screen">
    <p className="world-eyebrow">まちづくり・くらしのゲーム</p>
    <h1>OPEN WORLD</h1>
    <p className="world-subtitle">今日は、どの町で過ごす？</p>
    <svg className="pocket-town" viewBox="0 0 240 48" shapeRendering="crispEdges" aria-hidden="true">
      <path fill="currentColor" d="M0 44h240v4H0zM9 28h4v16H9zm-4 0v-8h4v-8h8v8h4v8zm29-4h36v20H34zm-6 0 24-20 24 20zm52-10h24v30H80zm4-8h16v8H84zm35 20h30v18h-30zm-5 0 20-16 20 16zm49-12h29v30h-29zm4-8h21v8h-21zm37 18h25v20h-25zm-5 0 18-16 18 16z"/>
      <path fill="#c4d39e" d="M42 29h6v6h-6zm17 0h6v6h-6zm-10 7h7v8h-7zm36-16h5v5h-5zm9 0h5v5h-5zm-9 10h5v5h-5zm9 0h5v5h-5zm32 0h6v6h-6zm11 0h6v6h-6zm34-9h6v6h-6zm10 0h6v6h-6zm-10 10h6v6h-6zm10 0h6v6h-6zm29-2h6v6h-6zm9 0h5v6h-5z"/>
      <path fill="currentColor" opacity=".4" d="M24 40h4v4h-4zm87 0h4v4h-4zm43-4h4v8h-4zm83 4h3v4h-3z"/>
    </svg>
  </div>;
}
