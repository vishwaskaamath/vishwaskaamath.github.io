/** Crisp pixel polygons: rear view, looking past the camera into the page. */
export default function PixelCamera(){
 return <svg viewBox="0 0 160 128" shapeRendering="crispEdges" className="pixel-camera" aria-hidden="true">
  <defs><pattern id="skin-dither" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#b98059"/><rect width="1" height="1" fill="#e3b287"/><rect x="2" y="2" width="1" height="1" fill="#8c5743"/></pattern><pattern id="camera-dither" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#272d31"/><rect x="1" y="1" width="1" height="1" fill="#454c4d"/></pattern></defs>
  <path d="M104 85H129V101H141V128H115V110H105Z" fill="#704538"/>
  <path d="M112 106H141V115H150V128H118Z" fill="#293b44"/><path d="M115 107H140V112H115ZM122 117H145V120H122Z" fill="#4a6570"/>
  <path d="M31 32H109L135 46V99L112 104H28V47ZM43 48V62H66V48Z" fill="#101619" fillRule="evenodd"/>
  <path d="M34 28H105L128 41L111 46H28Z" fill="#d1d0bf"/>
  <path d="M107 32L133 45V96L112 101V45Z" fill="#a7a99c"/>
  <path d="M116 47L129 51V91L120 94Z" fill="#dad8c8"/>
  <path d="M28 42H111V99H28ZM43 48V62H66V48Z" fill="url(#camera-dither)" fillRule="evenodd"/>
  <path d="M39 44H70V66H39ZM43 48V62H66V48Z" fill="#777f79" fillRule="evenodd"/>
  <path d="M43 48H66V51H46V62H43Z" fill="#111a1b"/>
  <rect x="46" y="51" width="19" height="10" fill="#b3e4ca" opacity=".13"/>
  <path d="M32 72H105V76H32ZM32 82H105V85H32ZM32 90H105V93H32Z" fill="#151b20"/>
  <rect x="31" y="48" width="5" height="5" fill="#234a30"/><rect x="32" y="49" width="3" height="3" fill="#9beb7c"/><rect x="33" y="49" width="1" height="1" fill="#e2ffd1"/>
  <path d="M74 46H102V49H74ZM77 54H99V56H77Z" fill="#696d66"/>
  <path d="M46 32H87V35H46ZM98 34H107V39H98Z" fill="#383d3a"/>
  <path d="M108 32H117V37H108Z" fill="#b63328"/>
  <path d="M120 59H129V68H136V94H130V104H119V99H113V86H117V72H120Z" fill="url(#skin-dither)"/>
  <path d="M124 64H132V70H139V92H134V101H126V96H121V88H124Z" fill="#d19b71"/>
  <path d="M127 75H137V79H127ZM125 86H135V90H125ZM120 97H130V100H120Z" fill="#8b5841"/>
  <path d="M119 77H126V92H120V96H112V90H116V82H119Z" fill="#e5b28a"/>
  <g className="pixel-shutter-finger"><path d="M127 62H119V50H114V43H105V36H111V33H119V38H124V46H129V56H132V65H127Z" fill="url(#skin-dither)"/><path d="M107 36H117V40H107ZM118 41H123V49H118Z" fill="#efc5a0"/><path d="M107 34H114V36H107Z" fill="#f5d3b6"/></g>
 </svg>;
}
