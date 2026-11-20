import { randomBytes } from 'node:crypto'
import { id } from './cluster.mjs'

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const publicId = (prefix,value) => `${prefix}_${id(value).replaceAll('-','')}`

export const fixtureIds = Object.freeze({
  admin: id(9000),
  people: { multi: id(1), partnerB: id(2), auxiliary: id(3), teacher: id(4) },
  principals: { multi: id(201), partnerB: id(202), auxiliary: id(203), teacher: id(204) },
  families: { a: id(100), b: id(101) },
  familyMemberships: { a: id(1100), b: id(1101) },
  organizations: {
    hq: id(500), partnerA: id(501), partnerB: id(502),
    channelD: id(503), channel: id(504), channelE: id(505)
  },
  memberships: {
    hq: id(1500), partnerA: id(1501), partnerB: id(1502),
    channelD: id(1503), channel: id(1504), channelE: id(1505), teacher: id(1506)
  },
  bindings: {
    founder: id(1600), hqStaff: id(1601), partnerA: id(1602),
    partnerAStaff: id(1603), partnerB: id(1604), familyA: id(1605),
    familyB: id(1606), channelD: id(1607), channel: id(1608), channelE: id(1609),
    partnerBStaff: id(1610), teacher: id(1611)
  },
  projects: { hq: id(1800), partnerA: id(1801), partnerB: id(1802) },
  assignments: { hq: id(1900), partnerA: id(1901), partnerBMulti: id(1902), partnerBOwner: id(1903) }
})

export function asWorkspaceAdmin(db, statements) {
  const request = id(9999)
  return db.sql(`
    SELECT auth.bind_context(${quote(fixtureIds.admin)},NULL,NULL,'INTERNAL',
      clock_timestamp()+interval '5 minutes',${quote(request)});
    ${statements}
    SELECT auth.clear_context();
  `)
}

