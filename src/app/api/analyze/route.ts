import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'screenshots');
import { AnalysisResult, AxeViolation, ColorPaletteAnalysis, CopywritingAnalysis, FirstImpressionAnalysis, LighthouseMetrics, NavigationAnalysis, PageType, PrioritizedItem, TypographyAnalysis } from '@/types/analysis';

const EMPTY_LIGHTHOUSE: LighthouseMetrics = {
  performance: 0,
  accessibility: 0,
  seo: 0,
  bestPractices: 0,
  lcp: null,
  fcp: null,
  cls: null,
  tbt: null,
  speedIndex: null,
};

// ── Heuristic analysis functions ──────────────────────────────────────────────

function detectPageType(html: string): PageType {
  const lower = html.toLowerCase();
  const count = (patterns: string[]) => patterns.filter(p => lower.includes(p)).length;

  const scores: { type: PageType; score: number }[] = [
    { type: 'ecommerce', score: count(['add to cart', 'buy now', 'checkout', 'cart', 'product', 'shop', 'price', 'quantity', 'in stock', 'purchase']) },
    { type: 'blog', score: count(['article', 'blog', 'author', 'published', 'post', 'category', 'tags', 'comments', 'read more', 'subscribe']) },
    { type: 'dashboard', score: count(['dashboard', 'analytics', 'metric', 'chart', 'graph', 'report', 'widget', 'overview', 'stats', 'data-table']) },
    { type: 'form', score: count(['<form', 'contact us', 'required', 'email address', 'sign up', 'register', 'login', 'submit', 'input type']) },
    { type: 'portfolio', score: count(['portfolio', 'projects', 'my work', 'case study', 'gallery', 'showcase', 'hire me', 'client']) },
    { type: 'landing', score: count(['hero', 'get started', 'try for free', 'sign up free', 'testimonial', 'features', 'pricing', 'value proposition']) },
  ];

  const best = scores.reduce((a, b) => (a.score > b.score ? a : b));
  return best.score >= 2 ? best.type : 'other';
}

