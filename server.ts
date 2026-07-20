import express from "express";
import path from "path";
import fs from "fs";
import tls from "tls";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

const DATA_DIR = path.join(process.cwd(), "data");
const MONITORS_FILE_PATH = path.join(DATA_DIR, "monitors.json");

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_MONITORS = [
  {
    id: "1",
    domain: "google.com",
    subdomainScanEnabled: true,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "2",
    domain: "github.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "3",
    domain: "expired.badssl.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
  {
    id: "4",
    domain: "self-signed.badssl.com",
    subdomainScanEnabled: false,
    addedAt: new Date().toISOString(),
    lastResult: null,
  },
];

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json({ limit: "10mb" }));

// Helper to clean domain inputs
function cleanDomain(input: string): string {
  let domain = input.trim();
  // Strip http:// or https:// if present
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");
  // Split paths and queries
  domain = domain.split("/")[0];
  // Split ports
  domain = domain.split(":")[0];
  return domain.toLowerCase();
}

// DNS Resolution
function resolveDomainIP(domain: string): Promise<string | null> {
  const lookupDomain = domain.startsWith("*.") ? domain.substring(2) : domain;
  return new Promise((resolve) => {
    dns.lookup(lookupDomain, (err, address) => {
      if (err) resolve(null);
      else resolve(address);
    });
  });
}

// Subdomain DNS Discovery helper
function resolveSubdomainIP(subdomain: string, domain: string): Promise<string | null> {
  const fqdn = `${subdomain}.${domain}`;
  return new Promise((resolve) => {
    dns.resolve(fqdn, "A", (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        resolve(addresses[0]);
      } else {
        dns.lookup(fqdn, (lookupErr, address) => {
          if (!lookupErr && address) {
            resolve(address);
          } else {
            resolve(null);
          }
        });
      }
    });
  });
}

// Fetch SSL Certificate details using Node.js TLS
function fetchSSLDetails(host: string, port = 443): Promise<any> {
  const connectHost = host.startsWith("*.") ? host.substring(2) : host;
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: connectHost,
        port,
        servername: connectHost, // SNI support is vital
        rejectUnauthorized: false, // Don't fail connection on expired or untrusted certs
      },
      () => {
        const cert = socket.getPeerCertificate(true); // Gathers the full certificate chain
        socket.destroy();
        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error("No SSL certificate returned from host"));
        } else {
          resolve(cert);
        }
      }
    );

    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });

    socket.setTimeout(5000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timed out after 5 seconds"));
    });
  });
}

// Recursive helper to build chain of trust
function parseCertChain(cert: any): any[] {
  const chain: any[] = [];
  let current = cert;
  const seenFingerprints = new Set<string>();

  while (current && current.fingerprint && !seenFingerprints.has(current.fingerprint)) {
    seenFingerprints.add(current.fingerprint);
    chain.push({
      subject: current.subject,
      issuer: current.issuer,
      valid_from: current.valid_from,
      valid_to: current.valid_to,
      fingerprint: current.fingerprint,
      fingerprint256: current.fingerprint256,
      serialNumber: current.serialNumber,
      bits: current.bits,
      pubkey: current.pubkey,
    });

    // Traverse upwards in the certificate hierarchy
    if (current.issuerCertificate && current.issuerCertificate.fingerprint !== current.fingerprint) {
      current = current.issuerCertificate;
    } else {
      break;
    }
  }
  return chain;
}

// Parse certificate fields cleanly
function parseCertificateDetails(cert: any): any {
  if (!cert || Object.keys(cert).length === 0) return null;

  const sanList: string[] = [];
  if (cert.subjectaltname) {
    const parts = cert.subjectaltname.split(",");
    for (const p of parts) {
      const match = p.trim().match(/^DNS:(.+)$/i);
      if (match) {
        sanList.push(match[1]);
      }
    }
  }

  const validTo = cert.valid_to;
  const expiryDate = new Date(validTo);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let keyType = "RSA";
  let keySize = cert.bits || 2048;

  if (cert.pubkey) {
    if (cert.pubkey.type) {
      keyType = cert.pubkey.type.toUpperCase();
    } else if (cert.asn1Curve || cert.nistCurve) {
      keyType = "EC";
    }
  }

  return {
    subject: {
      CN: cert.subject?.CN || "",
      O: cert.subject?.O || "",
      OU: cert.subject?.OU || "",
      L: cert.subject?.L || "",
      S: cert.subject?.S || "",
      C: cert.subject?.C || "",
    },
    issuer: {
      CN: cert.issuer?.CN || "",
      O: cert.issuer?.O || "",
      OU: cert.issuer?.OU || "",
      C: cert.issuer?.C || "",
    },
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    daysRemaining,
    serialNumber: cert.serialNumber,
    fingerprint: cert.fingerprint,
    fingerprint256: cert.fingerprint256,
    keyType,
    keySize,
    signatureAlgorithm: cert.signatureAlgorithm || "Unknown",
    sanList,
  };
}

