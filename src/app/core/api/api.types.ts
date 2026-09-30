import type { components, paths } from './schema';

/**
 * Types de l'API V2, générés depuis la spécification OpenAPI de l'API
 * (`npm run api:types`). Quand l'API change, on régénère : le compilateur
 * signale alors tous les écrans à adapter.
 */
export type ApiPaths = paths;
export type ApiSchemas = components['schemas'];

export type Organization = ApiSchemas['Organization'];
export type OrganizationRef = ApiSchemas['OrganizationRef'];
export type Citizen = ApiSchemas['Citizen'];
export type Declaration = ApiSchemas['Declaration'];
export type DeclarationItem = ApiSchemas['DeclarationItem'];
export type FoundDocument = ApiSchemas['FoundDocument'];
export type Match = ApiSchemas['Match'];
export type Collection = ApiSchemas['Collection'];
export type Transition = ApiSchemas['Transition'];
export type Restitution = ApiSchemas['Restitution'];
export type Charge = ApiSchemas['Charge'];
export type ChargeShort = ApiSchemas['ChargeShort'];
export type PriceRule = ApiSchemas['PriceRule'];
export type DocumentTag = ApiSchemas['DocumentTag'];
export type InboxMessage = ApiSchemas['InboxMessage'];
export type Report = ApiSchemas['Report'];
export type VigilanceAlert = ApiSchemas['VigilanceAlert'];
export type OcrScan = ApiSchemas['OcrScan'];
export type OcrField = ApiSchemas['OcrField'];
export type AssistantReply = ApiSchemas['AssistantReply'];
export type Verification = ApiSchemas['Verification'];
export type ApiError = ApiSchemas['Error'];
export type ApiValidationError = ApiSchemas['ValidationError'];

/** Liste paginée à la façon de Laravel (`->paginate()`). */
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

/** Paramètres de requête simples (les valeurs vides sont ignorées). */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;
