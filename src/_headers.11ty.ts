export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/_headers",
};

export function render(): string {
  return `/*
  Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), bluetooth=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), gamepad=(), geolocation=(), gyroscope=(), hid=(), identity-credentials-get=(), idle-detection=(), local-fonts=(), magnetometer=(), microphone=(), midi=(), otp-credentials=(), payment=(), picture-in-picture=(), publickey-credentials-create=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), speaker-selection=(), usb=(), web-share=(self), window-management=(), xr-spatial-tracking=()

/.well-known/nodeinfo
  Content-Type: application/json
  Access-Control-Allow-Origin: *

/nodeinfo/2.1
  Content-Type: application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.1#"
  Access-Control-Allow-Origin: *

/.well-known/api-catalog
  Content-Type: application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"
  Access-Control-Allow-Origin: *`;
}
