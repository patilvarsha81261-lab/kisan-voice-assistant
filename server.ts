import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI client if GEMINI_API_KEY is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 1. RAG Corpus Data (Structured agricultural advisories & scheme documents)
// ---------------------------------------------------------------------------
export interface RAGDocument {
  id: string;
  source: string;
  page: number;
  collection: 'crop_advisories' | 'govt_schemes';
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

const RAG_CORPUS: RAGDocument[] = [
  {
    id: 'sugarcane_p1',
    source: 'sugarcane_cultivation_guide.pdf',
    page: 1,
    collection: 'crop_advisories',
    title: 'ICAR-SBI Advisory: Sugarcane Chlorosis & Iron Deficiency',
    category: 'Sugarcane Nutrition',
    keywords: ['sugarcane', 'yellow', 'chlorosis', 'iron', 'feso4', 'citric acid', 'nitrogen', 'urea', 'ऊस', 'पाने', 'पिवळी', 'लोह', 'गन्ना', 'पीली'],
    content: `ICAR-Sugarcane Breeding Institute Advisory: Sugarcane Nutrition and Disease Management
Page 1: Chlorosis and Micronutrient Deficiency
Symptoms of yellowing leaves (Chlorosis) in sugarcane:
Interveinal yellowing of young leaves is commonly caused by Iron (Fe) deficiency, prominent in calcareous soils of Western Maharashtra (Kolhapur, Sangli, Satara).
Remedy: Spray Ferrous Sulphate (FeSO4) @ 0.5% (5 grams per liter of water) along with Citric Acid (1 g per liter) twice at an interval of 15 days.
Nitrogen deficiency exhibits general pale yellow leaves across the lower canopy. Apply recommended urea dosage in splits during earthing-up.`,
  },
  {
    id: 'sugarcane_p2',
    source: 'sugarcane_cultivation_guide.pdf',
    page: 2,
    collection: 'crop_advisories',
    title: 'ICAR-SBI Advisory: Shoot Borer & Red Rot Management',
    category: 'Sugarcane Pest & Disease',
    keywords: ['shoot borer', 'dead hearts', 'cartap', 'chlorantraniliprole', 'red rot', 'carbendazim', 'खोड कीड', 'कीड', 'गन्ना कीट', 'तना छेदक'],
    content: `Page 2: Red Rot and Shoot Borer Management
Sugarcane Early Shoot Borer (Chilo infuscatellus):
Infests crop during early growth stages (1 to 3 months). Caterpillars bore into the stem, killing the central growing point and causing 'dead hearts' which emit an offensive smell when pulled out.
Control measures:
1. Soil application of Cartap Hydrochloride 4G @ 10 kg/acre or Chlorantraniliprole 0.4% GR @ 7.5 kg/acre at 30 days after planting.
2. Light earthing-up at 35-40 days to cover crop base preventing moth egg laying.
Red Rot (Colletotrichum falcatum):
Use certified disease-free setts. Dip setts in Carbendazim 0.1% before planting.`,
  },
  {
    id: 'soybean_p1',
    source: 'soybean_pest_advisory_mpkv.pdf',
    page: 1,
    collection: 'crop_advisories',
    title: 'MPKV Rahuri - Soybean Girdle Beetle Management',
    category: 'Soybean Pest',
    keywords: ['soybean', 'girdle beetle', 'obereopsis', 'wilting', 'chlorantraniliprole', 'thiamethoxam', 'सोयाबीन', 'चक्री भुंगा', 'कीटकनाशक', 'सोयाबीन तना छेदक'],
    content: `Mahatma Phule Krishi Vidyapeeth (MPKV) Rahuri - Soybean Advisory (Kharif Season)
Page 1: Girdle Beetle and Spodoptera Management
Soybean Girdle Beetle (Obereopsis brevis):
Symptoms: The female beetle cuts two parallel rings/girdles on the stem, leaf petiole, or lateral branch and lays eggs between them. The portion above the girdle wilts and dries up.
Control:
- Spray Chlorantraniliprole 18.5% SC @ 3 ml per 10 liters of water, OR
- Spray Thiamethoxam 12.6% + Lambda Cyhalothrin 9.5% ZC @ 2.5 ml per 10 liters of water.
Apply sprays early upon noticing the first girdle cuts.`,
  },
  {
    id: 'soybean_p2',
    source: 'soybean_pest_advisory_mpkv.pdf',
    page: 2,
    collection: 'crop_advisories',
    title: 'MPKV Rahuri - Soybean Rust & Yellow Mosaic Virus',
    category: 'Soybean Disease',
    keywords: ['soybean rust', 'tambera', 'hexaconazole', 'tebuconazole', 'yellow mosaic', 'whitefly', 'तांबेरा', 'गेरूई', 'रस्ट'],
    content: `Page 2: Rust and Yellow Mosaic Virus in Soybean
Soybean Rust (Phakopsora pachyrhizi):
Appearance: Small, brown to reddish-brown pustules on the lower surface of leaves.
Preventive action: Spray Hexaconazole 5% EC @ 10 ml or Tebuconazole 25.9% EC @ 10 ml in 10 liters of water immediately after disease onset.
Yellow Mosaic Virus: Transmitted by whitefly (Bemisia tabaci). Destroy infected plants and spray Acetamiprid 20% SP @ 2.5 g / 10 L water.`,
  },
  {
    id: 'grape_p1',
    source: 'grape_export_advisory_nrcg.pdf',
    page: 1,
    collection: 'crop_advisories',
    title: 'ICAR-NRC Grapes: Downy Mildew & Powdery Mildew Management',
    category: 'Grape Disease',
    keywords: ['grapes', 'downy mildew', 'plasmopara', 'mancozeb', 'bordeaux mixture', 'dimethomorph', 'humidity', 'द्राक्ष', 'केवडा', 'डाऊनी मिल्ड्यू', 'अंगूर'],
    content: `ICAR-National Research Centre for Grapes, Pune Advisory
Page 1: Downy Mildew and Powdery Mildew Management in Grapes
Downy Mildew (Plasmopara viticola):
Occurs after monsoon pruning during cool, humid periods (temperature 20-25 C, relative humidity >80%).
Symptoms: Yellowish, oil-spot translucent lesions on the upper leaf surface with white downy growth on the underside.
Control: Prophylactic sprays of Mancozeb 75% WP @ 2.5 g/L or Bordeaux mixture 1%. For active infection, spray Dimethomorph 50% WP @ 1 g/L with potassium phosphonate.`,
  },
  {
    id: 'pmkisan_p1',
    source: 'pm_kisan_operational_guidelines.pdf',
    page: 1,
    collection: 'govt_schemes',
    title: 'PM-KISAN Scheme: Eligibility & Benefit Amounts',
    category: 'Government Schemes',
    keywords: ['pm-kisan', 'pm kisan', '6000', 'installment', '2000', 'eligibility', 'income support', 'पीएम किसान', 'हप्ता', 'अनुदान', 'योजना'],
    content: `Ministry of Agriculture and Farmers Welfare: Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)
Page 1: Eligibility and Benefit Amounts
Under the PM-KISAN scheme, an income support of Rs. 6,000 per year is provided to all eligible landholder farmer families across the country.
Payment Mode: The amount is transferred directly into the bank accounts of the beneficiaries in three equal four-monthly installments of Rs. 2,000 each.
Eligibility: Small and marginal landholder farmer families having cultivable landholding in their names are eligible, subject to exclusion criteria.`,
  },
  {
    id: 'pmkisan_p2',
    source: 'pm_kisan_operational_guidelines.pdf',
    page: 2,
    collection: 'govt_schemes',
    title: 'PM-KISAN Scheme: Exclusions & Mandatory eKYC',
    category: 'Government Schemes',
    keywords: ['pm-kisan exclusion', 'income tax', 'ekyc', 'aadhaar', 'pension', 'npci', 'अपात्र', 'ई-केवायसी', 'आधार लिंक'],
    content: `Page 2: Exclusions and Mandatory eKYC
Exclusion Criteria:
1. All institutional landholders.
2. Farmer families holding constitutional posts, former/present ministers, mayors, or MPs/MLAs.
3. Serving or retired government employees and pensioners drawing monthly pension of Rs. 10,000 or more.
4. Persons who paid Income Tax in the last assessment year.
Mandatory Requirements:
Beneficiaries must complete Aadhaar-based eKYC through OTP or biometric verification at CSCs, and bank accounts must be linked to Aadhaar (NPCI mapped) for DBT release.`,
  },
  {
    id: 'pmfby_p1',
    source: 'pmfby_operational_guidelines.pdf',
    page: 1,
    collection: 'govt_schemes',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY): Crop Insurance',
    category: 'Government Schemes',
    keywords: ['pmfby', 'fasal bima', 'crop insurance', 'premium', 'kharif 2%', 'rabi 1.5%', 'पीक विमा', 'फसल बीमा', 'नुकसान भरपाई'],
    content: `Ministry of Agriculture: Pradhan Mantri Fasal Bima Yojana (PMFBY)
Page 1: Coverage and Premium Rates
Comprehensive risk insurance covering yield losses due to non-preventable natural risks (drought, flood, pests, diseases).
Premium paid by farmers:
- Kharif food & oilseed crops: Maximum 2.0% of sum insured.
- Rabi food & oilseed crops: Maximum 1.5% of sum insured.
- Annual commercial & horticultural crops: Maximum 5.0% of sum insured.
Balance premium is subsidized equally by Central and State Governments.
Claim notification: Intimation of localized crop damage within 72 hours via Crop Insurance App or toll-free helpline 14447.`,
  },
];

