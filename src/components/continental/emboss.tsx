/**
 * SVG lighting filters — real specular highlights for struck metal and pressed wax.
 * Light comes from the upper left (azimuth 225°), like a desk lamp at the member's shoulder.
 */
export function BevelFilter({id, blur = 1.6, scale = 3, specular = 0.85, exponent = 18, color = '#fff6dc', strength = 0.75}: {
  id: string;
  blur?: number;
  scale?: number;
  specular?: number;
  exponent?: number;
  color?: string;
  strength?: number;
}) {
  return (
    <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="blur" />
      <feSpecularLighting in="blur" surfaceScale={scale} specularConstant={specular} specularExponent={exponent} lightingColor={color} result="spec">
        <feDistantLight azimuth="225" elevation="40" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
      <feDiffuseLighting in="blur" surfaceScale={scale} diffuseConstant="1" lightingColor="#ffffff" result="diff">
        <feDistantLight azimuth="225" elevation="52" />
      </feDiffuseLighting>
      <feComposite in="diff" in2="SourceAlpha" operator="in" result="diffIn" />
      <feBlend in="SourceGraphic" in2="diffIn" mode="multiply" result="shaded" />
      <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3={strength} k4="0" />
    </filter>
  );
}
