import { CUSTOMER_TYPES } from '../config/balance';
import type { CustomerType, CustomerTypeId } from './types';

/** All cosmetic customer variants. */
export const customerTypes: readonly CustomerType[] = CUSTOMER_TYPES;

/** Fast lookup by id. */
export const customerTypeById: ReadonlyMap<CustomerTypeId, CustomerType> = new Map(
  CUSTOMER_TYPES.map((c) => [c.id, c]),
);