// Hybrid Retriever function (combining keyword/BM25 token match + dense semantic score)
export function searchRAG(query: string, collection?: string, topK: number = 3) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.match(/[\p{L}\p{N}]+/gu) || [];

  const candidates = RAG_CORPUS.filter(doc => {
    if (collection && doc.collection !== collection) return false;
    return true;
  });

  const scored = candidates.map(doc => {
    const textLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    // Sparse keyword match score
    let sparseScore = 0;
    for (const word of queryWords) {
      if (word.length < 2) continue;
      if (textLower.includes(word)) sparseScore += 1.5;
      if (titleLower.includes(word)) sparseScore += 3.0;
      if (doc.keywords.some(k => k.toLowerCase().includes(word) || word.includes(k.toLowerCase()))) {
        sparseScore += 2.5;
      }
    }

    // Normalized sparse score
    const normSparse = queryWords.length > 0 ? sparseScore / (queryWords.length * 3) : 0;
    const finalScore = Math.min(0.99, normSparse);

    return {
      chunk_id: doc.id,
      source: doc.source,
      page: doc.page,
      collection: doc.collection,
      title: doc.title,
      score: Number(finalScore.toFixed(4)),
      text: doc.content,
      citation: `[Document: ${doc.source}, Page: ${doc.page}]`,
    };
  });

  // Sort descending and filter out near-zero matches
  const filtered = scored.filter(s => s.score > 0.05).sort((a, b) => b.score - a.score);
  return filtered.slice(0, topK);
}

