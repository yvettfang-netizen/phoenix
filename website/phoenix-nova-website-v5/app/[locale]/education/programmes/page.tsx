import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Programme and application-cycle records have no field-level verified
 * source in this release. Keep this route as an explicit 404 so an empty
 * search surface cannot be mistaken for a production catalogue.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Programmes(): never {
  notFound();
}
