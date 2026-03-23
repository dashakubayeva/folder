export interface LighthouseMetrics {
  performance: number;    // 0-100
  accessibility: number;  // 0-100
  seo: number;            // 0-100
  bestPractices: number;  // 0-100
  lcp: number | null;     // ms (Largest Contentful Paint)
  fcp: number | null;     // ms (First Contentful Paint)
  cls: number | null;     // score (Cumulative Layout Shift)
  tbt: number | null;     // ms (Total Blocking Time)
  speedIndex: number | null; // ms
}

export interface QualitativeCategory {
  score: number; // 1-10
  notes: string;
}

export interface AxeViolation {
  id: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  nodes: number; // how many elements affected
}

export interface AttentionZone {
  x: number;         // 0–100, % from left (center of zone)
  y: number;         // 0–100, % from top (center of zone)
  radius: number;    // 5–20, % of image width
  intensity: number; // 0.3–1.0 (1.0 = highest attention)
  reason: string;    // e.g. "Hero headline", "Primary CTA button"
}

export interface NavigationAnalysis {
  screenshotPath: string;           // desktop nav (1280px)
  mobileScreenshotPath?: string;    // mobile nav (375px)
  score: number;                    // 1-10
  notes: string;                    // one-sentence overall summary
  issues: string[];                 // 2-5 specific problems
  recommendations: string[];        // 2-5 concrete improvements
}

export interface PrioritizedItem {
  text: string;
  priority: 'critical' | 'high' | 'medium';
}

export type PageType = 'landing' | 'ecommerce' | 'blog' | 'dashboard' | 'form' | 'portfolio' | 'other';

export interface AnalysisResult {
  url: string;
  screenshotPath: string;
  mobileScreenshotPath?: string;
  pageType: PageType;
  lighthouse: LighthouseMetrics;
  axeViolations: AxeViolation[];
  good: PrioritizedItem[];
  bad: PrioritizedItem[];
  qualitative: {
    visualDesign: QualitativeCategory;
    navigation: QualitativeCategory;
    contentClarity: QualitativeCategory;
    callsToAction: QualitativeCategory;
    trustCredibility: QualitativeCategory;
  };
  navigationAnalysis?: NavigationAnalysis;
  heatmap?: { zones: AttentionZone[] };
  analyzedAt: string;
  aiAvailable?: boolean;
}
