/** Validate configuration without returning credentials in errors. Connections stay lazy for builds. */
export function requireDatabaseUrl(value: string | undefined): string {
  if (!value?.trim())
    throw new Error(
      "DATABASE_URL is required. Configure the Supabase PostgreSQL connection string.",
    );
  const message =
    "DATABASE_URL must be a valid PostgreSQL connection URL with a host and database name.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (
    value !== value.trim() ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2 ||
    url.hash
  ) {
    throw new Error(message);
  }
  return value;
}