export function seedWorkspaceAuthorization(db) {
  const passwords = Object.freeze({
    app: randomBytes(32).toString('hex'),
    binder: randomBytes(32).toString('hex'),
    legacyApp: randomBytes(32).toString('hex'),
    legacyBinder: randomBytes(32).toString('hex'),
    rebindProbe: randomBytes(32).toString('hex')
  })
  db.sql(`
    CREATE ROLE workspace_test_app LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS PASSWORD ${quote(passwords.app)};
    CREATE ROLE workspace_test_binder LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS PASSWORD ${quote(passwords.binder)};
    CREATE ROLE workspace_legacy_app LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS PASSWORD ${quote(passwords.legacyApp)};
    CREATE ROLE workspace_legacy_binder LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS PASSWORD ${quote(passwords.legacyBinder)};
    CREATE ROLE workspace_context_rebind_probe LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS PASSWORD ${quote(passwords.rebindProbe)};
    GRANT CONNECT ON DATABASE phoenix_canonical_dev TO workspace_test_app,
      workspace_test_binder,workspace_legacy_app,workspace_legacy_binder,
      workspace_context_rebind_probe;
    GRANT phoenix_canonical_workspace_reader TO workspace_test_app
      WITH INHERIT FALSE,SET TRUE;
    GRANT USAGE ON SCHEMA auth TO workspace_test_binder;
    GRANT EXECUTE ON FUNCTION
      auth.list_available_workspaces(uuid,uuid),
      auth.rotate_workspace_session(uuid,uuid,text,text,timestamptz,uuid),
      auth.issue_workspace_context_ticket(uuid,text,text,timestamptz,uuid,uuid),
      auth.revoke_workspace_sessions(uuid,text,uuid)
    TO workspace_test_binder;
    GRANT phoenix_canonical_app TO workspace_legacy_app WITH INHERIT FALSE,SET TRUE;
    GRANT phoenix_canonical_context_binder TO workspace_legacy_binder
      WITH INHERIT FALSE,SET TRUE;
    GRANT phoenix_canonical_workspace_reader,phoenix_canonical_app
      TO workspace_context_rebind_probe WITH INHERIT FALSE,SET TRUE;

    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label)
    VALUES(${quote(fixtureIds.admin)},NULL,'SERVICE','ACTIVE','canonical_workspace_admin_v1');
    INSERT INTO core.people(person_id,display_name) VALUES
      (${quote(fixtureIds.people.multi)},'Synthetic Multi-role Person'),
      (${quote(fixtureIds.people.partnerB)},'Synthetic Channel B Person'),
      (${quote(fixtureIds.people.auxiliary)},'Synthetic Channel E Person'),
      (${quote(fixtureIds.people.teacher)},'Synthetic Teacher Person');
    INSERT INTO auth.principals(principal_id,person_id,principal_kind,status) VALUES
      (${quote(fixtureIds.principals.multi)},${quote(fixtureIds.people.multi)},'FAMILY','ACTIVE'),
      (${quote(fixtureIds.principals.partnerB)},${quote(fixtureIds.people.partnerB)},'ADVISOR','ACTIVE'),
      (${quote(fixtureIds.principals.auxiliary)},${quote(fixtureIds.people.auxiliary)},'CHANNEL','ACTIVE');
    INSERT INTO core.families(family_id,display_name) VALUES
      (${quote(fixtureIds.families.a)},'Synthetic Family A'),
      (${quote(fixtureIds.families.b)},'Synthetic Family B');
    INSERT INTO core.family_memberships(
      membership_id,family_id,person_id,membership_role,valid_from
    ) VALUES
      (${quote(fixtureIds.familyMemberships.a)},${quote(fixtureIds.families.a)},
        ${quote(fixtureIds.people.multi)},'PRIMARY',clock_timestamp()-interval '1 day'),
      (${quote(fixtureIds.familyMemberships.b)},${quote(fixtureIds.families.b)},
        ${quote(fixtureIds.people.partnerB)},'PRIMARY',clock_timestamp()-interval '1 day');
    INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id) VALUES
      ('FAMILY',${quote(publicId('fam',100))},${quote(fixtureIds.families.a)}),
      ('FAMILY',${quote(publicId('fam',101))},${quote(fixtureIds.families.b)});

    INSERT INTO core.organizations(
      organization_id,legal_name,display_name,organization_type,country_code,
      status,created_by_principal_id,updated_by_principal_id
    ) VALUES
      (${quote(fixtureIds.organizations.hq)},'Synthetic Phoenix Headquarters Ltd','Synthetic HQ',
        'ENTERPRISE','CN','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.organizations.partnerA)},'Synthetic Channel A Ltd','Synthetic Channel A',
        'PARTNER_ORGANIZATION','CN','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.organizations.partnerB)},'Synthetic Channel B Ltd','Synthetic Channel B',
        'PARTNER_ORGANIZATION','HK','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.organizations.channelD)},'Synthetic Channel D Ltd','Synthetic Channel D',
        'PARTNER_ORGANIZATION','SG','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.organizations.channel)},'Synthetic Channel Ltd','Synthetic Channel',
        'PARTNER_ORGANIZATION','MY','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.organizations.channelE)},'Synthetic Channel E Ltd','Synthetic Channel E',
        'PARTNER_ORGANIZATION','JP','ACTIVE',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)});
    INSERT INTO integration.public_ids(entity_kind,public_id,canonical_id) VALUES
      ('ORGANIZATION',${quote(publicId('org',500))},${quote(fixtureIds.organizations.hq)}),
      ('ORGANIZATION',${quote(publicId('org',501))},${quote(fixtureIds.organizations.partnerA)}),
      ('ORGANIZATION',${quote(publicId('org',502))},${quote(fixtureIds.organizations.partnerB)}),
      ('ORGANIZATION',${quote(publicId('org',503))},${quote(fixtureIds.organizations.channelD)}),
      ('ORGANIZATION',${quote(publicId('org',504))},${quote(fixtureIds.organizations.channel)}),
      ('ORGANIZATION',${quote(publicId('org',505))},${quote(fixtureIds.organizations.channelE)});

    INSERT INTO crm.clients(
      client_id,family_id,client_code,lifecycle_status,relationship_started_at,
      created_by_principal_id,updated_by_principal_id
    ) VALUES
      (${quote(id(1700))},${quote(fixtureIds.families.a)},'SYN_WORKSPACE_CLIENT_A','ACTIVE',
        clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(id(1701))},${quote(fixtureIds.families.b)},'SYN_WORKSPACE_CLIENT_B','ACTIVE',
        clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)});
    INSERT INTO service.projects(
      service_project_id,client_id,family_id,project_code,project_name,project_status,
      primary_domain,created_by_principal_id,updated_by_principal_id
    ) VALUES
      (${quote(fixtureIds.projects.hq)},${quote(id(1700))},${quote(fixtureIds.families.a)},
        'SYN_WS_HQ','Synthetic HQ Project','ACTIVE','EDUCATION',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.projects.partnerA)},${quote(id(1700))},${quote(fixtureIds.families.a)},
        'SYN_WS_PARTNER_A','Synthetic Channel A Project','ACTIVE','IDENTITY',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.projects.partnerB)},${quote(id(1701))},${quote(fixtureIds.families.b)},
        'SYN_WS_PARTNER_B','Synthetic Channel B Project','ACTIVE','WEALTH',${quote(fixtureIds.admin)},${quote(fixtureIds.admin)});
    INSERT INTO service.project_assignments(
      project_assignment_id,service_project_id,principal_id,assignment_role,status,
      valid_from,assigned_by_principal_id
    ) VALUES
      (${quote(fixtureIds.assignments.hq)},${quote(fixtureIds.projects.hq)},${quote(fixtureIds.principals.multi)},
        'PROJECT_MANAGER','ACTIVE',clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.assignments.partnerA)},${quote(fixtureIds.projects.partnerA)},${quote(fixtureIds.principals.multi)},
        'SPECIALIST','ACTIVE',clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.assignments.partnerBMulti)},${quote(fixtureIds.projects.partnerB)},${quote(fixtureIds.principals.multi)},
        'OBSERVER','ACTIVE',clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)}),
      (${quote(fixtureIds.assignments.partnerBOwner)},${quote(fixtureIds.projects.partnerB)},${quote(fixtureIds.principals.partnerB)},
        'PROJECT_MANAGER','ACTIVE',clock_timestamp()-interval '1 day',${quote(fixtureIds.admin)});
  `)

  const profileRows = [
    ['hq','HEADQUARTERS','PHX_HQ'],['partnerA','CHANNEL','PHX_CHANNEL_A'],
    ['partnerB','CHANNEL','PHX_CHANNEL_B'],['channelD','CHANNEL','PHX_CHANNEL_D'],
    ['channel','CHANNEL','PHX_CHANNEL_C'],['channelE','CHANNEL','PHX_CHANNEL_E']
  ]
  const memberRows = [
    ['hq','hq','multi'],['partnerA','partnerA','multi'],['partnerB','partnerB','partnerB'],
    ['channelD','channelD','auxiliary'],['channel','channel','auxiliary'],
    ['channelE','channelE','auxiliary'],['teacher','hq','teacher']
  ]
  const bindingRows = [
    ['founder','multi','hq',null,'FOUNDER','FOUNDER'],
    ['hqStaff','multi','hq',null,'STAFF','STAFF_ADMIN'],
    ['partnerA','multi','partnerA',null,'CHANNEL','CHANNEL_ADMIN'],
    ['partnerAStaff','multi','partnerA',null,'STAFF','STAFF_ADVISOR'],
    ['partnerB','partnerB','partnerB',null,'CHANNEL','CHANNEL_ADMIN'],
    ['partnerBStaff','partnerB','partnerB',null,'STAFF','STAFF_VIEWER'],
    ['familyA','multi',null,'a','FAMILY','FAMILY_PRIMARY'],
    ['familyB','partnerB',null,'b','FAMILY','FAMILY_PRIMARY'],
    ['channelD','auxiliary','channelD',null,'CHANNEL','CHANNEL_ADMIN'],
    ['channel','auxiliary','channel',null,'CHANNEL','CHANNEL_MEMBER'],
    ['channelE','auxiliary','channelE',null,'CHANNEL','CHANNEL_MEMBER'],
    ['teacher','teacher','teacher',null,'STAFF','STAFF_TEACHER']
  ]
  const checked = (expression,label) => `DO $checked$ BEGIN IF (${expression}) IS NOT TRUE THEN RAISE EXCEPTION ${quote(label)}; END IF; END $checked$;`
  const statements = [
    checked(`learning.register_teacher(${quote(fixtureIds.people.teacher)})`,'TEACHER_REGISTRATION_FAILED'),
    checked(`learning.register_staff_principal(${quote(fixtureIds.principals.teacher)},${quote(fixtureIds.people.teacher)},'TEACHER')`,'TEACHER_PRINCIPAL_REGISTRATION_FAILED')
  ]
  for (const [key,kind,code] of profileRows) {
    statements.push(checked(`core.register_workspace_organization_profile(${quote(fixtureIds.organizations[key])},${quote(kind)},${quote(code)})`,`PROFILE_${key}_FAILED`))
  }
  for (const [membershipKey,organizationKey,personKey] of memberRows) {
    statements.push(checked(`core.invite_organization_member(${quote(fixtureIds.memberships[membershipKey])},${quote(fixtureIds.organizations[organizationKey])},${quote(fixtureIds.people[personKey])},clock_timestamp()+interval '7 days')`,`INVITE_${membershipKey}_FAILED`))
    statements.push(checked(`core.accept_organization_membership(${quote(fixtureIds.memberships[membershipKey])},${quote(fixtureIds.people[personKey])})`,`ACCEPT_${membershipKey}_FAILED`))
  }
  for (const [bindingKey,principalKey,membershipKey,familyKey,kind,role] of bindingRows) {
    statements.push(checked(`auth.assign_workspace_role(${quote(fixtureIds.bindings[bindingKey])},${quote(fixtureIds.principals[principalKey])},${membershipKey ? quote(fixtureIds.memberships[membershipKey]) : 'NULL'},${familyKey ? quote(fixtureIds.familyMemberships[familyKey]) : 'NULL'},${quote(kind)},${quote(role)},NULL)`,`BINDING_${bindingKey}_FAILED`))
  }
  for (const [assignmentKey,organizationKey] of [['hq','hq'],['partnerA','partnerA'],['partnerBMulti','partnerB'],['partnerBOwner','partnerB']]) {
    statements.push(checked(`service.scope_project_assignment_to_organization(${quote(fixtureIds.assignments[assignmentKey])},${quote(fixtureIds.organizations[organizationKey])})`,`SCOPE_${assignmentKey}_FAILED`))
  }
  asWorkspaceAdmin(db,statements.join('\n'))
  return passwords
}