// Grade calculation engine
function calculateSecurityGrade(certDetails: any, chain: any[]): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (!certDetails) return "F";
  const daysRemaining = certDetails.daysRemaining;
  
  if (daysRemaining <= 0) return "F";

  const isSelfSigned = certDetails.issuer && certDetails.subject &&
    (certDetails.issuer.CN === certDetails.subject.CN || certDetails.issuer.O === certDetails.subject.O) &&
    chain.length <= 1;

  if (isSelfSigned) return "D";

  const sigAlg = (certDetails.signatureAlgorithm || "").toLowerCase();
  if (sigAlg.includes("sha1") || sigAlg.includes("md5")) return "D";

  const keySize = certDetails.keySize;
  if (keySize && keySize < 2048) return "D";

  if (daysRemaining < 7) return "C";
  if (daysRemaining < 30) return "B";

  const isECDSA = (certDetails.keyType || "").toLowerCase().includes("ec");
  if (keySize && keySize >= 4096) return "A+";
  if (isECDSA) return "A+";

  return "A";
}

// Common list of subdomains for discovery (high coverage, performance optimized)
const COMMON_SUBDOMAINS = [
  "www",
  "mail",
  "blog",
  "api",
  "dev",
  "stage",
  "shop",
  "vpn",
  "app",
  "secure",
  "admin",
  "portal",
];

// Monitors Persistence Endpoints
app.get("/api/monitors", (req, res) => {
  try {
    if (!fs.existsSync(MONITORS_FILE_PATH)) {
      // Create initial file with defaults
      fs.writeFileSync(MONITORS_FILE_PATH, JSON.stringify(DEFAULT_MONITORS, null, 2), "utf-8");
      return res.json(DEFAULT_MONITORS);
    }
    const data = fs.readFileSync(MONITORS_FILE_PATH, "utf-8");
    try {
      const monitors = JSON.parse(data);
      res.json(Array.isArray(monitors) ? monitors : DEFAULT_MONITORS);
    } catch {
      res.json(DEFAULT_MONITORS);
    }
  } catch (err: any) {
    console.error("Error reading monitors file:", err);
    res.json(DEFAULT_MONITORS);
  }
});

app.post("/api/monitors", (req, res) => {
  try {
    const monitors = req.body;
    if (!Array.isArray(monitors)) {
      return res.status(400).json({ error: "Invalid data format. Expected an array of monitors." });
    }
    fs.writeFileSync(MONITORS_FILE_PATH, JSON.stringify(monitors, null, 2), "utf-8");
    res.json({ success: true, count: monitors.length });
  } catch (err: any) {
    console.error("Error writing monitors file:", err);
    res.status(500).json({ error: "Failed to save monitors data." });
  }
});

