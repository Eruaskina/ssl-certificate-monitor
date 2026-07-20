export function isDNSZoneFormat(text: string): boolean {
  const lines = text.split(/\r?\n/).slice(0, 30); // inspect first 30 lines
  let hasComments = false;
  let hasSOAorNS = false;
  let hasRecordType = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(";")) {
      hasComments = true;
    }
    if (/\b(?:SOA|NS|MX|TXT|SRV)\b/i.test(trimmed)) {
      hasSOAorNS = true;
    }
    if (/\s+(?:A|AAAA|CNAME)\s+/i.test(trimmed)) {
      hasRecordType = true;
    }
  }

  return (hasComments && (hasSOAorNS || hasRecordType)) || text.includes("$ORIGIN");
}

export function parseDNSZone(text: string): { origin: string | null; domains: string[] } {
  const lines = text.split(/\r?\n/);
  let origin: string | null = null;
  const records: { name: string; type: string; value: string }[] = [];

  // 1. Try to find the origin domain from comments like "zone asiselektronik.com.tr"
  for (const line of lines) {
    const zoneMatch = line.match(/(?:in zone|scope in zone|zone)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/i);
    if (zoneMatch) {
      origin = zoneMatch[1].trim().replace(/\.$/, "");
      break;
    }
  }

  // 2. Try to find the origin from $ORIGIN
  if (!origin) {
    for (const line of lines) {
      const originMatch = line.match(/^\$ORIGIN\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})/i);
      if (originMatch) {
        origin = originMatch[1].trim().replace(/\.$/, "");
        break;
      }
    }
  }

  // 3. Try to guess origin from absolute domains ending with "." (excluding .local or .lan)
  if (!origin) {
    for (const line of lines) {
      if (line.trim().startsWith(";")) continue;
      const dotMatches = line.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,12})\./g);
      if (dotMatches) {
        for (const m of dotMatches) {
          const cleaned = m.replace(/\.$/, "");
          if (
            cleaned &&
            !cleaned.endsWith(".local") &&
            !cleaned.endsWith(".lan") &&
            !cleaned.endsWith(".localdomain") &&
            cleaned.includes(".")
          ) {
            // Find the base domain
            const parts = cleaned.split(".");
            if (parts.length >= 2) {
              const suffix = parts.slice(-2).join(".");
              if (
                suffix.includes("com.tr") ||
                suffix.includes("net.tr") ||
                suffix.includes("org.tr") ||
                suffix.includes("gov.tr") ||
                suffix.includes("co.uk")
              ) {
                origin = parts.slice(-3).join(".");
              } else {
                origin = parts.slice(-2).join(".");
              }
              break;
            }
          }
        }
      }
      if (origin) break;
    }
  }

  // 4. Fallback if still no origin found: check if there's an SOA line
  if (!origin) {
    for (const line of lines) {
      if (line.includes("SOA")) {
        const parts = line.trim().split(/\s+/);
        for (const p of parts) {
          if (p.includes(".") && !p.endsWith(".local") && !p.endsWith(".lan")) {
            const cleaned = p.replace(/\.$/, "");
            const bits = cleaned.split(".");
            if (bits.length >= 2) {
              origin = bits.slice(-2).join(".");
              break;
            }
          }
        }
      }
      if (origin) break;
    }
  }

  // Parse A, AAAA, and CNAME records
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const typeIndex = parts.findIndex((p) => {
        const up = p.toUpperCase();
        return up === "A" || up === "AAAA" || up === "CNAME";
      });

      if (typeIndex > 0) {
        const name = parts[0];
        const type = parts[typeIndex].toUpperCase();
        const value = parts.slice(typeIndex + 1).join(" ");
        records.push({ name, type, value });
      }
    }
  }

  const domains: string[] = [];
  if (origin) {
    for (const rec of records) {
      if (rec.name === "@") {
        domains.push(origin);
      } else if (rec.name === "*") {
        domains.push(`*.${origin}`);
      } else {
        domains.push(`${rec.name}.${origin}`);
      }
    }
  } else {
    for (const rec of records) {
      if (rec.name && rec.name !== "@" && rec.name !== "*" && rec.name.includes(".")) {
        domains.push(rec.name);
      }
      if (rec.type === "CNAME" && rec.value) {
        const cleanedVal = rec.value.replace(/\.$/, "");
        if (cleanedVal.includes(".") && !cleanedVal.endsWith(".local") && !cleanedVal.endsWith(".lan")) {
          domains.push(cleanedVal);
        }
      }
    }
  }

  return {
    origin,
    domains: Array.from(new Set(domains)).map((d) => d.replace(/\.$/, "").toLowerCase()),
  };
}

export function getRootDomain(domain: string): string {
  const clean = domain.trim().toLowerCase().replace(/^\*\./, "");
  const parts = clean.split(".");
  if (parts.length <= 2) return clean;

  const suffix = parts.slice(-2).join(".");
  if (
    suffix.endsWith("com.tr") ||
    suffix.endsWith("net.tr") ||
    suffix.endsWith("org.tr") ||
    suffix.endsWith("gov.tr") ||
    suffix.endsWith("co.uk") ||
    suffix.endsWith("co.jp") ||
    suffix.endsWith("com.br")
  ) {
    if (parts.length >= 3) {
      return parts.slice(-3).join(".");
    }
  }
  return parts.slice(-2).join(".");
}

export function parseCSV(text: string): string[] {
  if (isDNSZoneFormat(text)) {
    const res = parseDNSZone(text);
    return res.domains;
  }

  const lines = text.split(/\r?\n/);
  const domains: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // split by comma or semicolon
    const cells = line.split(/[;,]/);
    for (const cell of cells) {
      const cleaned = cell.trim().replace(/^["']|["']$/g, ""); // strip quotes
      // Check if it looks like a domain name
      if (cleaned && (cleaned.includes(".") || cleaned === "localhost")) {
        domains.push(cleaned);
      }
    }
  }
  return domains;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "valid":
      return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    case "expired":
      return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
    case "expiring_soon":
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    case "invalid_chain":
      return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
    case "connection_failed":
      return "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
  }
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A+":
    case "A":
      return "bg-emerald-500 text-white shadow-emerald-500/20";
    case "B":
      return "bg-teal-500 text-white shadow-teal-500/20";
    case "C":
      return "bg-amber-500 text-white shadow-amber-500/20";
    case "D":
      return "bg-orange-500 text-white shadow-orange-500/20";
    case "F":
      return "bg-rose-500 text-white shadow-rose-500/20";
    default:
      return "bg-zinc-500 text-white";
  }
}
