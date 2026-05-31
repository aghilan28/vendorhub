/**
 * MCP-1F — Launch Certification Domain Model
 */

export type CertificationStatus = "PASS" | "CONDITIONAL_PASS" | "FAIL" | "NOT_APPLICABLE";
export type ReadinessLevel = "GO" | "CONDITIONAL_GO" | "NO_GO";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CertificationCheck = {
  id: string;
  domain: string;
  name: string;
  description: string;
  status: CertificationStatus;
  evidence: string;
  blockers?: string[];
  recommendations?: string[];
};

export type DomainCertification = {
  domain: string;
  score: number; // 0-100
  status: CertificationStatus;
  checks: CertificationCheck[];
  summary: string;
};

export type SecurityAudit = {
  authentication: CertificationCheck;
  authorization: CertificationCheck;
  rbac: CertificationCheck;
  rls: CertificationCheck;
  secrets: CertificationCheck;
  apiSecurity: CertificationCheck;
  webhookSecurity: CertificationCheck;
  inputValidation: CertificationCheck;
  rateLimiting: CertificationCheck;
  fraudControls: CertificationCheck;
  paymentSecurity: CertificationCheck;
  overallScore: number;
  overallStatus: CertificationStatus;
};

export type PerformanceCertification = {
  buildTime: number;
  bundleSize: { pages: number; sharedJs: number };
  staticPages: number;
  dynamicPages: number;
  score: number;
  status: CertificationStatus;
};

export type LoadTestResult = {
  concurrentUsers: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  errorRate: number;
  throughputRps: number;
  status: CertificationStatus;
};

export type ChaosScenario = {
  id: string;
  name: string;
  description: string;
  impact: string;
  mitigation: string;
  recoveryTime: string;
  tested: boolean;
  status: CertificationStatus;
};

export type MarketplaceScorecard = {
  catalog: number;
  media: number;
  seller: number;
  customer: number;
  hyperlocal: number;
  trust: number;
  operations: number;
  growth: number;
  security: number;
  reliability: number;
  intelligence: number;
  overall: number;
};

export type LaunchReadinessBoard = {
  decision: ReadinessLevel;
  overallScore: number;
  blockers: string[];
  conditionals: string[];
  strengths: string[];
  risks: Array<{ risk: string; severity: RiskLevel; mitigation: string }>;
  checklist: Array<{ item: string; status: "done" | "conditional" | "blocked" }>;
};

export type MCPPhaseAudit = {
  phase: string;
  title: string;
  status: "implemented" | "partially_implemented" | "placeholder" | "demo" | "production_ready";
  evidence: string[];
  gaps: string[];
  score: number;
};

export type FullCertificationReport = {
  masterAudit: MCPPhaseAudit[];
  security: SecurityAudit;
  performance: PerformanceCertification;
  loadTests: LoadTestResult[];
  chaosScenarios: ChaosScenario[];
  scorecard: MarketplaceScorecard;
  launchBoard: LaunchReadinessBoard;
  domains: DomainCertification[];
  generatedAt: string;
};