// Base Scan Endpoint
app.post("/api/scan", async (req, res) => {
  const { domain: rawDomain, discoverSubdomains } = req.body;

  if (!rawDomain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  const domain = cleanDomain(rawDomain);
  const scanTime = new Date().toISOString();

  try {
    const ipAddress = await resolveDomainIP(domain);
    if (!ipAddress) {
      return res.json({
        id: Math.random().toString(36).substring(7),
        domain,
        ipAddress: null,
        port: 443,
        status: "connection_failed",
        errorMessage: "DNS Resolution failed. Could not resolve host IP address.",
        securityGrade: "Unknown",
        certDetails: null,
        chain: [],
        subdomainsDiscovered: [],
        lastScanTime: scanTime,
      });
    }

    let certData: any = null;
    let chain: any[] = [];
    let certDetails: any = null;
    let status: "valid" | "expired" | "expiring_soon" | "invalid_chain" | "connection_failed" = "valid";
    let errorMessage: string | null = null;
    let grade: "A+" | "A" | "B" | "C" | "D" | "F" | "Unknown" = "Unknown";

    try {
      certData = await fetchSSLDetails(domain);
      chain = parseCertChain(certData);
      certDetails = parseCertificateDetails(certData);

      if (certDetails) {
        if (certDetails.daysRemaining <= 0) {
          status = "expired";
        } else if (certDetails.daysRemaining < 15) {
          status = "expiring_soon";
        } else {
          status = "valid";
        }
        grade = calculateSecurityGrade(certDetails, chain);
      }
    } catch (tlsErr: any) {
      status = "connection_failed";
      errorMessage = tlsErr.message || "Failed to establish TLS handshake.";
    }

    // Subdomain discovery if enabled
    const subdomainsDiscovered: any[] = [];
    if (discoverSubdomains && status !== "connection_failed") {
      const baseDomainForSubdomains = domain.startsWith("*.") ? domain.substring(2) : domain;
      // Parallel lookups of common subdomains
      const lookupPromises = COMMON_SUBDOMAINS.map(async (sub) => {
        const ip = await resolveSubdomainIP(sub, baseDomainForSubdomains);
        if (ip) {
          const fqdn = `${sub}.${baseDomainForSubdomains}`;
          let subStatus: any = "connection_failed";
          let subGrade: any = "Unknown";
          let subDaysRemaining = 0;

          try {
            const subCert = await fetchSSLDetails(fqdn);
            const subChain = parseCertChain(subCert);
            const subCertDetails = parseCertificateDetails(subCert);

            if (subCertDetails) {
              subDaysRemaining = subCertDetails.daysRemaining;
              if (subCertDetails.daysRemaining <= 0) {
                subStatus = "expired";
              } else if (subCertDetails.daysRemaining < 15) {
                subStatus = "expiring_soon";
              } else {
                subStatus = "valid";
              }
              subGrade = calculateSecurityGrade(subCertDetails, subChain);
            }
          } catch {
            subStatus = "connection_failed";
          }

          return {
            subdomain: sub,
            fqdn,
            ip,
            status: subStatus,
            securityGrade: subGrade,
            daysRemaining: subDaysRemaining,
          };
        }
        return null;
      });

      const resolved = await Promise.all(lookupPromises);
      for (const item of resolved) {
        if (item) subdomainsDiscovered.push(item);
      }
    }

    const payload: any = {
      id: Math.random().toString(36).substring(7),
      domain,
      ipAddress,
      port: 443,
      status,
      errorMessage,
      securityGrade: grade,
      certDetails,
      chain,
      subdomainsDiscovered,
      lastScanTime: scanTime,
    };

    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "An unexpected error occurred during scan." });
  }
});

// AI Analysis Endpoint
app.post("/api/analyze-security", async (req, res) => {
  const { domain, certDetails, chain, securityGrade } = req.body;

  if (!domain || !certDetails) {
    return res.status(400).json({ error: "Incomplete certificate details for AI analysis" });
  }

  try {
    const prompt = `Analyze the SSL certificate and trust chain details for the domain "${domain}".
Details:
- Issuer: ${JSON.stringify(certDetails.issuer)}
- Subject: ${JSON.stringify(certDetails.subject)}
- Validity: From ${certDetails.validFrom} to ${certDetails.validTo} (${certDetails.daysRemaining} days remaining)
- Security Grade: ${securityGrade}
- Key: ${certDetails.keyType} (${certDetails.keySize} bits)
- Chain Depth: ${chain ? chain.length : 1} certificates
- Subject Alternative Names (SANs): ${(certDetails.sanList || []).join(", ")}

Please provide a detailed security review of this certificate in JSON format containing:
1. "summary": A concise, highly professional summary of the certificate status, strength, and trust level.
2. "vulnerabilities": An array of potential security vulnerabilities, weak configuration points, or upcoming transition risks (e.g., deprecated algorithms, brief expiration window, missing wildcard coverage, weak key length, lack of multi-region redundancy, etc.). If none, return an empty array.
3. "recommendations": An array of concrete, actionable steps or prioritization guidelines the infrastructure team should implement (e.g. renew timeline, migrate to ECDSA/ED25519, configure automated renewal via ACME/Let's Encrypt, enforce CAA records, enable OCSP stapling).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            vulnerabilities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["summary", "vulnerabilities", "recommendations"],
        },
      },
    });

    const analysis = JSON.parse(response.text || "{}");
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate AI security analysis: " + err.message });
  }
});

// Setup dev server vs static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
