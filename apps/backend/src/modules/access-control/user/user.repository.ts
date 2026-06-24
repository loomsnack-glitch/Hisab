import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type { CreateUserREPO, UserDTO } from "@repo/types";

export const createUser = async (userData: CreateUserREPO, tx?: Bun.TransactionSQL): Promise<UserDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO users ${camelToSnakeSql(userData)}
        RETURNING *
    `;

    return result ? snakeToCamel(result) : null;
};

export const getUserById = async (id: string): Promise<UserDTO | null> => {
    const [result] = await pg`
        SELECT * FROM users WHERE id = ${id}
    `;

    return result ? snakeToCamel(result) : null;
};

export const getUserByPhone = async (phone: string): Promise<UserDTO | null> => {
    const [result] = await pg`
        SELECT * FROM users WHERE phone = ${phone}
    `;

    return result ? snakeToCamel(result) : null;
};

export const getUserByEmail = async (email: string): Promise<UserDTO | null> => {
    const [result] = await pg`
        SELECT * FROM users WHERE email = ${email}
    `;

    return result ? snakeToCamel(result) : null;
};
