export const buildUpdate = (
  data: Record<string, unknown>,
  allowedFields: string[]
): { fields: string[]; values: unknown[] } => {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }

  return { fields, values };
};

export const getPagination = (
  query: Record<string, unknown>,
  defaultLimit = 50,
  maxLimit = 200
): { page: number; limit: number; offset: number } => {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? defaultLimit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};
