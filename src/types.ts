export interface CertDetails {
  subject: {
    CN?: string;
    O?: string;
    OU?: string;
    L?: string;
    S?: string;
    C?: string;
    [key: string]: any;
  };
  issuer: {
    CN?: string;
    O?: string;
    OU?: string;
    C?: string;
    [key: string]: any;
  };
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  serialNumber: string;
  fingerprint: string;
  fingerprint256: string;
  keyType?: string;
  keySize?: number;
  signatureAlgorithm?: string;
  sanList: string[];
}

export interface ChainElement {
  subject: {
    CN?: string;
    O?: string;
    OU?: string;
    [key: string]: any;
  };
  issuer: {
    CN?: string;
    O?: string;
    OU?: string;
    [key: string]: any;
  };
  valid_from: string;
  valid_to: string;
  fingerprint: string;
  fingerprint256: string;
  serialNumber: string;
  bits?: number;
  pubkey?: any;
}

export interface SubdomainScan {
  subdomain: string;
  fqdn: string;
  ip: string;
  status: 'valid' | 'expired' | 'expiring_soon' | 'invalid_chain' | 'connection_failed';
  securityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'Unknown';
  daysRemaining: number;
}

export interface ScanResult {
  id: string;
  domain: string;
  ipAddress: string | null;
  port: number;
  status: 'valid' | 'expired' | 'expiring_soon' | 'invalid_chain' | 'connection_failed';
  errorMessage: string | null;
  securityGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'Unknown';
  certDetails: CertDetails | null;
  chain: ChainElement[];
  subdomainsDiscovered: SubdomainScan[];
  lastScanTime: string;
  aiAnalysis?: {
    summary: string;
    vulnerabilities: string[];
    recommendations: string[];
  };
}

export interface DomainMonitor {
  id: string;
  domain: string;
  subdomainScanEnabled: boolean;
  addedAt: string;
  lastResult: ScanResult | null;
  disabled?: boolean;
}
