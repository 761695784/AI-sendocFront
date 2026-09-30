/** Rôle d'un membre dans une structure (commissariat, brigade, direction…). */
export type MembershipRole = 'institution_admin' | 'structure_manager' | 'agent';

/** Niveau d'une organisation dans l'arborescence. */
export type OrganizationLevel = 'institution' | 'intermediate' | 'structure';

/** Affectation d'un utilisateur à une structure (réponse de GET /api/v2/me/organizations). */
export interface Membership {
  membership_uuid: string;
  role: MembershipRole;
  is_primary: boolean;
  matricule?: string | null;
  /** Droits accordés par ce rôle (ex. « matches.review »). Absents dans la réponse de /login. */
  abilities?: string[];
  organization: {
    uuid: string;
    name: string;
    type?: string;
    level?: OrganizationLevel;
  };
}

/** Utilisateur tel que renvoyé par l'API (champs V1 conservés). */
export interface SessionUser {
  id: number;
  uuid?: string;
  FirstName?: string;
  LastName?: string;
  email?: string;
  Phone?: string;
  account_type?: string;
  roles?: Array<string | { name?: string }>;
  [key: string]: unknown;
}

/** Réponse de POST /api/login (et /api/verify-email, qui renvoie access_token). */
export interface LoginResponse {
  success?: boolean;
  token?: string;
  access_token?: string;
  user: SessionUser;
  roles?: string[];
  organizations?: Membership[];
}

/** Réponse de GET /api/v2/me/organizations. */
export interface MeOrganizationsResponse {
  account_type: string | null;
  is_super_admin: boolean;
  active_organization: string | null;
  memberships: Membership[];
}

/** Libellés français des rôles de structure. */
export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  institution_admin: "Administrateur d'institution",
  structure_manager: 'Responsable de structure',
  agent: 'Agent',
};
