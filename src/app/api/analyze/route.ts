import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { SCREENSHOTS_DIR } from '@/lib/storage';
import { AnalysisResult, AxeViolation, LighthouseMetrics, NavigationAnalysis, PageType, PrioritizedItem } from '@/types/analysis';

const client = new Anthropic();

const PAGE_TYPE_CRITERIA: Record<string, string> = {
  landing: 'hero section clarity, value proposition visibility above the fold, primary CTA prominence and contrast, social proof (testimonials/logos), trust signals',
  ecommerce: 'product image quality and size, price visibility and prominence, add-to-cart button clarity, trust badges and reviews, breadcrumb navigation, related products',
  blog: 'typography and line height for readability, optimal content width (~680px), heading hierarchy (H1-H2-H3), author info and date, related articles',
  dashboard: 'data visualization clarity, information density vs whitespace balance, primary action button placement, status indicators and feedback, filter/search accessibility',
  form: 'form field labels and placeholder clarity, required field indicators, submit CTA visibility, inline validation hints, alternative contact methods, minimal nav distraction',
  portfolio: 'project thumbnail quality and grid layout, case study depth visible, client/role context, contact CTA accessibility, smooth project-to-project navigation',
  other: 'visual hierarchy, content clarity, call-to-action visibility, trust signals, navigation usability',
};

