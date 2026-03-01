import { z } from "zod";
import { USER_ROLE_OPTIONS } from "./user.constant";
import {
  UserDTOSchema,
  CreateUserDTOSchema,
  UpdateUserDTOSchema,
} from "./user.schema";

export type UserRoleEnum = (typeof USER_ROLE_OPTIONS)[number]["value"];

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type CreateUserDTO = z.infer<typeof CreateUserDTOSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserDTOSchema>;