function generateGoodBad(html: string, lighthouse: LighthouseMetrics, pageType: PageType): { good: PrioritizedItem[]; bad: PrioritizedItem[] } {
  const lower = html.toLowerCase();
  const good: PrioritizedItem[] = [];
  const bad: PrioritizedItem[] = [];

  // Performance
  if (lighthouse.performance >= 90) good.push({ text: `Excellent performance score (${lighthouse.performance}/100)`, priority: 'high' });
  else if (lighthouse.performance >= 70) good.push({ text: `Good performance score (${lighthouse.performance}/100)`, priority: 'medium' });
  else if (lighthouse.performance < 50) bad.push({ text: `Poor performance score (${lighthouse.performance}/100) — slow page will lose users`, priority: 'critical' });
  else bad.push({ text: `Below-average performance (${lighthouse.performance}/100) — optimize images and reduce JS`, priority: 'high' });

  // Accessibility
  if (lighthouse.accessibility >= 90) good.push({ text: `High accessibility score (${lighthouse.accessibility}/100)`, priority: 'high' });
  else if (lighthouse.accessibility < 70) bad.push({ text: `Low accessibility score (${lighthouse.accessibility}/100) — site is not inclusive`, priority: 'critical' });

  // SEO
  if (lighthouse.seo >= 90) good.push({ text: `Strong SEO score (${lighthouse.seo}/100)`, priority: 'medium' });
  else if (lighthouse.seo < 70) bad.push({ text: `Weak SEO score (${lighthouse.seo}/100) — improve meta tags and content structure`, priority: 'high' });

  // Best practices
  if (lighthouse.bestPractices >= 90) good.push({ text: `Follows web best practices (${lighthouse.bestPractices}/100)`, priority: 'medium' });
  else if (lighthouse.bestPractices < 70) bad.push({ text: `Web best practices score is low (${lighthouse.bestPractices}/100)`, priority: 'medium' });

  // LCP
  if (lighthouse.lcp !== null) {
    if (lighthouse.lcp <= 2500) good.push({ text: `Fast Largest Contentful Paint (${(lighthouse.lcp / 1000).toFixed(1)}s)`, priority: 'medium' });
    else if (lighthouse.lcp > 4000) bad.push({ text: `Slow LCP (${(lighthouse.lcp / 1000).toFixed(1)}s) — hero content loads too slowly`, priority: 'critical' });
    else bad.push({ text: `LCP needs improvement (${(lighthouse.lcp / 1000).toFixed(1)}s, target: <2.5s)`, priority: 'high' });
  }

  // CLS
  if (lighthouse.cls !== null) {
    if (lighthouse.cls <= 0.1) good.push({ text: `Stable layout with low CLS (${lighthouse.cls.toFixed(3)})`, priority: 'medium' });
    else if (lighthouse.cls > 0.25) bad.push({ text: `High layout shift (CLS: ${lighthouse.cls.toFixed(3)}) — elements jumping around hurts UX`, priority: 'high' });
  }

  // HTML structure checks
  const hasH1 = /<h1[^>]*>/i.test(html);
  const hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html);
  const hasAltText = /<img[^>]+alt=["'][^"']+["']/i.test(html);
  const hasMobileViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const ctaWords = ['get started', 'sign up', 'try for free', 'buy now', 'contact us', 'book demo', 'download', 'start free'];
  const hasCta = ctaWords.some(p => lower.includes(p));

  if (hasH1) good.push({ text: 'Page has a clear H1 heading for content hierarchy', priority: 'medium' });
  else bad.push({ text: 'Missing H1 heading — add a clear primary heading for SEO and accessibility', priority: 'high' });

  if (hasMetaDescription) good.push({ text: 'Meta description present for search engine previews', priority: 'medium' });
  else bad.push({ text: 'Missing meta description — add one to improve search result click-through rates', priority: 'medium' });

  if (!hasAltText) bad.push({ text: 'Images missing alt text — required for accessibility and SEO', priority: 'high' });
  if (!hasMobileViewport) bad.push({ text: 'Missing viewport meta tag — page will not render correctly on mobile', priority: 'critical' });

  if (hasCta) good.push({ text: 'Clear call-to-action copy is present to guide users', priority: 'high' });
  else if (pageType === 'landing' || pageType === 'ecommerce') bad.push({ text: 'No clear call-to-action detected — add prominent CTAs to drive conversions', priority: 'critical' });

  // Social proof
  const hasSocialProof = ['testimonial', 'review', 'trusted by', 'customers', 'clients', '★', '⭐'].some(p => lower.includes(p));
  if (hasSocialProof && (pageType === 'landing' || pageType === 'ecommerce')) good.push({ text: 'Social proof (reviews/testimonials) is present', priority: 'high' });
  else if (!hasSocialProof && (pageType === 'landing' || pageType === 'ecommerce')) bad.push({ text: 'No social proof (testimonials, reviews, trust badges) — add them to build credibility', priority: 'high' });

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  bad.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { good: good.slice(0, 6), bad: bad.slice(0, 6) };
}

