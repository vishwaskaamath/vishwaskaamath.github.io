/** Shared physical bezel: preview and Cinema must always use identical rings. */
export default function CrtRings({
  path,
  floatingTransform,
}: {
  path?: string;
  floatingTransform?: string;
}) {
  return (
    <>
      <path
        data-card-path
        d={path}
        fill="none"
        stroke="#161616"
        strokeWidth="6"
      />
      <path
        data-card-path
        d={path}
        fill="none"
        stroke="#c2cfc5"
        strokeOpacity=".22"
        strokeWidth=".65"
      />
      <path
        data-card-path
        data-floating-rim
        d={path}
        transform={floatingTransform}
        fill="none"
        stroke="#d0dbd5"
        strokeOpacity=".3"
        strokeWidth="1.5"
      />
    </>
  );
}
