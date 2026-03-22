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

export interface AnalysisResult {
  url: string;
  screenshotPath: string;
  lighthouse: LighthouseMetrics;
  good: string[];
  bad: string[];
  qualitative: {
    visualDesign: QualitativeCategory;
    navigation: QualitativeCategory;
    contentClarity: QualitativeCategory;
    callsToAction: QualitativeCategory;
    trustCredibility: QualitativeCategory;
  };
  analyzedAt: string;
}