function analyzeQualitative(html: string, lh: LighthouseMetrics, pageType: PageType): AnalysisResult['qualitative'] {
  const lower = html.toLowerCase();

  const hasH1 = /<h1[^>]*>/i.test(html);
  const hasH2 = /<h2[^>]*>/i.test(html);
  const hasImages = /<img[^>]+>/i.test(html);
  const hasNav = /<nav|role=["']navigation["']/i.test(html);
  const navLinkCount = (html.match(/<a[^>]+href/gi) ?? []).length;
  const hasParagraphs = /<p[^>]*>\s*.{50,}/i.test(html);
  const ctaCount = ['get started', 'sign up', 'try for free', 'buy now', 'contact us', 'book', 'download', 'submit'].filter(p => lower.includes(p)).length;
  const hasButton = /<button[^>]*>|<a[^>]+class=["'][^"']*btn/i.test(html);
  const trustSignals = ['testimonial', 'review', 'trusted by', 'security', 'privacy', 'ssl', 'certified', 'guarantee', 'money back', 'award'].filter(p => lower.includes(p)).length;

  const visualDesignScore = Math.min(10, Math.max(1,
    5 + (hasH1 ? 1 : -1) + (hasImages ? 1 : 0) + (lh.bestPractices >= 80 ? 1 : 0) + (lh.performance >= 70 ? 1 : 0) + (lh.accessibility >= 80 ? 1 : 0)
  ));
  const navigationScore = Math.min(10, Math.max(1,
    5 + (hasNav ? 2 : -2) + (navLinkCount >= 3 && navLinkCount <= 10 ? 1 : 0) + (lh.seo >= 80 ? 1 : 0)
  ));
  const contentClarityScore = Math.min(10, Math.max(1,
    5 + (hasH1 ? 2 : -2) + (hasH2 ? 1 : 0) + (hasParagraphs ? 1 : 0) + (lh.seo >= 80 ? 1 : 0)
  ));
  const ctaScore = Math.min(10, Math.max(1,
    4 + (ctaCount > 0 ? 2 : -1) + (ctaCount >= 2 ? 1 : 0) + (hasButton ? 1 : 0) + (pageType === 'landing' && ctaCount >= 2 ? 1 : 0)
  ));
  const trustScore = Math.min(10, Math.max(1, 4 + Math.min(trustSignals, 3) + (lh.bestPractices >= 80 ? 1 : 0) + (lh.accessibility >= 80 ? 1 : 0)));

  return {
    visualDesign: { score: visualDesignScore, notes: visualDesignScore >= 7 ? 'Good visual structure with consistent heading hierarchy and imagery.' : 'Visual design needs improvement — review heading hierarchy and image usage.' },
    navigation: { score: navigationScore, notes: navigationScore >= 7 ? 'Navigation is present and reasonably structured.' : 'Navigation structure needs attention — ensure links are clear and accessible.' },
    contentClarity: { score: contentClarityScore, notes: contentClarityScore >= 7 ? 'Content is well structured with clear headings and paragraphs.' : 'Content clarity needs work — start with a strong H1 and clear paragraph structure.' },
    callsToAction: { score: ctaScore, notes: ctaScore >= 7 ? 'Clear calls to action are present to guide users.' : 'Calls to action are weak or missing — add clear, action-oriented button text.' },
    trustCredibility: { score: trustScore, notes: trustScore >= 7 ? 'Trust signals are present to build user confidence.' : 'Trust signals are lacking — consider adding testimonials, security badges, or guarantees.' },
  };
}

function analyzeNavigationHeuristic(
  html: string,
  pageType: PageType,
  navScreenshotPath: string,
  navMobileScreenshotPath: string | null,
): NavigationAnalysis {
  const lower = html.toLowerCase();
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  const navHtml = navMatch ? navMatch[1] : html.slice(0, 5000);
  const navLinks = (navHtml.match(/<a[^>]+href/gi) ?? []).length;

  const hasLogo = /<(?:img|svg)[^>]*(?:logo|brand)/i.test(html) || /<a[^>]*href=["']\/["']/i.test(html);
  const hasCta = /<(?:a|button)[^>]*(?:btn|button|cta)/i.test(navHtml) || ['sign up', 'get started', 'login', 'try free'].some(p => navHtml.toLowerCase().includes(p));
  const hasMobileMenu = /hamburger|menu-toggle|nav-toggle|mobile-menu|data-toggle=["']collapse/i.test(html) || lower.includes('☰') || lower.includes('≡');
  const hasActiveState = /aria-current|class=["'][^"']*active[^"']*["']/i.test(navHtml);

  let score = 5;
  if (navLinks >= 3 && navLinks <= 7) score += 1;
  else if (navLinks > 10) score -= 2;
  if (hasLogo) score += 1;
  if (hasCta) score += 1;
  if (hasMobileMenu) score += 1;
  if (hasActiveState) score += 1;
  score = Math.min(10, Math.max(1, score));

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (navLinks < 2) { issues.push('Navigation has very few links — users may struggle to find content.'); recommendations.push('Add at least 3-5 key navigation links to help users explore the site.'); }
  if (navLinks > 10) { issues.push(`Navigation has ${navLinks} links, causing cognitive overload.`); recommendations.push('Reduce top-level navigation to 4-7 items; move secondary links to dropdowns or footer.'); }
  if (!hasLogo) { issues.push('No logo or home link detected in navigation.'); recommendations.push('Add a logo in the top-left that links to the homepage.'); }
  if (!hasCta) { issues.push('No call-to-action button in the navigation bar.'); recommendations.push('Add a visually distinct CTA button (e.g. "Sign Up") to the navigation.'); }
  if (!hasMobileMenu) { issues.push('No mobile menu toggle detected — navigation may break on small screens.'); recommendations.push('Implement a hamburger menu or slide-out drawer for mobile viewports.'); }
  if (!hasActiveState) { issues.push('No active/current page indicator in navigation.'); recommendations.push('Highlight the current page using aria-current or a distinct visual style.'); }
  if (pageType === 'ecommerce' && !lower.includes('cart') && !lower.includes('basket')) { issues.push('No cart or basket link visible in navigation.'); recommendations.push('Add a cart icon with item count to the navigation bar.'); }

  return {
    screenshotPath: navScreenshotPath,
    ...(navMobileScreenshotPath && { mobileScreenshotPath: navMobileScreenshotPath }),
    score,
    notes: score >= 7 ? 'Navigation is functional with key elements in place.' : 'Navigation needs improvement — several key usability elements are missing.',
    issues: issues.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };
}

function generateHeatmapZones(pageType: PageType): AnalysisResult['heatmap'] {
  const zones = [
    { x: 50, y: 6, radius: 18, intensity: 0.9, reason: 'Navigation bar' },
    { x: 10, y: 6, radius: 10, intensity: 0.85, reason: 'Logo / brand mark' },
    { x: 85, y: 6, radius: 10, intensity: 0.7, reason: 'Top-right CTA / nav action' },
    { x: 50, y: 28, radius: 20, intensity: 1.0, reason: 'Hero headline (primary attention)' },
    { x: 50, y: 42, radius: 14, intensity: 0.75, reason: 'Subheading / value proposition' },
    { x: 50, y: 55, radius: 12, intensity: 0.8, reason: 'Primary CTA button' },
    { x: 15, y: 55, radius: 8, intensity: 0.5, reason: 'Left rail (F-pattern)' },
    { x: 20, y: 72, radius: 7, intensity: 0.4, reason: 'Feature item 1' },
    { x: 50, y: 72, radius: 7, intensity: 0.4, reason: 'Feature item 2' },
    { x: 80, y: 72, radius: 7, intensity: 0.35, reason: 'Feature item 3' },
  ];

  if (pageType === 'ecommerce') {
    zones.push({ x: 70, y: 40, radius: 14, intensity: 0.85, reason: 'Product image / hero visual' });
    zones.push({ x: 30, y: 60, radius: 12, intensity: 0.9, reason: 'Price & add-to-cart zone' });
  } else if (pageType === 'blog') {
    zones.push({ x: 50, y: 32, radius: 16, intensity: 0.9, reason: 'Article title' });
    zones.push({ x: 12, y: 45, radius: 8, intensity: 0.6, reason: 'Author / date byline' });
  } else if (pageType === 'dashboard') {
    zones.push({ x: 25, y: 40, radius: 14, intensity: 0.85, reason: 'Primary KPI metric' });
    zones.push({ x: 65, y: 55, radius: 16, intensity: 0.75, reason: 'Chart / data visualization' });
  }

  return { zones };
}

function analyzeTypographyHeuristic(html: string): TypographyAnalysis {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 7;

  const hasH1 = /<h1[^>]*>/i.test(html);
  const hasH2 = /<h2[^>]*>/i.test(html);
  const hasH3 = /<h3[^>]*>/i.test(html);
  const h1Count = (html.match(/<h1[^>]*>/gi) ?? []).length;

  if (!hasH1) { score -= 2; issues.push('No H1 heading found — every page needs exactly one primary heading.'); recommendations.push('Add a single H1 tag as the main page title.'); }
  else if (h1Count > 1) { score -= 1; issues.push(`Multiple H1 headings found (${h1Count}) — only one H1 per page is recommended.`); recommendations.push('Reduce to a single H1 and use H2/H3 for subheadings.'); }
  if (!hasH2 && hasH1) { issues.push('No H2 subheadings found — content may lack visual hierarchy.'); recommendations.push('Add H2 subheadings to break content into sections.'); }

  // Small font sizes
  const smallFonts = (html.match(/font-size:\s*(\d+)px/gi) ?? [])
    .map(m => parseInt(m.replace(/\D/g, '')))
    .filter(px => px > 0 && px < 14);
  if (smallFonts.length > 0) { score -= 1; issues.push(`Small text detected (${smallFonts[0]}px) — minimum 16px recommended for body text.`); recommendations.push('Increase base font size to at least 16px for comfortable reading.'); }

  // Line height
  const lhMatch = html.match(/line-height:\s*([\d.]+)/i);
  if (lhMatch) {
    const lh = parseFloat(lhMatch[1]);
    if (lh < 1.4 && lh > 0) { score -= 1; issues.push(`Line height is tight (${lh}) — text may feel cramped.`); recommendations.push('Set line-height to 1.5–1.7 for body text to improve readability.'); }
  }

  // Too many font families
  const fontFamilies = new Set((html.match(/font-family:\s*[^;,"]+/gi) ?? []).map(m => m.split(':')[1].trim().split(',')[0].trim().toLowerCase()));
  if (fontFamilies.size > 3) { score -= 1; issues.push(`${fontFamilies.size} font families detected — too many fonts reduces visual consistency.`); recommendations.push('Limit to 2 font families: one for headings and one for body text.'); }

  if (hasH1 && hasH2) score = Math.min(score + 1, 10);
  if (hasH1 && hasH2 && hasH3) score = Math.min(score + 1, 10);
  score = Math.max(1, score);

  if (issues.length === 0) issues.push('Typography appears generally well structured based on HTML analysis.');
  if (recommendations.length === 0) recommendations.push('Test with real users to confirm font sizes and line spacing feel comfortable across devices.');

  return {
    score,
    notes: score >= 7 ? 'Typography is reasonably well structured with proper heading hierarchy.' : 'Typography issues detected — review heading hierarchy and font sizing.',
    issues: issues.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };
}

function analyzeFirstImpressionHeuristic(html: string, lh: LighthouseMetrics, pageType: PageType): FirstImpressionAnalysis {
  const lower = html.toLowerCase();
  const strengths: string[] = [];
  const issues: string[] = [];

  const hasH1 = /<h1[^>]*>/i.test(html);
  const hasHeroImage = /hero|banner|cover|featured/i.test(html) && /<img[^>]+>/i.test(html);
  const ctaWords = ['get started', 'sign up', 'try for free', 'buy now', 'contact us', 'book demo', 'start free'];
  const hasCta = ctaWords.some(p => lower.includes(p));
  const hasSubheadline = /<h2[^>]*>/i.test(html) || /class=["'][^"']*(?:subtitle|tagline)[^"']*["']/i.test(html);

  let score = 5;

  if (hasH1) { score += 1; strengths.push('A clear primary headline is visible above the fold.'); }
  else { score -= 2; issues.push('No H1 headline detected — users cannot immediately understand the page purpose.'); }

  if (hasHeroImage) { score += 1; strengths.push('Hero visual element is present to create visual interest.'); }

  if (hasCta) { score += 1; strengths.push('A call-to-action is present to guide users.'); }
  else { score -= 1; issues.push('No clear call-to-action detected above the fold.'); }

  if (hasSubheadline) strengths.push('Subheadline provides additional context below the main headline.');

  if (lh.performance < 50) { score -= 1; issues.push('Poor performance means the page loads slowly, harming first impression.'); }
  if (lh.lcp !== null && lh.lcp > 4000) issues.push('Slow LCP means hero content appears late — users may think the page is broken.');

  if (pageType === 'landing') {
    const hasSocialProof = ['testimonial', 'customers', 'trusted by', '★', '⭐'].some(p => lower.includes(p));
    if (hasSocialProof) strengths.push('Social proof is visible near the top of the page.');
    else issues.push('No social proof visible — missing an opportunity to build immediate trust.');
  }

  score = Math.min(10, Math.max(1, score));

  return {
    score,
    verdict: score >= 7
      ? 'The page makes a solid first impression with clear messaging and visual hierarchy.'
      : score >= 5
      ? 'The first impression is acceptable but could be strengthened with clearer messaging and a prominent CTA.'
      : 'The page struggles to communicate its purpose quickly — visitors may leave before engaging.',
    strengths: strengths.length > 0 ? strengths.slice(0, 4) : ['Page content loads and renders.'],
    issues: issues.length > 0 ? issues.slice(0, 4) : ['No critical first-impression issues detected.'],
  };
}

function analyzeCopywritingHeuristic(html: string, pageType: PageType): CopywritingAnalysis {
  const lower = html.toLowerCase();
  const issues: string[] = [];
  const suggestions: string[] = [];

  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(/\s+/).length;

  const genericCtas = ['click here', 'read more', 'submit', 'send'];
  const specificCtas = ['get started', 'try for free', 'start free trial', 'book a demo', 'download now', 'join free', 'sign up free'];
  const hasGenericCta = genericCtas.some(p => lower.includes(p));
  const hasSpecificCta = specificCtas.some(p => lower.includes(p));

  let score = 6;

  if (hasGenericCta) { score -= 1; issues.push('Generic CTA copy detected (e.g. "Click here", "Submit") — weak and vague.'); suggestions.push('Replace with specific, benefit-focused text like "Start free trial" or "See pricing".'); }
  if (hasSpecificCta) score += 1;

  const buzzwords = ['leverage', 'synergy', 'disruptive', 'paradigm', 'scalable', 'robust solution', 'best-in-class', 'world-class', 'cutting-edge', 'innovative'];
  const buzzwordCount = buzzwords.filter(p => lower.includes(p)).length;
  if (buzzwordCount >= 2) { score -= 1; issues.push(`Corporate jargon detected (${buzzwordCount} buzzwords) — language feels generic and untrustworthy.`); suggestions.push('Replace jargon with plain, specific language. Describe what the product actually does.'); }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (h1Text.length < 10) { score -= 1; issues.push('H1 headline is very short — it may not communicate the value proposition.'); suggestions.push('Expand the headline to state what the site offers and for whom (e.g. "Analytics for teams that hate dashboards").'); }
    else if (h1Text.length > 120) { score -= 1; issues.push('H1 headline is very long — consider condensing to the core message.'); suggestions.push('Trim the headline to the most compelling 6-12 words.'); }
    else score += 1;
  } else {
    score -= 2; issues.push('No H1 headline found — the page is missing its most important copy element.'); suggestions.push('Add a compelling H1 that states your unique value proposition in one sentence.');
  }

  if (wordCount < 50) { score -= 1; issues.push('Very little text content — page may lack enough information for users to make decisions.'); suggestions.push('Add descriptive copy: explain the benefits, how it works, and who it is for.'); }

  const passivePatterns = ['is being', 'was being', 'has been', 'have been', 'will be'];
  const passiveCount = passivePatterns.filter(p => lower.includes(p)).length;
  if (passiveCount >= 3) { score -= 1; issues.push('Passive voice detected — active voice is more persuasive.'); suggestions.push('Rewrite passive constructions in active voice: "We deliver results" instead of "Results are delivered".'); }

  score = Math.min(10, Math.max(1, score));

  if (issues.length === 0) issues.push('Copy quality appears reasonable based on text analysis.');
  if (suggestions.length === 0) suggestions.push('A/B test different headline variations to find the most compelling version.');

  return {
    score,
    notes: score >= 7 ? 'Copy is clear and well-written with specific calls to action.' : 'Copy needs improvement — focus on clear headlines, specific CTAs, and plain language.',
    issues: issues.slice(0, 5),
    suggestions: suggestions.slice(0, 5),
  };
}

function analyzeColorPaletteHeuristic(html: string): ColorPaletteAnalysis {
  const issues: string[] = [];
  const recommendations: string[] = [];

  const hexColors = new Set((html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [])
    .map(h => h.toUpperCase())
    .filter(h => !['#000000', '#000', '#FFFFFF', '#FFF'].includes(h)));

  const rgbColors = (html.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/gi) ?? []).map(rgb => {
    const parts = rgb.match(/\d+/g)!.map(Number);
    return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
  });

  const allColors = [...new Set([...hexColors, ...rgbColors])];
  let score = 7;
  const dominantColors = allColors.slice(0, 6);

  if (allColors.length === 0) {
    dominantColors.push('#000000', '#FFFFFF', '#0066CC');
    issues.push('Unable to detect colors from inline styles — colors may be in external stylesheets.');
    recommendations.push('Ensure primary brand colors have sufficient contrast (4.5:1 ratio for body text).');
  } else if (allColors.length > 8) {
    score -= 2;
    issues.push(`Many colors detected (${allColors.length}) — too many colors create visual inconsistency.`);
    recommendations.push('Limit your palette to 2-3 primary colors plus 1-2 accent colors for visual cohesion.');
  } else if (allColors.length >= 3) {
    score += 1;
  }

  const lower = html.toLowerCase();
  const hasLightBg = lower.includes('background: white') || lower.includes('background: #fff') || lower.includes('bg-white');
  const hasLightText = /#[cdefCDEF][0-9a-fA-F]{5}/.test(html);
  if (hasLightBg && hasLightText) {
    score -= 2;
    issues.push('Light-colored text on white/light backgrounds may fail WCAG contrast requirements.');
    recommendations.push('Test all text/background combinations. Use text darker than #767676 on white backgrounds.');
  }

  if (issues.length === 0) issues.push('No major color issues detected from inline CSS analysis.');
  if (recommendations.length < 2) {
    recommendations.push('Verify contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).');
    recommendations.push('Use a consistent palette: 1-2 brand colors, 1 accent color, and neutral grays.');
  }

  score = Math.min(10, Math.max(1, score));

  return {
    score,
    notes: score >= 7 ? 'Color palette appears cohesive — verify contrast ratios for accessibility compliance.' : 'Color usage needs attention — too many colors or potential contrast issues detected.',
    dominantColors: dominantColors.length > 0 ? dominantColors : ['#000000', '#FFFFFF'],
    issues: issues.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string;
  let pageTypeHint: string | undefined;
  try {
    ({ url, pageTypeHint } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const id = uuidv4();

  // ── Step 1: Screenshot + HTML + axe-core via Playwright ──────────────────
  let screenshotBuffer: Buffer;
  let mobileFullBuffer: Buffer | null = null;
  let navScreenshotBuffer: Buffer | null = null;
  let navMobileBuffer: Buffer | null = null;
  let html: string;
  let axeViolations: AxeViolation[] = [];
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    }),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    screenshotBuffer = Buffer.from(await page.screenshot({ fullPage: false }));
    html = (await page.content()).slice(0, 40000);

    try {
      const axeResults = await new AxeBuilder({ page }).analyze();
      axeViolations = axeResults.violations.map((v) => ({
        id: v.id,
        description: v.description,
        impact: (v.impact ?? 'moderate') as AxeViolation['impact'],
        nodes: v.nodes.length,
      }));
    } catch (err) {
      console.error('axe-core failed:', err);
    }

    // Desktop nav screenshot
    try {
      const navEl = page.locator('header, nav, [role="navigation"]').first();
      const box = await navEl.boundingBox();
      if (box) {
        navScreenshotBuffer = Buffer.from(await page.screenshot({ clip: { x: 0, y: box.y, width: 1280, height: Math.min(box.height, 200) } }));
      } else {
        navScreenshotBuffer = Buffer.from(await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 120 } }));
      }
    } catch (err) {
      console.error('Nav screenshot failed:', err);
    }

    // Mobile screenshots (375px)
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);
      mobileFullBuffer = Buffer.from(await page.screenshot({ fullPage: true }));
      const mobileNavEl = page.locator('header, nav, [role="navigation"]').first();
      const mobileBox = await mobileNavEl.boundingBox();
      if (mobileBox) {
        navMobileBuffer = Buffer.from(await page.screenshot({ clip: { x: 0, y: mobileBox.y, width: 375, height: Math.min(mobileBox.height, 200) } }));
      } else {
        navMobileBuffer = Buffer.from(await page.screenshot({ clip: { x: 0, y: 0, width: 375, height: 120 } }));
      }
    } catch (err) {
      console.error('Mobile screenshot failed:', err);
    }
  } finally {
    await browser.close();
  }

  // Save screenshots
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  const screenshotFilename = `ux-${id}.png`;
  await fs.writeFile(path.join(SCREENSHOTS_DIR, screenshotFilename), screenshotBuffer);
  const screenshotPath = `/api/screenshots/${screenshotFilename}`;

  let navScreenshotPath: string | null = null;
  if (navScreenshotBuffer) {
    const navFilename = `ux-nav-${id}.png`;
    await fs.writeFile(path.join(SCREENSHOTS_DIR, navFilename), navScreenshotBuffer);
    navScreenshotPath = `/api/screenshots/${navFilename}`;
  }

  let navMobileScreenshotPath: string | null = null;
  if (navMobileBuffer) {
    const navMobileFilename = `ux-nav-mobile-${id}.png`;
    await fs.writeFile(path.join(SCREENSHOTS_DIR, navMobileFilename), navMobileBuffer);
    navMobileScreenshotPath = `/api/screenshots/${navMobileFilename}`;
  }

  let mobileScreenshotPath: string | undefined;
  if (mobileFullBuffer) {
    const mobileFilename = `ux-mobile-${id}.png`;
    await fs.writeFile(path.join(SCREENSHOTS_DIR, mobileFilename), mobileFullBuffer);
    mobileScreenshotPath = `/api/screenshots/${mobileFilename}`;
  }

  // ── Step 2: Lighthouse audit ──────────────────────────────────────────────
  let lighthouseData: LighthouseMetrics = { ...EMPTY_LIGHTHOUSE };
  const chrome = await launch({
    chromePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      || '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const lhResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1280, height: 800, deviceScaleFactor: 1, disabled: false },
      throttlingMethod: 'simulate',
    });
    const lhr = lhResult?.lhr;
    if (lhr) {
      lighthouseData = {
        performance: Math.round((lhr.categories['performance']?.score ?? 0) * 100),
        accessibility: Math.round((lhr.categories['accessibility']?.score ?? 0) * 100),
        seo: Math.round((lhr.categories['seo']?.score ?? 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
        lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
        fcp: lhr.audits['first-contentful-paint']?.numericValue ?? null,
        cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
        tbt: lhr.audits['total-blocking-time']?.numericValue ?? null,
        speedIndex: lhr.audits['speed-index']?.numericValue ?? null,
      };
    }
  } catch (err) {
    console.error('Lighthouse failed:', err);
  } finally {
    await chrome.kill();
  }

  // ── Step 3: Rule-based page analysis ─────────────────────────────────────
  const pageType = (pageTypeHint || detectPageType(html)) as PageType;
  const { good, bad } = generateGoodBad(html, lighthouseData, pageType);
  const qualitative = analyzeQualitative(html, lighthouseData, pageType);

  // ── Step 4: Navigation analysis ───────────────────────────────────────────
  let navigationAnalysis: NavigationAnalysis | undefined;
  if (navScreenshotPath) {
    navigationAnalysis = analyzeNavigationHeuristic(html, pageType, navScreenshotPath, navMobileScreenshotPath);
  }

  // ── Step 5: Attention heatmap (F-pattern) ─────────────────────────────────
  const heatmap = generateHeatmapZones(pageType);

  // ── Step 6: Typography analysis ───────────────────────────────────────────
  const typographyAnalysis = analyzeTypographyHeuristic(html);

  // ── Step 7: First impression analysis ────────────────────────────────────
  const firstImpressionAnalysis = analyzeFirstImpressionHeuristic(html, lighthouseData, pageType);

  // ── Step 8: Copywriting analysis ─────────────────────────────────────────
  const copywritingAnalysis = analyzeCopywritingHeuristic(html, pageType);

  // ── Step 9: Color palette analysis ───────────────────────────────────────
  const colorPaletteAnalysis = analyzeColorPaletteHeuristic(html);

  // ── Assemble final result ─────────────────────────────────────────────────
  const result: AnalysisResult = {
    url,
    screenshotPath,
    ...(mobileScreenshotPath && { mobileScreenshotPath }),
    pageType,
    lighthouse: lighthouseData,
    axeViolations,
    good,
    bad,
    qualitative,
    navigationAnalysis,
    typographyAnalysis,
    firstImpressionAnalysis,
    copywritingAnalysis,
    colorPaletteAnalysis,
    heatmap,
    analyzedAt: new Date().toISOString(),
    aiAvailable: true,
  };

  return NextResponse.json(result);
}
