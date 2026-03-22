import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { SCREENSHOTS_DIR } from '@/lib/storage';
import { AnalysisResult, LighthouseMetrics } from '@/types/analysis';

const client = new Anthropic();

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
  try {
    ({ url } = await req.json());
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

  // ── Step 1: Screenshot + HTML via Playwright ──────────────────────────────
  let screenshotBuffer: Buffer;
  let html: string;
  const browser = await chromium.launch({
    headless: true,
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
  } finally {
    await browser.close();
  }

  // Save screenshot so it can be served via /api/screenshots/
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  const screenshotFilename = `ux-${id}.png`;
  await fs.writeFile(path.join(SCREENSHOTS_DIR, screenshotFilename), screenshotBuffer);
  const screenshotPath = `/api/screenshots/${screenshotFilename}`;

  // ── Step 2: Lighthouse audit ──────────────────────────────────────────────
  let lighthouseData: LighthouseMetrics = { ...EMPTY_LIGHTHOUSE };
  const chrome = await launch({
    chromePath: chromium.executablePath(),
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

  const prompt = `You are a senior UX designer. Analyze this website screenshot and HTML for UX quality.

HTML snippet:
${html.slice(0, 12000)}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "good": ["3-6 specific things done well, be concrete about what you see"],
  "bad": ["3-6 specific UX problems that hurt usability, be concrete and actionable"],
  "qualitative": {
    "visualDesign": { "score": <1-10>, "notes": "<one specific sentence about typography, colors, visual hierarchy>" },
    "navigation": { "score": <1-10>, "notes": "<one specific sentence about menu, wayfinding, structure>" },
    "contentClarity": { "score": <1-10>, "notes": "<one specific sentence about headlines, readability, info architecture>" },
    "callsToAction": { "score": <1-10>, "notes": "<one specific sentence about button visibility, clarity of next steps>" },
    "trustCredibility": { "score": <1-10>, "notes": "<one specific sentence about trust signals, social proof, professionalism>" }
  }
}`;

  let claudeGood: string[] = [];
  let claudeBad: string[] = [];
  let claudeQualitative: AnalysisResult['qualitative'] = {
    visualDesign: { score: 5, notes: 'Analysis unavailable' },
    navigation: { score: 5, notes: 'Analysis unavailable' },
    contentClarity: { score: 5, notes: 'Analysis unavailable' },
    callsToAction: { score: 5, notes: 'Analysis unavailable' },
    trustCredibility: { score: 5, notes: 'Analysis unavailable' },
  };

  try {
    const claudeResponse = await client.messages.create({
      model: 'claude-opus-4-6',
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
    // Strip possible markdown code fences
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const parsed = JSON.parse(jsonStr);
    claudeGood = Array.isArray(parsed.good) ? parsed.good : [];
    claudeBad = Array.isArray(parsed.bad) ? parsed.bad : [];
    if (parsed.qualitative) claudeQualitative = parsed.qualitative;
  } catch (err) {
    console.error('Claude analysis failed:', err);
  }

  // ── Assemble final result ─────────────────────────────────────────────────
  const result: AnalysisResult = {
    url,
    screenshotPath,
    lighthouse: lighthouseData,
    good: claudeGood,
    bad: claudeBad,
    qualitative: claudeQualitative,
    analyzedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
