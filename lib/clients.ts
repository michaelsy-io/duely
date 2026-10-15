import profiles from "@/data/seed/client_profiles.json";

export interface ClientProfile {
  client_code: string;
  name: string;
  segment: string;
  area: string;
  contact_person: string;
  contact_role: string;
  phone: string;
  email: string;
  demo: boolean;
}

const MAP = (profiles as { clients: Record<string, ClientProfile> }).clients;

export function clientProfile(code: string): ClientProfile | undefined {
  return MAP[code];
}

export function allClients(): ClientProfile[] {
  return Object.values(MAP).sort((a, b) => a.client_code.localeCompare(b.client_code));
}

export function clientName(code: string): string {
  return MAP[code]?.name ?? code;
}

const STOP = new Set(["of", "the", "and", "&", "st.", "st"]);

export function initials(nameOrCode: string): string {
  const name = MAP[nameOrCode]?.name ?? nameOrCode;
  const words = name.split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  const s = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "");
  return s.toUpperCase();
}

/** Avatar colours come from the theme tokens --avatar-N-bg / --avatar-N-fg (N = 0..7). */
export function avatarColor(code: string): { bg: string; fg: string } {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = h % 8;
  return { bg: `var(--avatar-${n}-bg)`, fg: `var(--avatar-${n}-fg)` };
}
