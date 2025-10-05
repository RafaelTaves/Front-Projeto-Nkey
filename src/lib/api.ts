import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEYS = {
  token: "token",
  apiKey: "api_key",
  tokenType: "token_type",
} as const;

// ===== Tipos
export type LoginResponse = {
  access_token: string;
  token_type?: string;
  api_key?: string;
};

export type AuthSnapshot = {
  accessToken: string;
  tokenType?: string;
  apiKey?: string;
};

export type MatchParams = {
  file: File;                        // entrada.xlsx
  descCol: string;                   // ex: "Descrição do Material"
  unitCol?: string;                  // ex: "unid"
  extraNumCols?: string[];           // ex: ["Diâmetro", "Comprimento (m)"]
  rerankTopK?: number;               // ex: 15
  crossEncoderModel?: string;        // ex: "cross-encoder/ms-marco-MiniLM-L-6-v2"
  path?: string;                     // default: "/match"
};


export type MatchResult = {
  blob: Blob;                        // ZIP retornado
  filename: string;                  // nome sugerido (se vier no header)
  contentType: string | null;        // content-type do response
};

// ===== Instância Axios
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ===== Helpers de Auth (localStorage)
export function setAuth(auth: AuthSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.token, auth.accessToken);
  if (auth.apiKey) localStorage.setItem(STORAGE_KEYS.apiKey, auth.apiKey);
  localStorage.setItem(
    STORAGE_KEYS.tokenType,
    (auth.tokenType ?? "bearer").toLowerCase()
  );
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  localStorage.removeItem(STORAGE_KEYS.tokenType);
}

export function getAuth(): AuthSnapshot | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(STORAGE_KEYS.token);
  if (!accessToken) return null;
  const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) || undefined;
  const tokenType =
    localStorage.getItem(STORAGE_KEYS.tokenType)?.toLowerCase() || "bearer";
  return { accessToken, apiKey, tokenType };
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!getAuth()?.accessToken;
}

// ===== Interceptors (apenas no browser)
if (typeof window !== "undefined") {
  // Adiciona Authorization automaticamente
  api.interceptors.request.use((config) => {
    const auth = getAuth();
    if (auth?.accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `${auth.tokenType ?? "bearer"} ${auth.accessToken}`;
    }
    return config;
  });

  // Trata 401 globalmente
  api.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        clearAuth();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );
}

// ===== Funções de Login e Auth
export async function loginPasswordGrant(
  username: string,
  password: string,
  opts?: {
    scope?: string;
    clientId?: string;
    clientSecret?: string;
    path?: string; // ex: "/login" (default) ou "/token"
  }
): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.append("grant_type", "password");
  form.append("username", username);
  form.append("password", password);
  form.append("scope", opts?.scope ?? "");
  form.append("client_id", opts?.clientId ?? "");
  form.append("client_secret", opts?.clientSecret ?? "");

  const path = opts?.path ?? "/login";

  const { data } = await api.post<LoginResponse>(path, form, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return data;
}

async function request(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // sessão inválida/expirada → limpa e deixa quem chamou decidir redirecionar
    clearToken();
  }
  return res;
}

export async function verifySession(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/verify-token/${token}`;
  try {
    const res = await request(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// ====== Upload ZIP e obter resultado
export async function postMatch(params: MatchParams): Promise<MatchResult> {
  const {
    file,
    descCol,
    unitCol = "",
    extraNumCols = [],
    rerankTopK,
    crossEncoderModel,
    path = "/match",
  } = params;

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("desc_col", descCol);
  form.append("unit_col", unitCol);
  if (extraNumCols.length > 0) {
    // o curl usa vírgula como separador
    form.append("extra_num_cols", extraNumCols.join(","));
  }
  if (typeof rerankTopK === "number") {
    form.append("rerank_top_k", String(rerankTopK));
  }
  if (crossEncoderModel) {
    form.append("cross_encoder_model", crossEncoderModel);
  }

  const resp = await api.post<Blob>(path, form, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob", // importante para baixar o zip
  });

  // tenta extrair filename do Content-Disposition
  const dispo =
    (resp.headers as any)["content-disposition"] ||
    (resp.headers as any)["Content-Disposition"];
  let filename = "resultado.zip";
  if (typeof dispo === "string") {
    const m = dispo.match(/filename\*?=(?:UTF-8''|")?([^;"']+)/i);
    if (m?.[1]) filename = decodeURIComponent(m[1].replace(/"/g, ""));
  }

  const contentType =
    (resp.headers as any)["content-type"] ||
    (resp.headers as any)["Content-Type"] ||
    null;

  return { blob: resp.data, filename, contentType };
}

// Helper para baixar Blob (ex: ZIP)
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
