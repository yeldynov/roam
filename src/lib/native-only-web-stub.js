// Stands in for native-only packages in web bundles (see metro.config.js). Roam's web export exists only
// to ship the API routes to EAS Hosting; its pages are never used, so every export here renders nothing.
const noop = () => null;
module.exports = new Proxy({}, { get: (_, key) => (key === "__esModule" ? true : noop) });
