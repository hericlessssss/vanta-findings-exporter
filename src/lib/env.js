import { readFile } from "node:fs/promises";

export async function loadEnvFile(path = ".env") {
  let content;

  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }

  return parseEnv(content);
}

export function parseEnv(content) {
  return content.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return env;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    env[key] = unquote(value);
    return env;
  }, {});
}

export async function loadVantaConfig() {
  const fileEnv = await loadEnvFile();

  const config = {
    clientId: process.env.VANTA_CLIENT_ID ?? fileEnv.VANTA_CLIENT_ID,
    clientSecret: process.env.VANTA_CLIENT_SECRET ?? fileEnv.VANTA_CLIENT_SECRET,
    scope: process.env.VANTA_API_SCOPE ?? fileEnv.VANTA_API_SCOPE ?? "vanta-api.all:read",
    apiBaseUrl: process.env.VANTA_API_BASE_URL ?? fileEnv.VANTA_API_BASE_URL ?? "https://api.vanta.com",
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Missing VANTA_CLIENT_ID or VANTA_CLIENT_SECRET.");
  }

  return config;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

