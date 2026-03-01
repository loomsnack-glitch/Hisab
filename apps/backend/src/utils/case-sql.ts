import { sql } from "bun";
import { camelToSnake } from "./case";

export function camelToSnakeSql(input: any, ...props: string[]) {
    return sql(camelToSnake(input), ...props);
}