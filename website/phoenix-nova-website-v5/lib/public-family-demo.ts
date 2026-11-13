// Only the native Node build defines this constant.
declare const __PHOENIX_PUBLIC_FAMILY_DEMO__: boolean;

export function publicFamilyDemoEnabled(): boolean {
  return process.env.PHOENIX_RUNTIME_TARGET === "node"
    && typeof __PHOENIX_PUBLIC_FAMILY_DEMO__ !== "undefined"
    && __PHOENIX_PUBLIC_FAMILY_DEMO__;
}

export function isPublicFamilyDemoPath(pathname: string): boolean {
  return /^\/(zh|en)\/(family-center|my-services(?:\/[^/]+)?)\/?$/.test(pathname);
}
