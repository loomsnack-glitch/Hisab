import { z } from "zod";
import { USER_ROLE_OPTIONS, USER_CONSTANTS } from "./user.constant";

const userRoleValues = USER_ROLE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const UserDTOSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  storeId: z.uuid().nullable().optional(),
  role: z.enum(userRoleValues),
  name: z.string().min(1).max(USER_CONSTANTS.MAX_NAME_LENGTH),
  email: z.email().max(USER_CONSTANTS.MAX_EMAIL_LENGTH).nullable().optional(),
  phone: z.string().max(USER_CONSTANTS.MAX_PHONE_LENGTH).nullable().optional(),
  pinHash: z.string().nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateUserDTOSchema = UserDTOSchema.omit({
  id: true,
  pinHash: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  pin: z.string().min(4).max(6).optional(),
  password: z.string().min(6).optional(),
});

export const UpdateUserDTOSchema = UserDTOSchema.omit({
  id: true,
  organizationId: true,
  pinHash: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  pin: z.string().min(4).max(6).optional(),
  password: z.string().min(6).optional(),
});