const NAV_TYPE_EXTRA: Record<string, string> = {
  landing: '- Minimal nav is ideal: fewer links = less distraction from conversion; one prominent CTA button in nav is best',
  ecommerce: '- Search bar should be visible and prominent; cart icon with item count should be present; clear category structure',
  blog: '- Category/tag links and search should be easily accessible; breadcrumb or reading progress is a plus',
  dashboard: '- Active state must clearly show current section; breadcrumbs for deep navigation hierarchies are important',
  form: '- Nav should be minimal and unobtrusive to avoid distracting from form completion',
  portfolio: '- Smooth prev/next project navigation; portfolio section should be clearly linked from nav',
  other: '',
};

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
    // Give JS a moment to render
    await page.waitForTimeout(2000);
    screenshotBuffer = Buffer.from(await page.screenshot({ fullPage: false }));
    html = (await page.content()).slice(0, 40000);

    // Run axe-core accessibility scan
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

    // Capture focused desktop nav screenshot (1280px)
    try {
      const navEl = page.locator('header, nav, [role="navigation"]').first();
      const box = await navEl.boundingBox();
      if (box) {
        navScreenshotBuffer = Buffer.from(await page.screenshot({
          clip: { x: 0, y: box.y, width: 1280, height: Math.min(box.height, 200) },
        }));
      } else {
        navScreenshotBuffer = Buffer.from(await page.screenshot({
          clip: { x: 0, y: 0, width: 1280, height: 120 },
        }));
      }
    } catch (err) {
      console.error('Nav screenshot failed:', err);
    }

    // Capture mobile screenshots (375px): full-page + nav
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500); // let responsive CSS reflow
      mobileFullBuffer = Buffer.from(await page.screenshot({ fullPage: true }));
      const mobileNavEl = page.locator('header, nav, [role="navigation"]').first();
      const mobileBox = await mobileNavEl.boundingBox();
      if (mobileBox) {
        navMobileBuffer = Buffer.from(await page.screenshot({
          clip: { x: 0, y: mobileBox.y, width: 375, height: Math.min(mobileBox.height, 200) },
        }));
      } else {
        navMobileBuffer = Buffer.from(await page.screenshot({
          clip: { x: 0, y: 0, width: 375, height: 120 },
        }));
      }
    } catch (err) {
      console.error('Mobile screenshot failed:', err);
    }
  } finally {
    await browser.close();
  }

  // Save screenshots so they can be served via /api/screenshots/
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
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  try {
    const lhResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        disabled: false,
      },
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
    // keep EMPTY_LIGHTHOUSE defaults
  } finally {
    await chrome.kill();
  }

  // ── Step 3: Claude Vision qualitative analysis ────────────────────────────
  const imageBase64 = screenshotBuffer.toString('base64');
  const isAutoDetect = !pageTypeHint;

  const criteriaNote = isAutoDetect
    ? `First, identify the page type (one of: landing, ecommerce, blog, dashboard, form, portfolio, other) based on what you see, and include it as "pageType" in your JSON. Then apply evaluation criteria appropriate for that type.`
    : `This is a ${pageTypeHint} page. Evaluate it using these specific criteria: ${PAGE_TYPE_CRITERIA[pageTypeHint!] ?? PAGE_TYPE_CRITERIA.other}`;

  const prompt = `You are a senior UX designer. Analyze this website screenshot and HTML.

${criteriaNote}

HTML snippet:
${html.slice(0, 12000)}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  ${isAutoDetect ? '"pageType": "<one of: landing|ecommerce|blog|dashboard|form|portfolio|other>",\n  ' : ''}"good": [
    { "text": "<specific strength>", "priority": "<high|medium>" }
  ],
  "bad": [
    { "text": "<specific UX problem, be concrete and actionable>", "priority": "<critical|high|medium>" }
  ],
  "qualitative": {
    "visualDesign": { "score": <1-10>, "notes": "<one specific sentence about typography, colors, visual hierarchy>" },
    "navigation": { "score": <1-10>, "notes": "<one specific sentence about menu, wayfinding, structure>" },
    "contentClarity": { "score": <1-10>, "notes": "<one specific sentence about headlines, readability, info architecture>" },
    "callsToAction": { "score": <1-10>, "notes": "<one specific sentence about button visibility, clarity of next steps>" },
    "trustCredibility": { "score": <1-10>, "notes": "<one specific sentence about trust signals, social proof, professionalism>" }
  }
}
Include 3-6 items in good and bad. Order bad items by priority (critical first). Use "critical" only for issues that significantly block users or hurt conversions.`;

  let claudeGood: PrioritizedItem[] = [];
  let claudeBad: PrioritizedItem[] = [];
  let detectedPageType: string | undefined;
  let aiAvailable = false;
  let claudeQualitative: AnalysisResult['qualitative'] = {
    visualDesign: { score: 5, notes: 'Analysis unavailable' },
    navigation: { score: 5, notes: 'Analysis unavailable' },
    contentClarity: { score: 5, notes: 'Analysis unavailable' },
    callsToAction: { score: 5, notes: 'Analysis unavailable' },
    trustCredibility: { score: 5, notes: 'Analysis unavailable' },
  };

  try {
    const claudeResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const textBlock = claudeResponse.content.find((b) => b.type === 'text');
    const rawText = textBlock?.type === 'text' ? textBlock.text : '{}';
    // Extract JSON object robustly (handles markdown fences and leading text)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
    const parsed = JSON.parse(jsonStr);
    const toItems = (arr: unknown[]): PrioritizedItem[] =>
      arr.map(item =>
        typeof item === 'string'
          ? { text: item, priority: 'high' as const }
          : { text: String((item as Record<string, unknown>).text ?? ''), priority: ((item as Record<string, unknown>).priority ?? 'high') as PrioritizedItem['priority'] }
      );
    claudeGood = Array.isArray(parsed.good) ? toItems(parsed.good) : [];
    claudeBad = Array.isArray(parsed.bad) ? toItems(parsed.bad) : [];
    detectedPageType = parsed.pageType;
    if (parsed.qualitative) claudeQualitative = parsed.qualitative;
    aiAvailable = true;
  } catch (err) {
    console.error('Claude analysis failed:', err);
    console.error('Raw Claude response may have been unparseable');
  }

  const pageType = (pageTypeHint || detectedPageType || 'other') as PageType;

  // ── Step 4: Claude navigation analysis ───────────────────────────────────
  let navigationAnalysis: NavigationAnalysis | undefined;
  if (navScreenshotBuffer && navScreenshotPath) {
    const navTypeExtra = NAV_TYPE_EXTRA[pageType] ?? '';
    const navPrompt = `You are a senior UX/navigation expert. You are given ${navMobileBuffer ? 'TWO screenshots: (1) desktop navigation at 1280px wide, (2) mobile navigation at 375px wide' : 'a desktop navigation screenshot at 1280px wide'}.

Score the navigation 1-10 based on these specific criteria:
- Link visibility: are nav links readable with sufficient contrast and legible font size?
- Menu structure: 4-7 top-level items is ideal; 8+ causes overwhelm, 1-3 may lack structure
- Home/logo: is there a clear logo or home link in the top-left area?
- CTA prominence: is there a visually distinct call-to-action button (different color/style) in the nav?
- Visual hierarchy: can users tell what is primary vs secondary navigation?
- Active/current state: does the nav visually indicate where the user currently is?
- Mobile menu: is there a visible hamburger icon or mobile menu trigger at 375px?
${navTypeExtra ? `\nAdditional criteria for this ${pageType} page:\n${navTypeExtra}` : ''}
Scoring guide: 9-10 = 7/7 criteria met, 7-8 = 5-6 met, 5-6 = 3-4 met, 3-4 = 1-2 met, 1-2 = none met.

Return ONLY valid JSON (no markdown, no explanation):
{
  "score": <1-10>,
  "notes": "<one sentence summarizing the overall navigation quality>",
  "issues": ["2-5 specific problems referencing the criteria above"],
  "recommendations": ["2-5 concrete actionable improvements"]
}`;

    try {
      type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } };
      type TextBlock = { type: 'text'; text: string };
      const content: (ImageBlock | TextBlock)[] = [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: navScreenshotBuffer.toString('base64') } },
      ];
      if (navMobileBuffer) {
        content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: navMobileBuffer.toString('base64') } });
      }
      content.push({ type: 'text', text: navPrompt });

      const navResponse = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content }],
      });
      const navTextBlock = navResponse.content.find((b) => b.type === 'text');
      const navRaw = navTextBlock?.type === 'text' ? navTextBlock.text : '{}';
      const navJsonMatch = navRaw.match(/\{[\s\S]*\}/);
      const navParsed = JSON.parse(navJsonMatch ? navJsonMatch[0] : '{}');
      if (navParsed.score) {
        navigationAnalysis = {
          screenshotPath: navScreenshotPath,
          ...(navMobileScreenshotPath && { mobileScreenshotPath: navMobileScreenshotPath }),
          score: navParsed.score,
          notes: navParsed.notes ?? '',
          issues: Array.isArray(navParsed.issues) ? navParsed.issues : [],
          recommendations: Array.isArray(navParsed.recommendations) ? navParsed.recommendations : [],
        };
      }
    } catch (err) {
      console.error('Claude nav analysis failed:', err);
    }
  }

  // ── Step 5: Predicted attention heatmap ──────────────────────────────────
  let heatmap: AnalysisResult['heatmap'] = undefined;
  try {
    const heatmapPrompt = `You are a UX expert predicting where users look on this webpage in the first 5 seconds.

Identify 8-12 attention zones based on:
- Visual weight: large or high-contrast elements draw the eye first
- F-pattern / Z-pattern reading behavior (top-left, headline, hero area)
- CTA buttons and prominent interactive elements
- Images, especially faces, heroes, or product shots
- H1 / H2 headlines
- Navigation bar items

Return ONLY valid JSON (no markdown):
{
  "zones": [
    { "x": <0-100>, "y": <0-100>, "radius": <5-20>, "intensity": <0.3-1.0>, "reason": "<brief label>" }
  ]
}
Coordinates are percentages: x=0,y=0 is top-left; x=100,y=100 is bottom-right. The screenshot is 1280x800px viewport.`;

    const hmResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          { type: 'text', text: heatmapPrompt },
        ],
      }],
    });
    const hmText = hmResponse.content.find(b => b.type === 'text');
    const hmRaw = hmText?.type === 'text' ? hmText.text : '{}';
    const hmJson = hmRaw.match(/\{[\s\S]*\}/);
    const hmParsed = JSON.parse(hmJson ? hmJson[0] : '{}');
    if (Array.isArray(hmParsed.zones) && hmParsed.zones.length > 0) {
      heatmap = { zones: hmParsed.zones };
    }
  } catch (err) {
    console.error('Heatmap generation failed:', err);
  }

  // ── Assemble final result ─────────────────────────────────────────────────
  const result: AnalysisResult = {
    url,
    screenshotPath,
    ...(mobileScreenshotPath && { mobileScreenshotPath }),
    pageType,
    lighthouse: lighthouseData,
    axeViolations,
    good: claudeGood,
    bad: claudeBad,
    qualitative: claudeQualitative,
    navigationAnalysis,
    heatmap,
    analyzedAt: new Date().toISOString(),
    aiAvailable,
  };

  return NextResponse.json(result);
}