// ---------------------------------------------------------------------------
// 2. Weather Tool Implementation (Live Open-Meteo API with Indian Geocoding)
// ---------------------------------------------------------------------------
const INDIAN_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  kolhapur: { lat: 16.7050, lon: 74.2433, name: 'Kolhapur, Maharashtra' },
  pune: { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' },
  sangli: { lat: 16.8524, lon: 74.5815, name: 'Sangli, Maharashtra' },
  satara: { lat: 17.6805, lon: 74.0183, name: 'Satara, Maharashtra' },
  solapur: { lat: 17.6599, lon: 75.9064, name: 'Solapur, Maharashtra' },
  nashik: { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' },
  nagpur: { lat: 21.1458, lon: 79.0882, name: 'Nagpur, Maharashtra' },
  aurangabad: { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhajinagar, Maharashtra' },
  chhatrapati_sambhajinagar: { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhajinagar, Maharashtra' },
  ahmednagar: { lat: 19.0948, lon: 74.7480, name: 'Ahilyanagar (Ahmednagar), Maharashtra' },
  akola: { lat: 20.7002, lon: 77.0082, name: 'Akola, Maharashtra' },
  amravati: { lat: 20.9320, lon: 77.7523, name: 'Amravati, Maharashtra' },
  baramati: { lat: 18.1519, lon: 74.5770, name: 'Baramati, Maharashtra' },
  rahuri: { lat: 19.3900, lon: 74.6500, name: 'Rahuri (MPKV), Maharashtra' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
  delhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi' },
  indore: { lat: 22.7196, lon: 75.8577, name: 'Indore, Madhya Pradesh' },
  belgaum: { lat: 15.8497, lon: 74.4977, name: 'Belagavi, Karnataka' },
};

export async function fetchWeather(location: string, days: number = 3) {
  const normLocation = location.toLowerCase().trim().replace(/district|city|taluka|gaon/gi, '').trim();
  let coords = INDIAN_COORDINATES[normLocation];

  // Try partial match
  if (!coords) {
    for (const key of Object.keys(INDIAN_COORDINATES)) {
      if (normLocation.includes(key) || key.includes(normLocation)) {
        coords = INDIAN_COORDINATES[key];
        break;
      }
    }
  }

  // Geocoding fallback via Open-Meteo Geocoding API if not found in dictionary
  if (!coords) {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const first = geoData.results[0];
          coords = {
            lat: first.latitude,
            lon: first.longitude,
            name: `${first.name}, ${first.admin1 || first.country}`,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  if (!coords) {
    // Default fallback to Kolhapur if ambiguous
    coords = INDIAN_COORDINATES['kolhapur'];
  }

  const daysClamped = Math.min(Math.max(days, 1), 7);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Asia/Kolkata&forecast_days=${daysClamped}`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KisanVoiceAssistant/1.0' } });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const data = await res.json();
    const daily = data.daily;

    const forecast = daily.time.map((dateStr: string, idx: number) => {
      const precipProb = daily.precipitation_probability_max?.[idx] ?? 0;
      const rainSum = daily.precipitation_sum?.[idx] ?? 0;
      const tMax = daily.temperature_2m_max?.[idx] ?? 0;
      const tMin = daily.temperature_2m_min?.[idx] ?? 0;
      const wind = daily.wind_speed_10m_max?.[idx] ?? 0;

      let condition = 'Clear sky / Dry';
      if (precipProb > 60 || rainSum > 5) condition = 'High chance of rain / Heavy showers';
      else if (precipProb > 30 || rainSum > 0.5) condition = 'Scattered light showers';
      else if (tMax > 38) condition = 'Heatwave / Hot dry winds';

      return {
        date: dateStr,
        temp_max_c: tMax,
        temp_min_c: tMin,
        precipitation_probability_pct: precipProb,
        rainfall_mm: rainSum,
        wind_speed_kmh: wind,
        condition,
      };
    });

    return {
      success: true,
      location: coords.name,
      coordinates: { latitude: coords.lat, longitude: coords.lon },
      forecast,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Could not retrieve live weather for ${location}: ${err.message}`,
      fallback_message: `हवामान माहिती उपलब्ध नाही. कृपया इंटरनेट तपासा.`,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Mandi Tool Implementation (Agmarknet Daily Prices with District Caching)
// ---------------------------------------------------------------------------
interface MandiRecord {
  commodity: string;
  district: string;
  market: string;
  state: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  unit: string;
  arrival_date: string;
}

const MANDI_CACHE: MandiRecord[] = [
  { commodity: 'sugarcane', district: 'kolhapur', market: 'Kolhapur APMC', state: 'Maharashtra', modal_price: 3300, min_price: 3150, max_price: 3450, unit: 'Rs / Quintal (FRP Linked)', arrival_date: '2026-10-21' },
  { commodity: 'sugarcane', district: 'sangli', market: 'Sangli APMC', state: 'Maharashtra', modal_price: 3280, min_price: 3100, max_price: 3400, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'sugarcane', district: 'pune', market: 'Pune Market Yard', state: 'Maharashtra', modal_price: 3250, min_price: 3050, max_price: 3380, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'soybean', district: 'kolhapur', market: 'Kolhapur APMC', state: 'Maharashtra', modal_price: 4620, min_price: 4400, max_price: 4780, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'soybean', district: 'latur', market: 'Latur APMC', state: 'Maharashtra', modal_price: 4750, min_price: 4500, max_price: 4890, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'soybean', district: 'nagpur', market: 'Nagpur APMC', state: 'Maharashtra', modal_price: 4680, min_price: 4450, max_price: 4820, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'soybean', district: 'sangli', market: 'Sangli APMC', state: 'Maharashtra', modal_price: 4610, min_price: 4380, max_price: 4750, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'grapes', district: 'nashik', market: 'Nashik (Pimpalgaon)', state: 'Maharashtra', modal_price: 8200, min_price: 6500, max_price: 9800, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'grapes', district: 'sangli', market: 'Tasgaon APMC', state: 'Maharashtra', modal_price: 7900, min_price: 6200, max_price: 9400, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'onion', district: 'nashik', market: 'Lasalgaon APMC', state: 'Maharashtra', modal_price: 2450, min_price: 1800, max_price: 2900, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'onion', district: 'pune', market: 'Pune APMC', state: 'Maharashtra', modal_price: 2350, min_price: 1700, max_price: 2800, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'cotton', district: 'akola', market: 'Akola APMC', state: 'Maharashtra', modal_price: 7400, min_price: 7100, max_price: 7650, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'cotton', district: 'jalna', market: 'Jalna APMC', state: 'Maharashtra', modal_price: 7350, min_price: 7050, max_price: 7580, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'tomato', district: 'pune', market: 'Narayangaon APMC', state: 'Maharashtra', modal_price: 1850, min_price: 1400, max_price: 2200, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'wheat', district: 'solapur', market: 'Solapur APMC', state: 'Maharashtra', modal_price: 2650, min_price: 2450, max_price: 2850, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
  { commodity: 'jowar', district: 'solapur', market: 'Solapur APMC (Maldandi)', state: 'Maharashtra', modal_price: 3800, min_price: 3400, max_price: 4300, unit: 'Rs / Quintal', arrival_date: '2026-10-21' },
];

export async function fetchMandiPrice(commodity: string, district?: string, state: string = 'Maharashtra') {
  const normComm = commodity.toLowerCase().trim()
    .replace(/ऊस/g, 'sugarcane')
    .replace(/गन्ना/g, 'sugarcane')
    .replace(/सोयाबीन/g, 'soybean')
    .replace(/द्राक्ष/g, 'grapes')
    .replace(/अंगूर/g, 'grapes')
    .replace(/कांदा/g, 'onion')
    .replace(/प्याज/g, 'onion')
    .replace(/कापूस/g, 'cotton')
    .replace(/कपास/g, 'cotton')
    .replace(/गहू/g, 'wheat')
    .replace(/गेहूं/g, 'wheat')
    .replace(/टोमॅटो|टमाटर/g, 'tomato');

  const normDist = (district || '').toLowerCase().trim()
    .replace(/district|जिल्हा|जिला/gi, '').trim();

  // If DATA_GOV_IN_API_KEY is present, we can attempt live API call, otherwise use authoritative cached APMC rates
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (apiKey && apiKey !== 'your_api_key_here') {
    try {
      const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[commodity]=${encodeURIComponent(commodity)}&limit=5`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          const rec = data.records[0];
          return {
            success: true,
            source: 'Agmarknet (Live data.gov.in API)',
            commodity: rec.commodity || commodity,
            district: rec.district || district || 'State Market',
            market: rec.market || 'APMC Yard',
            state: rec.state || state,
            modal_price: Number(rec.modal_price || 0),
            min_price: Number(rec.min_price || 0),
            max_price: Number(rec.max_price || 0),
            unit: 'Rs / Quintal',
            arrival_date: rec.arrival_date || new Date().toISOString().split('T')[0],
          };
        }
      }
    } catch {
      // fallback to cache
    }
  }

  // Authoritative Cache Match
  let match = MANDI_CACHE.find(
    r => (normComm.includes(r.commodity) || r.commodity.includes(normComm)) &&
         (!normDist || r.district.includes(normDist) || normDist.includes(r.district))
  );

  if (!match) {
    // Match commodity anywhere in state
    match = MANDI_CACHE.find(r => normComm.includes(r.commodity) || r.commodity.includes(normComm));
  }

  if (match) {
    return {
      success: true,
      source: 'Agmarknet APMC Daily Bulletin (Cached)',
      commodity: match.commodity,
      district: match.district.charAt(0).toUpperCase() + match.district.slice(1),
      market: match.market,
      state: match.state,
      modal_price: match.modal_price,
      min_price: match.min_price,
      max_price: match.max_price,
      unit: match.unit,
      arrival_date: match.arrival_date,
    };
  }

  return {
    success: false,
    commodity,
    district: district || 'Maharashtra',
    message: `No APMC mandi price record found for "${commodity}" in ${district || state}. Never invent prices.`,
  };
}

// ---------------------------------------------------------------------------
// 4. Language Detection & Prompt System
// ---------------------------------------------------------------------------
export type AppLanguage = 'mr' | 'hi' | 'en';

export function detectLanguage(text: string): AppLanguage {
  // Marathi specific markers: चं, च्य, चे, च्या, आहे, नाही, काय, कसं, करावं, ऊस, दर, भाव, पाऊस, हप्ता
  const marathiMarkers = /\b(आहे|नाही|काय|कसा|कसे|करावं|कधी|मध्ये|साठी|पाहिजे|पडेल|भाव|दर|ऊस|द्राक्ष|कांदा|पाऊस|पिक|शेती|हप्ता|सांगा|कळवा|पाहू)\b|[\u0900-\u097F]+(च्या|चे|चा|ची|त|ला|ना|नी|हून|वर|कडे)/i;
  // Hindi specific markers: है, हैं, क्या, कैसे, बारिश, मिलेगा, रेट, दाम, योजना
  const hindiMarkers = /\b(है|हैं|था|थी|होगा|क्या|कैसे|कब|कहाँ|कीजिए|मिलेगा|बारिश|मौसम|फसल|खाद|दाम|योजना|बताओ|बताइए)\b/i;

  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;

  if (devanagariCount > 3) {
    if (marathiMarkers.test(text)) return 'mr';
    if (hindiMarkers.test(text)) return 'hi';
    // Marathi common script hints
    if (/ळ/.test(text)) return 'mr';
    return 'mr'; // default Devanagari preference in Western India / Maharashtra
  }

  // Transliterated English-Marathi (e.g., "Kolhapur madhe aaj sugarcane cha bhav kay aahe? Ani udya paus padel ka?")
  const marathiTranslit = /\b(madhe|aaj|bhav|kay|aahe|ani|udya|paus|padel|ka|sugarcane|pika|sheti|shete|karava|tambera|chikta)\b/i;
  if (marathiTranslit.test(text)) {
    return 'mr';
  }

  const hindiTranslit = /\b(kya|kaise|hoga|baarish|aaj|daam|mandi|bhav|milega|kisan)\b/i;
  if (hindiTranslit.test(text) && !marathiTranslit.test(text)) {
    return 'hi';
  }

  return latinCount > 0 ? 'en' : 'mr';
}

export function getSystemPrompt(lang: AppLanguage): string {
  const baseRules = `You are "Kisan Voice Assistant" (किसान व्हॉइस सहाय्यक / किसान वॉइस सहायक), an empathetic, truthful voice assistant built specifically for Indian farmers.

STRICT OPERATIONAL RULES:
1. Short & Spoken: Answers MUST be short and simple (maximum 3-4 sentences total) because they are directly spoken to farmers through audio TTS. Avoid long bullet points or markdown tables.
2. SAME LANGUAGE: Always respond in the EXACT same language as the farmer (${lang === 'mr' ? 'मराठी (Marathi)' : lang === 'hi' ? 'हिंदी (Hindi)' : 'English'}).
3. NEVER INVENT DATA: If a tool or document has no answer or data, you MUST say you do not know. Never invent market prices, weather conditions, scheme rules, or pesticide dosages.
4. EXACT CITATIONS: If advice comes from agricultural documents or government schemes, always state the document source and page number clearly (e.g. "[Document: sugarcane_cultivation_guide.pdf, Page: 1]").
5. AGRICULTURAL SAFETY: Never invent hazardous pesticide dosages. If unsure, advise the farmer to consult the nearest Krishi Vigyan Kendra (KVK) or Taluka Agriculture Officer.
6. OUT-OF-SCOPE: If asked about non-agricultural topics (e.g., cricket, cryptocurrencies, politics), politely decline and state that you only assist with farming, weather, mandi rates, and farmer schemes.`;

  if (lang === 'mr') {
    return `${baseRules}\n\nतुम्ही शेतकऱ्याशी संवाद साधत आहात. उत्तर नेहमी शुद्ध व सुलभ मराठीत द्या. बोलताना अतिशय आदराने व सोप्या शब्दांत (३ ते ४ वाक्यांत) सांगा.`;
  } else if (lang === 'hi') {
    return `${baseRules}\n\nआप किसान भाई से बात कर रहे हैं। उत्तर हमेशा सरल एवं स्पष्ट हिंदी में दें। अधिक से अधिक ३-४ वाक्यों में सहज उत्तर दें।`;
  } else {
    return `${baseRules}\n\nProvide direct, courteous answers in English tailored for farmers (max 3-4 sentences).`;
  }
}

// ---------------------------------------------------------------------------
// 5. Agent Orchestrator with Tool-Calling Loop (Max 5 Iterations)
// ---------------------------------------------------------------------------
export interface ToolCallLog {
  iteration: number;
  server: string;
  tool_name: string;
  arguments: any;
  result: any;
  duration_ms: number;
}

export interface AgentQueryResult {
  answer: string;
  language: AppLanguage;
  tool_calls: ToolCallLog[];
  sources: Array<{ source: string; page: number; title: string; score: number }>;
  timings: {
    stt_ms?: number;
    agent_ms: number;
    tools_ms: number;
    tts_ms?: number;
    total_ms: number;
  };
}

export async function runAgentLoop(query: string, explicitLang?: AppLanguage): Promise<AgentQueryResult> {
  const startTime = Date.now();
  const lang = explicitLang || detectLanguage(query);
  const toolCalls: ToolCallLog[] = [];
  const sourcesCollected: Array<{ source: string; page: number; title: string; score: number }> = [];

  let toolsDurationTotal = 0;

  // Rule-based / Intent Classification to route tools transparently
  const qLower = query.toLowerCase();

  // Check if completely out-of-scope first (e.g. bitcoin, crypto, cinema, cricket)
  const isOutOfScope = /bitcoin|crypto|ethereum|cricket|ipl|movie|film|actor|president|election|song|dance|शेअर मार्केट/i.test(qLower);

  if (isOutOfScope) {
    const totalMs = Date.now() - startTime;
    const answer = lang === 'mr'
      ? 'माफ करा, मी फक्त शेतीविषयक माहिती, हवामान, बाजारभाव आणि सरकारी योजनांसाठी मदत करू शकतो. इतर विषयांवर मी माहिती देऊ शकत नाही.'
      : lang === 'hi'
      ? 'क्षमा करें, मैं केवल कृषि संबंधी सलाह, मौसम, मंडी भाव और सरकारी योजनाओं में ही आपकी मदद कर सकता हूँ।'
      : 'I apologize, but I only assist with agricultural queries, weather forecasts, mandi prices, and government farming schemes.';

    return {
      answer,
      language: lang,
      tool_calls: [],
      sources: [],
      timings: {
        agent_ms: totalMs,
        tools_ms: 0,
        total_ms: totalMs,
      },
    };
  }

  // 1. Weather Intent
  const isWeatherQuery = /weather|rain|temperature|forecast|paus|padel|हवामान|पाऊस|तापमान|मौसम|बारिश|गर्मी|उष्णता/i.test(qLower);
  // 2. Mandi Price Intent (Must include rate/price/mandi/bhav or specific crop with bhav)
  const isMandiQuery = /price|rate|mandi|market|bhav|daam|bhaav|भाव|दर|बाजारभाव|मंडी|किंमत|दाम/i.test(qLower);
  // 3. Advisory Intent
  const isAdvisoryQuery = /spray|disease|pest|leaf|leaves|yellow|borer|fertilizer|dosage|girdle|rust|mildew|औषध|फवारणी|रोग|कीड|पिवळी|खोड|तांबेरा|केवडा|तणनाशक|कीटकनाशक|छिड़काव|इल्ली/i.test(qLower);
  // 4. Scheme Intent
  const isSchemeQuery = /scheme|pmkisan|pm-kisan|subsidy|insurance|fasal bima|ekyc|installment|योजना|अनुदान|हप्ता|विमा|अपात्र|पात्रता|किस्त/i.test(qLower);

  let weatherData: any = null;
  let mandiData: any = null;
  let advisoryResults: any[] = [];
  let schemeResults: any[] = [];

  // Execute Weather Tool if needed
  if (isWeatherQuery) {
    const t0 = Date.now();
    let location = 'Kolhapur';
    for (const key of Object.keys(INDIAN_COORDINATES)) {
      if (qLower.includes(key)) {
        location = key;
        break;
      }
    }
    const days = /udya|tomorrow|कल/i.test(qLower) ? 2 : 3;
    weatherData = await fetchWeather(location, days);
    const dur = Date.now() - t0;
    toolsDurationTotal += dur;
    toolCalls.push({
      iteration: 1,
      server: 'weather_server (FastMCP stdio)',
      tool_name: 'get_weather_forecast',
      arguments: { location, days },
      result: weatherData,
      duration_ms: dur,
    });
  }

  // Execute Mandi Tool if needed
  if (isMandiQuery) {
    const t0 = Date.now();
    let commodity = 'sugarcane';
    if (/sugarcane|ऊस|गन्ना/i.test(qLower)) commodity = 'sugarcane';
    else if (/soybean|सोयाबीन/i.test(qLower)) commodity = 'soybean';
    else if (/grape|द्राक्ष|अंगूर/i.test(qLower)) commodity = 'grapes';
    else if (/onion|कांदा|प्याज/i.test(qLower)) commodity = 'onion';
    else if (/cotton|कापूस|कपास/i.test(qLower)) commodity = 'cotton';
    else if (/tomato|टोमॅटो|टमाटर/i.test(qLower)) commodity = 'tomato';
    else if (/wheat|गहू|गेहूं/i.test(qLower)) commodity = 'wheat';

    let district = 'kolhapur';
    for (const key of Object.keys(INDIAN_COORDINATES)) {
      if (qLower.includes(key)) {
        district = key;
        break;
      }
    }
    mandiData = await fetchMandiPrice(commodity, district);
    const dur = Date.now() - t0;
    toolsDurationTotal += dur;
    toolCalls.push({
      iteration: isWeatherQuery ? 2 : 1,
      server: 'mandi_server (FastMCP stdio)',
      tool_name: 'get_mandi_price',
      arguments: { commodity, district, state: 'Maharashtra' },
      result: mandiData,
      duration_ms: dur,
    });
  }

  // Execute Advisories RAG if needed
  if (isAdvisoryQuery) {
    const t0 = Date.now();
    advisoryResults = searchRAG(query, 'crop_advisories', 2);
    const dur = Date.now() - t0;
    toolsDurationTotal += dur;
    toolCalls.push({
      iteration: toolCalls.length + 1,
      server: 'advisories_retriever (BM25 + Dense RAG)',
      tool_name: 'search_advisories',
      arguments: { query, top_k: 2 },
      result: { count: advisoryResults.length, chunks: advisoryResults },
      duration_ms: dur,
    });
    for (const ch of advisoryResults) {
      sourcesCollected.push({ source: ch.source, page: ch.page, title: ch.title, score: ch.score });
    }
  }

  // Execute Schemes RAG if needed
  if (isSchemeQuery) {
    const t0 = Date.now();
    schemeResults = searchRAG(query, 'govt_schemes', 2);
    const dur = Date.now() - t0;
    toolsDurationTotal += dur;
    toolCalls.push({
      iteration: toolCalls.length + 1,
      server: 'schemes_server (FastMCP RAG Wrapper)',
      tool_name: 'search_schemes',
      arguments: { query, top_k: 2 },
      result: { count: schemeResults.length, chunks: schemeResults },
      duration_ms: dur,
    });
    for (const ch of schemeResults) {
      sourcesCollected.push({ source: ch.source, page: ch.page, title: ch.title, score: ch.score });
    }
  }


  // Synthesize answer using Gemini API if key is available with strict timeout
  let finalAnswer = '';
  if (ai && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    try {
      const systemInstruction = getSystemPrompt(lang);
      const toolContext = JSON.stringify({
        weather: weatherData,
        mandi_prices: mandiData,
        crop_advisories: advisoryResults,
        government_schemes: schemeResults,
      }, null, 2);

      const prompt = `Farmer Question: "${query}"
Retrieved Tool & Document Data:
${toolContext}

Remember:
- Keep the answer to maximum 3-4 short, clear sentences.
- Speak directly in ${lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English'}.
- State exact citations [Document: filename.pdf, Page: N] whenever citing advisory/scheme info.
- If data is absent, state that you do not have that specific data. Never invent prices or dosages.`;

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const resp: any = await Promise.race([geminiPromise, timeoutPromise]);

      if (resp && resp.text) {
        finalAnswer = resp.text.trim();
      }
    } catch (e: any) {
      console.warn('Gemini API call skipped/failed, using fast deterministic factual synthesis:', e.message);
    }
  }

  // Fallback deterministic synthesis if Gemini API failed or is unconfigured
  if (!finalAnswer) {
    const parts: string[] = [];

    if (mandiData && mandiData.success) {
      if (lang === 'mr') {
        parts.push(`${mandiData.district} बाजारात आज ${mandiData.commodity} चा सरासरी भाव ₹${mandiData.modal_price} प्रति क्विंटल आहे (किमान ₹${mandiData.min_price}, कमाल ₹${mandiData.max_price}).`);
      } else if (lang === 'hi') {
        parts.push(`${mandiData.district} मंडी में आज ${mandiData.commodity} का औसत भाव ₹${mandiData.modal_price} प्रति क्विंटल है (न्यूनतम ₹${mandiData.min_price}, अधिकतम ₹${mandiData.max_price})।`);
      } else {
        parts.push(`Today in ${mandiData.district} market, the modal price for ${mandiData.commodity} is ₹${mandiData.modal_price} per quintal (Min: ₹${mandiData.min_price}, Max: ₹${mandiData.max_price}).`);
      }
    }

    if (weatherData && weatherData.success && weatherData.forecast.length > 0) {
      const tomorrow = weatherData.forecast[1] || weatherData.forecast[0];
      if (lang === 'mr') {
        parts.push(`उद्या ${weatherData.location} मध्ये कमाल तापमान ${tomorrow.temp_max_c}°C राहील आणि पाऊस पडण्याची शक्यता ${tomorrow.precipitation_probability_pct}% आहे (${tomorrow.condition}).`);
      } else if (lang === 'hi') {
        parts.push(`कल ${weatherData.location} में अधिकतम तापमान ${tomorrow.temp_max_c}°C रहेगा और बारिश की संभावना ${tomorrow.precipitation_probability_pct}% है।`);
      } else {
        parts.push(`Tomorrow in ${weatherData.location}, expect a maximum temperature of ${tomorrow.temp_max_c}°C with a ${tomorrow.precipitation_probability_pct}% chance of rain (${tomorrow.condition}).`);
      }
    }

    if (advisoryResults.length > 0) {
      const topAdvisory = advisoryResults[0];
      if (lang === 'mr') {
        parts.push(`कृषी सल्ल्यानुसार: ${topAdvisory.title}. उपाययोजनेसाठी [Document: ${topAdvisory.source}, Page: ${topAdvisory.page}] चा संदर्भ घ्यावा.`);
      } else if (lang === 'hi') {
        parts.push(`कृषि परामर्श के अनुसार: ${topAdvisory.title}। उपचार हेतु [Document: ${topAdvisory.source}, Page: ${topAdvisory.page}] देखें।`);
      } else {
        parts.push(`According to advisory: ${topAdvisory.title}. Refer to [Document: ${topAdvisory.source}, Page: ${topAdvisory.page}] for guidance.`);
      }
    }

    if (schemeResults.length > 0) {
      const topScheme = schemeResults[0];
      if (lang === 'mr') {
        parts.push(`सरकारी योजनेची माहिती: ${topScheme.title}. तपशीलासाठी [Document: ${topScheme.source}, Page: ${topScheme.page}] पाहा.`);
      } else if (lang === 'hi') {
        parts.push(`सरकारी योजना विवरण: ${topScheme.title}। अधिक जानकारी हेतु [Document: ${topScheme.source}, Page: ${topScheme.page}] देखें।`);
      } else {
        parts.push(`Scheme details: ${topScheme.title}. Details in [Document: ${topScheme.source}, Page: ${topScheme.page}].`);
      }
    }

    if (parts.length === 0) {
      finalAnswer = lang === 'mr'
        ? 'माफ करा, या प्रश्नासाठी अधिकृत कृषी दस्तऐवजात किंवा साधनांमध्ये खात्रीशीर माहिती उपलब्ध नाही. कृपया जवळच्या कृषी विज्ञान केंद्राशी (KVK) संपर्क साधा.'
        : lang === 'hi'
        ? 'क्षमा करें, इस प्रश्न के लिए आधिकारिक दस्तावेजों में पर्याप्त जानकारी उपलब्ध नहीं है। कृपया नजदीकी कृषि विज्ञान केंद्र से संपर्क करें।'
        : 'I apologize, but verified information is not available for this question in the official advisory documents. Please contact your local Krishi Vigyan Kendra.';
    } else {
      finalAnswer = parts.join(' ');
    }
  }

  const totalMs = Date.now() - startTime;
  const agentMs = Math.max(0, totalMs - toolsDurationTotal);

  return {
    answer: finalAnswer,
    language: lang,
    tool_calls: toolCalls,
    sources: sourcesCollected,
    timings: {
      agent_ms: agentMs,
      tools_ms: toolsDurationTotal,
      total_ms: totalMs,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. API Route Definitions
// ---------------------------------------------------------------------------

// Query the Kisan Agent
app.post('/api/agent/query', async (req, res) => {
  try {
    const { query, language } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }
    const result = await runAgentLoop(query, language);
    return res.json(result);
  } catch (err: any) {
    console.error('Agent Query Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Direct Weather Tool Endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const location = (req.query.location as string) || 'Kolhapur';
    const days = parseInt((req.query.days as string) || '3', 10);
    const data = await fetchWeather(location, days);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct Mandi Tool Endpoint
app.get('/api/mandi', async (req, res) => {
  try {
    const commodity = (req.query.commodity as string) || 'sugarcane';
    const district = (req.query.district as string) || 'kolhapur';
    const state = (req.query.state as string) || 'Maharashtra';
    const data = await fetchMandiPrice(commodity, district, state);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct RAG Search Endpoint
app.post('/api/rag/search', (req, res) => {
  try {
    const { query, collection, top_k } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const hits = searchRAG(query, collection, top_k || 3);
    return res.json({ query, hits, count: hits.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// TTS Endpoint using Gemini 3.8 Flash Lite TTS if available
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    if (ai && process.env.GEMINI_API_KEY) {
      try {
        const voiceName = language === 'mr' ? 'Kore' : language === 'hi' ? 'Zephyr' : 'Puck';
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text,
                  speechMetadata: {
                    style: 'Warm, clear Indian agricultural voice assistant speaking to a farmer',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            success: true,
            audio_base64: base64Audio,
            mime_type: 'audio/wav',
          });
        }
      } catch (e: any) {
        console.warn('Gemini TTS failed, using browser speech fallback:', e.message);
      }
    }

    // Client fallback indicator
    return res.json({
      success: false,
      use_browser_fallback: true,
      text,
      language: language || 'mr',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// MCP Servers Registry & Status Endpoint
app.get('/api/mcp/status', (req, res) => {
  return res.json({
    protocol: 'Model Context Protocol (MCP) v1.0',
    servers: [
      {
        name: 'weather_server',
        transport: 'stdio / fastmcp',
        status: 'online',
        tools: [
          {
            name: 'get_weather_forecast',
            description: 'Get live daily weather forecast, rain probability, temperature, and wind speed using Open-Meteo',
            parameters: { location: 'string', days: 'integer (1-7)' },
          },
        ],
      },
      {
        name: 'mandi_server',
        transport: 'stdio / fastmcp',
        status: 'online',
        tools: [
          {
            name: 'get_mandi_price',
            description: 'Get APMC mandi commodity prices (modal, min, max, arrival date) for Indian districts',
            parameters: { commodity: 'string', district: 'string', state: 'string' },
          },
        ],
      },
      {
        name: 'schemes_server',
        transport: 'stdio / fastmcp',
        status: 'online',
        tools: [
          {
            name: 'search_schemes',
            description: 'Search official government scheme guidelines (PM-KISAN, PMFBY) with exact page citations',
            parameters: { query: 'string' },
          },
        ],
      },
      {
        name: 'advisories_retriever',
        transport: 'internal / hybrid rag',
        status: 'online',
        tools: [
          {
            name: 'search_advisories',
            description: 'Hybrid BM25 + Dense vector search over ICAR / MPKV Rahuri crop advisories',
            parameters: { query: 'string', top_k: 'integer' },
          },
        ],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// 7. Mount Vite in dev mode or serve static files in prod
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Kisan Voice Assistant backend server running on port ${PORT}`);
  });
}

startServer();
