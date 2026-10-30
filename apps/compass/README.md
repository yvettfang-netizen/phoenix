# Compass application boundary

The current Compass implementations remain at `/Phoenix Compass`. This
directory reserves the normalized `apps/compass` boundary.

Every Compass domain, including Health Compass, must use Phoenix Canonical
PostgreSQL as its system-of-record boundary. A new Compass may not create an
independent family/person/consent database.
