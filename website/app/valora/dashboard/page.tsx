"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import AddressAutocomplete, { type PlaceResult } from "@/components/AddressAutocomplete";
import StreetView from "@/components/StreetView";
import NearbyAmenities from "@/components/NearbyAmenities";
import PropertyMap from "@/components/PropertyMap";
import { getStreetViewUrl, isGoogleMapsConfigured } from "@/lib/google-maps";

// Property Types
const PROPERTY_TYPES = [
  { id: "single-family", name: "Single Family", icon: "🏠" },
  { id: "multifamily", name: "Multifamily", icon: "🏢" },
  { id: "commercial", name: "Commercial", icon: "🏬" },
  { id: "industrial", name: "Industrial", icon: "🏭" },
  { id: "retail", name: "Retail", icon: "🛒" },
  { id: "office", name: "Office", icon: "🏛️" },
  { id: "mixed-use", name: "Mixed Use", icon: "🏗️" },
  { id: "land", name: "Land", icon: "🌍" },
  { id: "hospitality", name: "Hospitality", icon: "🏨" },
  { id: "self-storage", name: "Self Storage", icon: "📦" },
];

// Rent Roll Unit Interface
interface RentRollUnit {
  id: string;
  unitNumber: string;
  unitType: string;
  sqft: number;
  beds?: number;
  baths?: number;
  monthlyRent: number;
  marketRent: number;
  leaseStart: string;
  leaseEnd: string;
  tenant: string;
  status: "occupied" | "vacant" | "notice";
}

// Operating Expense Interface
interface OperatingExpense {
  id: string;
  category: string;
  annual: number;
  monthly: number;
  perUnit?: number;
  perSqft?: number;
}

// Saved Workspace Interface
interface SavedWorkspace {
  id: string;
  name: string;
  date: string;
  address: string;
  propertyType: string;
  valuation: ValuationResult | null;
  underwriting: UnderwritingData | null;
  comps: CompProperty[];
  images: string[];
  notes: string;
  rentRoll: RentRollUnit[];
  expenses: OperatingExpense[];
  isPublic: boolean;
  askingPrice?: number;
  listingDate?: string;
  purchasePrice?: string;
  downPaymentPercent?: string;
  interestRate?: string;
  loanTerm?: string;
  grossRent?: string;
  vacancyRate?: string;
  operatingExpenseRatio?: string;
}

// Valuation Result Interface
interface ValuationResult {
  estimatedValue: number;
  valueRange: { low: number; high: number };
  confidence: number;
  approaches: {
    income: { value: number; capRate: number; noi: number };
    sales: { value: number; pricePerSqft: number; adjustedComps: number };
    cost: { value: number; landValue: number; improvements: number; depreciation: number };
  };
  marketFactors: string[];
  improvements: ImprovementItem[];
  conditionScore: number;
  marketTrendAdjustment?: {
    adjustmentPercent: number;
    adjustmentAmount: number;
    preAdjustmentValue: number;
    marketTemperature: string;
    trendDirection: string;
    annualAppreciationRate: number;
  };
}

// Comp Property Interface
interface CompProperty {
  id: string;
  address: string;
  distance: string;
  salePrice: number;
  saleDate: string;
  sqft: number;
  pricePerSqft: number;
  propertyType: string;
  yearBuilt: number;
  beds?: number;
  baths?: number;
  units?: number;
  capRate?: number;
  adjustments?: string;
  googleValidated?: boolean;
  lat?: number;
  lng?: number;
  daysAgo?: number;
  recencyScore?: number;
  recencyLabel?: string;
  verified?: boolean;         // true = from RentCast real sales data
  distanceMiles?: number;
}

// Improvement Item Interface
interface ImprovementItem {
  area: string;
  issue: string;
  recommendation: string;
  specificChanges?: string[];
  estimatedCost: number;
  costRange?: { low: number; high: number };
  potentialValueAdd: number;
  roiPercent?: number;
  timeframe?: string;
  costBasis?: string;
  valueRationale?: string;
  priority: "high" | "medium" | "low";
}

// Underwriting Data Interface
interface UnderwritingData {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyPayment: number;
  annualDebtService: number;
  grossRent: number;
  vacancy: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  cashFlow: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  grm: number;
  // Enhanced fields
  closingCosts?: number;
  totalCashRequired?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  annualMaintenance?: number;
  annualReserves?: number;
  breakEvenOccupancy?: number;
  pricePerUnit?: number;
  pricePerSqft?: number;
}

// Sale History Record
interface SaleRecord {
  date: string;
  price: number;
  buyer?: string;
  seller?: string;
  type?: string;
}

// Property Records Data (from public records / RentCast)
interface PropertyRecordsData {
  source: "rentcast" | "openai" | "fallback";
  lotSizeAcres: number | null;
  lotSizeSqft: number | null;
  saleHistory: SaleRecord[];
  propertyDetails?: {
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    propertyType?: string;
    lastSaleDate?: string;
    lastSalePrice?: number;
  };
  disclaimer?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    plan: string;
    overageCount: number;
    overageCostCents: number;
    wasOverage: boolean;
  };
}

// Market Trends Data (from OpenAI real-time analysis)
interface MarketTrendsData {
  marketTemperature: "hot" | "warm" | "neutral" | "cool" | "cold";
  temperatureScore: number;
  annualAppreciationRate: number;
  trendDirection: "appreciating" | "stable" | "declining";
  trendVelocity: "rapid" | "moderate" | "slow";
  valueAdjustmentPercent: number;
  medianDaysOnMarket: number;
  inventoryLevel: string;
  buyerDemand: string;
  pricePerSqftTrend: {
    current: number;
    sixMonthsAgo: number;
    oneYearAgo: number;
    changePercent: number;
  };
  keyDrivers: string[];
  areaHighlights: string[];
  outlook12Month: string;
  confidenceInTrend: number;
}

// Property Enrichment Data Interface
interface PropertyEnrichmentData {
  propertyTax?: {
    effectiveTaxRate: number;
    annualTaxEstimate: number;
    assessmentRatio: number;
    taxJurisdiction: string;
    taxTrend: string;
  };
  insurance?: {
    annualPremiumEstimate: number;
    perSqftRate: number;
    coverageRecommendation: string;
    floodZoneRisk: string;
  };
  closingCosts?: {
    buyerClosingCostPercent: number;
    sellerClosingCostPercent: number;
    titleInsurance: number;
    transferTax: number;
    totalEstimatedClosingCosts: number;
  };
  maintenanceReserves?: {
    annualMaintenancePerSqft: number;
    annualMaintenanceTotal: number;
    capexReservePercent: number;
    replacementReservePerUnit: number;
  };
  operatingExpenseBenchmarks?: {
    propertyTaxAnnual: number;
    insuranceAnnual: number;
    utilitiesAnnual: number;
    repairsMaintenanceAnnual: number;
    propertyManagementPercent: number;
    propertyManagementAnnual: number;
    landscapingAnnual: number;
    trashRemovalAnnual: number;
    professionalFeesAnnual: number;
    reservesAnnual: number;
  };
  areaStatistics?: {
    medianHomePrice: number;
    medianRentPerSqft: number;
    averageCapRate: number;
    populationGrowth: number;
    employmentGrowthRate: number;
    averageDaysOnMarket: number;
    vacancyRate: number;
    rentGrowthRate: number;
  };
  currentMortgageRates?: {
    conventional30: number;
    conventional15: number;
    commercial: number;
    bridge: number;
  };
  source?: string;
  meta?: {
    location: string;
    propertyType: string;
    estimatedValue: number;
    generatedAt: string;
  };
}

// Default rates used before live data loads
const DEFAULT_RATES = {
  conventional30: 6.875,
  conventional15: 6.125,
  commercial: 7.50,
  bridge: 10.25,
  sba504: 6.75,
  fedFundsRate: null as number | null,
  prime: null as number | null,
  treasury10yr: null as number | null,
  lastUpdated: "",
  source: "loading...",
};

// Default Operating Expenses by Category
const DEFAULT_EXPENSES: OperatingExpense[] = [
  { id: "1", category: "Property Taxes", annual: 0, monthly: 0 },
  { id: "2", category: "Insurance", annual: 0, monthly: 0 },
  { id: "3", category: "Utilities", annual: 0, monthly: 0 },
  { id: "4", category: "Repairs & Maintenance", annual: 0, monthly: 0 },
  { id: "5", category: "Property Management", annual: 0, monthly: 0 },
  { id: "6", category: "Landscaping", annual: 0, monthly: 0 },
  { id: "7", category: "Trash Removal", annual: 0, monthly: 0 },
  { id: "8", category: "Professional Fees", annual: 0, monthly: 0 },
  { id: "9", category: "Reserves", annual: 0, monthly: 0 },
  { id: "10", category: "Other", annual: 0, monthly: 0 },
];

export default function ValoraDashboard() {
  const session: any = null;
  const status: string = "unauthenticated";
  const authRouter = useRouter();

  // Address & Property State
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [showPropertyTypes, setShowPropertyTypes] = useState(false);

  // Coordinates from Places autocomplete
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Property Details State
  const [sqft, setSqft] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [units, setUnits] = useState("1");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [comps, setComps] = useState<CompProperty[]>([]);
  const [activeTab, setActiveTab] = useState<"underwriting" | "rentroll" | "pnl" | "valuation" | "comps" | "improvements" | "map">("underwriting");

  // Photo State (optional) — each photo can have a label
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageLabels, setImageLabels] = useState<Record<number, string>>({});
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);

  // Underwriting State
  const [underwriting, setUnderwriting] = useState<UnderwritingData | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState("25");
  const [interestRate, setInterestRate] = useState(DEFAULT_RATES.commercial.toString());
  const [loanTerm, setLoanTerm] = useState("30");
  const [grossRent, setGrossRent] = useState("");
  const [vacancyRate, setVacancyRate] = useState("5");
  const [operatingExpenseRatio, setOperatingExpenseRatio] = useState("35");

  // Rent Roll State
  const [rentRoll, setRentRoll] = useState<RentRollUnit[]>([]);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState<Partial<RentRollUnit>>({
    unitNumber: "",
    unitType: "1BR",
    sqft: 0,
    monthlyRent: 0,
    marketRent: 0,
    leaseStart: "",
    leaseEnd: "",
    tenant: "",
    status: "occupied"
  });

  // Operating Expenses State
  const [expenses, setExpenses] = useState<OperatingExpense[]>(DEFAULT_EXPENSES);

  // Workspace State
  const [savedWorkspaces, setSavedWorkspaces] = useState<SavedWorkspace[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [showSavedWorkspaces, setShowSavedWorkspaces] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Property Records State (public records / RentCast)
  const [propertyRecords, setPropertyRecords] = useState<PropertyRecordsData | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  // Property Enrichment State
  const [enrichmentData, setEnrichmentData] = useState<PropertyEnrichmentData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentLoaded, setEnrichmentLoaded] = useState(false);

  // Market Trends State
  const [marketTrends, setMarketTrends] = useState<MarketTrendsData | null>(null);

  // Real Comps State (opt-in RentCast pulls)
  const [useRealComps, setUseRealComps] = useState(false);
  const [realCompsLookback, setRealCompsLookback] = useState<"6" | "9" | "12">("6");
  const [realCompsLimit, setRealCompsLimit] = useState("6");
  const [realComps, setRealComps] = useState<CompProperty[]>([]);
  const [isLoadingRealComps, setIsLoadingRealComps] = useState(false);
  const [realCompsLoaded, setRealCompsLoaded] = useState(false);
  const [realCompsMessage, setRealCompsMessage] = useState<string | null>(null);

  // Live Interest Rates State
  const [liveRates, setLiveRates] = useState(DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Direct underwrite mode (skip AI analysis)
  const [directUnderwrite, setDirectUnderwrite] = useState(false);

  // Marketplace State
  const [isPublic, setIsPublic] = useState(false);
  const [askingPrice, setAskingPrice] = useState("");
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState(false);

  // Fetch real-time interest rates on page load
  useEffect(() => {
    const fetchLiveRates = async () => {
      setRatesLoading(true);
      try {
        const res = await fetch('/api/interest-rates');
        if (res.ok) {
          const data = await res.json();
          if (data.success || data.conventional30) {
            setLiveRates({
              conventional30: data.conventional30 || DEFAULT_RATES.conventional30,
              conventional15: data.conventional15 || DEFAULT_RATES.conventional15,
              commercial: data.commercial || DEFAULT_RATES.commercial,
              bridge: data.bridge || DEFAULT_RATES.bridge,
              sba504: data.sba504 || DEFAULT_RATES.sba504,
              fedFundsRate: data.fedFundsRate ?? null,
              prime: data.prime ?? null,
              treasury10yr: data.treasury10yr ?? null,
              lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
              source: data.source || "live",
            });
            // Auto-update the interest rate input if user hasn't changed it yet
            if (interestRate === DEFAULT_RATES.commercial.toString() && data.commercial) {
              setInterestRate(data.commercial.toString());
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch live rates:", err);
      }
      setRatesLoading(false);
    };
    fetchLiveRates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if property type is NOT single-family (shows underwriting workspace)
  const isIncomeProperty = propertyType && propertyType !== "single-family" && propertyType !== "land";

  // Fetch property enrichment data (tax rates, insurance, area stats)
  const fetchEnrichmentData = async (enrichCity: string, enrichState: string, enrichZip?: string) => {
    if (!enrichCity || !enrichState) return;
    setIsEnriching(true);
    try {
      const res = await fetch('/api/ai/property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          city: enrichCity,
          state: enrichState,
          zipCode: enrichZip || zipCode,
          propertyType: propertyType || "residential",
          sqft: sqft ? parseInt(sqft) : undefined,
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
          units: units ? parseInt(units) : undefined,
          lotSizeAcres: lotSize ? parseFloat(lotSize) : undefined,
          saleHistory: propertyRecords?.saleHistory,
          saleHistorySource: propertyRecords?.source,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEnrichmentData(data);
          setEnrichmentLoaded(true);

          // Auto-populate P&L expenses from enrichment data
          if (data.operatingExpenseBenchmarks) {
            const b = data.operatingExpenseBenchmarks;
            setExpenses([
              { id: "1", category: "Property Taxes", annual: b.propertyTaxAnnual || 0, monthly: Math.round((b.propertyTaxAnnual || 0) / 12) },
              { id: "2", category: "Insurance", annual: b.insuranceAnnual || 0, monthly: Math.round((b.insuranceAnnual || 0) / 12) },
              { id: "3", category: "Utilities", annual: b.utilitiesAnnual || 0, monthly: Math.round((b.utilitiesAnnual || 0) / 12) },
              { id: "4", category: "Repairs & Maintenance", annual: b.repairsMaintenanceAnnual || 0, monthly: Math.round((b.repairsMaintenanceAnnual || 0) / 12) },
              { id: "5", category: "Property Management", annual: b.propertyManagementAnnual || 0, monthly: Math.round((b.propertyManagementAnnual || 0) / 12) },
              { id: "6", category: "Landscaping", annual: b.landscapingAnnual || 0, monthly: Math.round((b.landscapingAnnual || 0) / 12) },
              { id: "7", category: "Trash Removal", annual: b.trashRemovalAnnual || 0, monthly: Math.round((b.trashRemovalAnnual || 0) / 12) },
              { id: "8", category: "Professional Fees", annual: b.professionalFeesAnnual || 0, monthly: Math.round((b.professionalFeesAnnual || 0) / 12) },
              { id: "9", category: "Reserves", annual: b.reservesAnnual || 0, monthly: Math.round((b.reservesAnnual || 0) / 12) },
              { id: "10", category: "Other", annual: 0, monthly: 0 },
            ]);
          }

          // Update vacancy rate from area stats
          if (data.areaStatistics?.vacancyRate) {
            setVacancyRate(data.areaStatistics.vacancyRate.toString());
          }

          // Update interest rates if available
          if (data.currentMortgageRates?.commercial) {
            setInterestRate(data.currentMortgageRates.commercial.toString());
          }
        }
      }
    } catch (err) {
      console.error("Property enrichment error:", err);
    }
    setIsEnriching(false);
  };

  // Fetch property records (lot size, sale history) from public records
  const fetchPropertyRecords = async (recAddr: string, recCity: string, recState: string, recZip?: string) => {
    if (!recAddr || !recCity || !recState) return;
    setIsLoadingRecords(true);
    try {
      const res = await fetch('/api/property-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: recAddr,
          city: recCity,
          state: recState,
          zipCode: recZip,
          propertyType: propertyType || "residential",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPropertyRecords(data);
          setRecordsLoaded(true);

          // Auto-populate lot size if we got it and user hasn't entered one
          if (data.lotSizeAcres && !lotSize) {
            setLotSize(data.lotSizeAcres.toString());
          }

          // Auto-populate property details from records if available
          if (data.propertyDetails) {
            const d = data.propertyDetails;
            if (d.squareFeet && !sqft) setSqft(d.squareFeet.toString());
            if (d.yearBuilt && !yearBuilt) setYearBuilt(d.yearBuilt.toString());
            if (d.bedrooms && !beds) setBeds(d.bedrooms.toString());
            if (d.bathrooms && !baths) setBaths(d.bathrooms.toString());
          }
        }
      }
    } catch (err) {
      console.error("Property records error:", err);
    }
    setIsLoadingRecords(false);
  };

  // Fetch real comparable sales from RentCast (opt-in, counts against usage)
  const fetchRealComps = async () => {
    if (!address || !city || !state) return;
    setIsLoadingRealComps(true);
    setRealCompsMessage(null);
    try {
      const res = await fetch('/api/ai/real-comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address, city, state, zipCode,
          latitude: coordinates?.lat,
          longitude: coordinates?.lng,
          propertyType: propertyType || "single-family",
          lookbackMonths: realCompsLookback,
          limit: realCompsLimit,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comps && data.comps.length > 0) {
          const mapped: CompProperty[] = data.comps.map((c: Record<string, unknown>, i: number) => ({
            id: (c.id as string) || `rc_${i}`,
            address: (c.address as string) || `Comp ${i + 1}`,
            distance: c.distance != null ? `${(c.distance as number).toFixed(1)} mi` : "N/A",
            salePrice: (c.lastSalePrice as number) || 0,
            saleDate: (c.lastSaleDate as string) || "N/A",
            sqft: (c.squareFeet as number) || 0,
            pricePerSqft: (c.pricePerSqft as number) || 0,
            propertyType: (c.propertyType as string) || propertyType,
            yearBuilt: (c.yearBuilt as number) || 0,
            beds: (c.bedrooms as number) || undefined,
            baths: (c.bathrooms as number) || undefined,
            googleValidated: false,
            lat: (c.latitude as number) || undefined,
            lng: (c.longitude as number) || undefined,
            verified: true,
            distanceMiles: (c.distance as number) || undefined,
          }));
          setRealComps(mapped);
          setRealCompsLoaded(true);
          setRealCompsMessage(data.disclaimer || `${mapped.length} verified sales loaded.`);

          // Update usage display from property records if usage info returned
          if (data.usage && propertyRecords) {
            setPropertyRecords({
              ...propertyRecords,
              usage: {
                used: data.usage.used,
                limit: data.usage.limit,
                remaining: data.usage.remaining,
                plan: data.usage.plan,
                overageCount: data.usage.overageCount,
                overageCostCents: data.usage.overageCostCents,
                wasOverage: data.usage.wasOverage,
              },
            });
          }
        } else {
          setRealCompsMessage(data.message || "No recent sales found in this area.");
          setRealCompsLoaded(true);
        }
      }
    } catch (err) {
      console.error("Real comps error:", err);
      setRealCompsMessage("Failed to fetch real comparable sales.");
    }
    setIsLoadingRealComps(false);
  };

  // Handle Image Upload (supports replacing a specific photo via replaceIndex)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (replaceIndex !== null) {
      // Replace a single photo at the given index
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setUploadedImages(prev => {
            const updated = [...prev];
            updated[replaceIndex] = ev.target!.result as string;
            return updated;
          });
          // Preserve existing label for replaced photo
        }
        setReplaceIndex(null);
      };
      reader.readAsDataURL(file);
    } else {
      // Add new photos
      const newImages: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            newImages.push(ev.target.result as string);
            if (newImages.length === files.length) {
              setUploadedImages(prev => [...prev, ...newImages]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // Remove a photo and clean up its label
  const removePhoto = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImageLabels(prev => {
      const updated: Record<number, string> = {};
      // Re-index labels after removal
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) updated[ki] = v;
        else if (ki > index) updated[ki - 1] = v;
        // skip the removed index
      });
      return updated;
    });
  };

  // Trigger file input for replacing a specific photo
  const triggerReplace = (index: number) => {
    setReplaceIndex(index);
    fileInputRef.current?.click();
  };

  // Add Unit to Rent Roll
  const addUnit = () => {
    if (!newUnit.unitNumber) return;
    const unit: RentRollUnit = {
      id: Date.now().toString(),
      unitNumber: newUnit.unitNumber || "",
      unitType: newUnit.unitType || "1BR",
      sqft: newUnit.sqft || 0,
      beds: newUnit.beds,
      baths: newUnit.baths,
      monthlyRent: newUnit.monthlyRent || 0,
      marketRent: newUnit.marketRent || 0,
      leaseStart: newUnit.leaseStart || "",
      leaseEnd: newUnit.leaseEnd || "",
      tenant: newUnit.tenant || "",
      status: newUnit.status || "occupied"
    };
    setRentRoll(prev => [...prev, unit]);
    setNewUnit({
      unitNumber: "",
      unitType: "1BR",
      sqft: 0,
      monthlyRent: 0,
      marketRent: 0,
      leaseStart: "",
      leaseEnd: "",
      tenant: "",
      status: "occupied"
    });
    setShowAddUnit(false);
  };

  // Delete Unit from Rent Roll
  const deleteUnit = (id: string) => {
    setRentRoll(prev => prev.filter(u => u.id !== id));
  };

  // Update a field on an existing unit
  const updateUnit = (id: string, field: keyof RentRollUnit, value: string | number) => {
    setRentRoll(prev => prev.map(u => {
      if (u.id !== id) return u;
      if (field === "sqft" || field === "monthlyRent" || field === "marketRent") {
        return { ...u, [field]: parseInt(value as string) || 0 };
      }
      return { ...u, [field]: value };
    }));
  };

  // Update Expense
  const updateExpense = (id: string, field: "annual" | "monthly", value: number) => {
    setExpenses(prev => prev.map(exp => {
      if (exp.id === id) {
        if (field === "annual") {
          return { ...exp, annual: value, monthly: Math.round(value / 12) };
        } else {
          return { ...exp, monthly: value, annual: value * 12 };
        }
      }
      return exp;
    }));
  };

  // Calculate totals from rent roll
  const rentRollTotals = {
    totalUnits: rentRoll.length,
    occupiedUnits: rentRoll.filter(u => u.status === "occupied").length,
    vacantUnits: rentRoll.filter(u => u.status === "vacant").length,
    noticeUnits: rentRoll.filter(u => u.status === "notice").length,
    totalSqft: rentRoll.reduce((sum, u) => sum + u.sqft, 0),
    totalMonthlyRent: rentRoll.reduce((sum, u) => sum + (u.status === "occupied" ? u.monthlyRent : 0), 0),
    totalMarketRent: rentRoll.reduce((sum, u) => sum + u.marketRent, 0),
    occupancyRate: rentRoll.length > 0 ? (rentRoll.filter(u => u.status === "occupied").length / rentRoll.length * 100) : 0,
    lossToLease: rentRoll.filter(u => u.status === "occupied").reduce((sum, u) => sum + (u.marketRent - u.monthlyRent), 0),
  };

  // Calculate P&L totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.annual, 0);
  const grossPotentialRent = rentRollTotals.totalMarketRent * 12;
  const actualRent = rentRollTotals.totalMonthlyRent * 12;
  const vacancyLoss = grossPotentialRent - actualRent;
  const effectiveGrossIncome = actualRent;
  const noiFromPnL = effectiveGrossIncome - totalExpenses;

  // Run Full Analysis — calls AI comps API + optional image analysis
  const runAnalysis = async () => {
    if (!address || !propertyType) return;

    // Abort any in-flight analysis before starting a new one
    if (analysisAbortRef.current) analysisAbortRef.current.abort();
    const abortController = new AbortController();
    analysisAbortRef.current = abortController;

    setIsAnalyzing(true);

    const baseSqft = parseInt(sqft) || 2000;

    // Fetch AI-powered comps
    let aiComps: CompProperty[] = [];
    let marketSummary: { avgPricePerSqft: number; medianSalePrice: number; suggestedValue: number; valueRange: { low: number; high: number }; confidence: number; marketTrend: string; keyInsights: string[] } | null = null;

    try {
      const compsRes = await fetch('/api/ai/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          address, city, state, propertyType, sqft, beds, baths, yearBuilt, units, purchasePrice,
          lat: coordinates?.lat, lng: coordinates?.lng,
          lotSizeAcres: lotSize ? parseFloat(lotSize) : undefined,
          saleHistory: propertyRecords?.saleHistory,
          saleHistorySource: propertyRecords?.source,
        }),
      });
      if (compsRes.ok) {
        const compsData = await compsRes.json();
        if (compsData.comps) {
          aiComps = compsData.comps.map((c: Record<string, unknown>, i: number) => ({
            id: (c.id as string) || (i + 1).toString(),
            address: (c.address as string) || `Comp ${i + 1}`,
            distance: (c.distance as string) || "N/A",
            salePrice: (c.salePrice as number) || 0,
            saleDate: (c.saleDate as string) || "N/A",
            sqft: (c.sqft as number) || 0,
            pricePerSqft: (c.pricePerSqft as number) || 0,
            propertyType: (c.propertyType as string) || propertyType,
            yearBuilt: (c.yearBuilt as number) || 0,
            beds: c.beds as number | undefined,
            baths: c.baths as number | undefined,
            units: c.units as number | undefined,
            capRate: c.capRate as number | undefined,
            adjustments: (c.adjustments as string) || undefined,
            googleValidated: (c.googleValidated as boolean) || false,
            lat: c.lat as number | undefined,
            lng: c.lng as number | undefined,
            daysAgo: c.daysAgo as number | undefined,
            recencyScore: c.recencyScore as number | undefined,
            recencyLabel: (c.recencyLabel as string) || undefined,
          }));
        }
        if (compsData.marketSummary) {
          marketSummary = compsData.marketSummary;
        }
      }
    } catch (err) {
      console.error("Comps API error:", err);
    }

    // If AI comps failed, use basic fallback
    if (aiComps.length === 0) {
      const basePrice = baseSqft * 200;
      aiComps = [
        { id: "1", address: "123 Oak Street", distance: "0.3 mi", salePrice: Math.round(basePrice * 0.95), saleDate: "2025-10-15", sqft: Math.round(baseSqft * 1.05), pricePerSqft: 200, propertyType, yearBuilt: 1998, beds: 4, baths: 2.5 },
        { id: "2", address: "456 Maple Avenue", distance: "0.5 mi", salePrice: Math.round(basePrice * 0.92), saleDate: "2025-11-08", sqft: Math.round(baseSqft * 0.95), pricePerSqft: 198, propertyType, yearBuilt: 2001, beds: 3, baths: 2 },
        { id: "3", address: "789 Pine Road", distance: "0.7 mi", salePrice: Math.round(basePrice * 1.05), saleDate: "2025-09-28", sqft: Math.round(baseSqft * 1.12), pricePerSqft: 197, propertyType, yearBuilt: 2003, beds: 4, baths: 3 },
        { id: "4", address: "321 Elm Boulevard", distance: "0.9 mi", salePrice: Math.round(basePrice * 0.98), saleDate: "2025-12-20", sqft: Math.round(baseSqft * 1.02), pricePerSqft: 199, propertyType, yearBuilt: 1995, beds: 4, baths: 2 },
        { id: "5", address: "654 Cedar Lane", distance: "1.1 mi", salePrice: Math.round(basePrice * 1.02), saleDate: "2026-01-14", sqft: Math.round(baseSqft * 1.08), pricePerSqft: 196, propertyType, yearBuilt: 2005, beds: 4, baths: 2.5 },
      ];
    }

    // Merge real (RentCast) comps with AI comps if the user pulled them
    const hasRealComps = realCompsLoaded && realComps.length > 0;
    let mergedComps = aiComps;
    if (hasRealComps) {
      // Real comps go first (verified data), then AI comps that don't duplicate
      const realAddresses = new Set(realComps.map(c => c.address.toLowerCase()));
      const uniqueAiComps = aiComps.filter(c => !realAddresses.has(c.address.toLowerCase()));
      mergedComps = [...realComps, ...uniqueAiComps];
    }

    // Fetch real-time market trends for the area (runs in parallel with nothing — called after comps so we can pass comp data)
    let trendData: MarketTrendsData | null = null;
    try {
      const trendRes = await fetch('/api/ai/market-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          city, state, zipCode, propertyType, address,
          sqft,
          saleHistory: propertyRecords?.saleHistory,
          saleHistorySource: propertyRecords?.source,
          comps: mergedComps.map(c => ({ salePrice: c.salePrice, saleDate: c.saleDate, sqft: c.sqft, pricePerSqft: c.pricePerSqft })),
          currentEstimatedValue: marketSummary?.suggestedValue,
        }),
      });
      if (trendRes.ok) {
        const trendJson = await trendRes.json();
        if (trendJson.marketTrends) {
          trendData = trendJson.marketTrends;
          setMarketTrends(trendData);
        }
      }
    } catch (err) {
      console.error("Market trends API error:", err);
    }

    // Build valuation from comps data, grounded by real sale records when available
    const hasRealRecords = propertyRecords?.source === "rentcast" && propertyRecords?.saleHistory?.length > 0;
    const lastRealSalePrice = hasRealRecords ? propertyRecords!.saleHistory[0].price : null;
    const lastRealPpsf = lastRealSalePrice && baseSqft > 0 ? Math.round(lastRealSalePrice / baseSqft) : null;

    // Compute avg $/sqft from verified real comps when available (strongest anchor)
    const realCompsPpsf = hasRealComps
      ? (() => {
          const withPpsf = realComps.filter(c => c.pricePerSqft > 0);
          return withPpsf.length > 0 ? Math.round(withPpsf.reduce((a, b) => a + b.pricePerSqft, 0) / withPpsf.length) : null;
        })()
      : null;

    // Priority: real comps $/sqft > public records $/sqft > AI market summary > AI comps average
    const avgPricePerSqft = realCompsPpsf
      || lastRealPpsf
      || marketSummary?.avgPricePerSqft
      || Math.round(mergedComps.reduce((a, b) => a + b.pricePerSqft, 0) / mergedComps.length);

    // Compute value from real comps when available
    const realCompsValue = hasRealComps
      ? (() => {
          const withPrice = realComps.filter(c => c.salePrice > 0 && c.sqft > 0);
          if (withPrice.length === 0) return null;
          const avgPpsf = withPrice.reduce((a, b) => a + b.pricePerSqft, 0) / withPrice.length;
          return Math.round(baseSqft * avgPpsf);
        })()
      : null;

    // Blend values: real comps (strongest) > real sale history > AI market estimate
    let preAdjustmentValue: number;
    if (hasRealComps && realCompsValue && lastRealSalePrice && marketSummary?.suggestedValue) {
      // All three sources: 50% real comps, 30% real sale history, 20% AI
      preAdjustmentValue = Math.round(realCompsValue * 0.50 + lastRealSalePrice * 0.30 + marketSummary.suggestedValue * 0.20);
    } else if (hasRealComps && realCompsValue && marketSummary?.suggestedValue) {
      // Real comps + AI: 65% real comps, 35% AI
      preAdjustmentValue = Math.round(realCompsValue * 0.65 + marketSummary.suggestedValue * 0.35);
    } else if (hasRealComps && realCompsValue) {
      // Real comps only
      preAdjustmentValue = realCompsValue;
    } else if (lastRealSalePrice && marketSummary?.suggestedValue) {
      // Real sale history + AI (original logic)
      preAdjustmentValue = Math.round(lastRealSalePrice * 0.6 + marketSummary.suggestedValue * 0.4);
    } else {
      preAdjustmentValue = lastRealSalePrice || marketSummary?.suggestedValue || baseSqft * avgPricePerSqft;
    }

    // Apply market trend adjustment to reflect current area conditions
    const trendAdjustmentPct = trendData?.valueAdjustmentPercent ?? 0;
    const trendAdjustmentAmount = Math.round(preAdjustmentValue * (trendAdjustmentPct / 100));
    const estimatedValue = preAdjustmentValue + trendAdjustmentAmount;

    const baseRange = marketSummary?.valueRange || { low: Math.round(preAdjustmentValue * 0.92), high: Math.round(preAdjustmentValue * 1.08) };
    // Shift value range by the same trend adjustment — tighten range with real comps
    const rangeWidth = hasRealComps ? 0.05 : 0; // ±5% tighter when grounded by real comps
    const valueRange = {
      low: Math.round((baseRange.low + trendAdjustmentAmount) * (1 + rangeWidth)),
      high: Math.round((baseRange.high + trendAdjustmentAmount) * (1 - rangeWidth)),
    };
    // Ensure low < high
    if (valueRange.low > valueRange.high) {
      const mid = Math.round((valueRange.low + valueRange.high) / 2);
      valueRange.low = Math.round(mid * 0.95);
      valueRange.high = Math.round(mid * 1.05);
    }

    // Boost confidence when grounded by real data:
    //   Base AI confidence (~45-72) → +15 for real sale history → +20 for real comps (max 92)
    const baseConfidence = marketSummary?.confidence || 45;
    let confidence = baseConfidence;
    if (hasRealRecords) confidence = Math.min(confidence + 15, 80);
    if (hasRealComps) confidence = Math.min(confidence + 20, 92);

    // If photos uploaded, get AI image analysis for improvements
    let improvementItems: ImprovementItem[] = [];
    let conditionScore = 75;

    if (uploadedImages.length > 0) {
      try {
        const base64Data = uploadedImages[0].replace(/^data:image\/\w+;base64,/, '');
        const imgRes = await fetch('/api/ai/improvements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({ imageBase64: base64Data, area: 'exterior-front' }),
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          conditionScore = imgData.overallScore || 72;
          if (imgData.improvements) {
            improvementItems = imgData.improvements.map((imp: Record<string, unknown>) => {
              const costObj = typeof imp.estimatedCost === 'object' && imp.estimatedCost !== null ? imp.estimatedCost as { low: number; high: number } : null;
              const lowCost = costObj?.low || 5000;
              const highCost = costObj?.high || lowCost * 1.5;
              const roiPct = (imp.potentialROI as number) || 150;
              return {
                area: (imp.title as string) || 'General',
                issue: (imp.description as string)?.split('.')[0] || 'Needs improvement',
                recommendation: (imp.description as string) || '',
                specificChanges: Array.isArray(imp.specificChanges) ? (imp.specificChanges as string[]) : undefined,
                estimatedCost: lowCost,
                costRange: { low: lowCost, high: highCost },
                potentialValueAdd: Math.round((lowCost * roiPct) / 100),
                roiPercent: roiPct,
                timeframe: (imp.timeframe as string) || undefined,
                costBasis: (imp.costBasis as string) || undefined,
                valueRationale: (imp.valueRationale as string) || undefined,
                priority: (imp.priority as string) || 'medium',
              };
            });
          }
        }
      } catch (err) {
        console.error("Image analysis error:", err);
      }
    }

    // If no photos uploaded, try using Google Street View as image source
    if (improvementItems.length === 0 && address && isGoogleMapsConfigured()) {
      try {
        const fullAddress = `${address}, ${city}, ${state} ${zipCode}`.trim();
        const streetViewUrl = getStreetViewUrl(fullAddress, { width: 600, height: 400 });
        if (streetViewUrl) {
          const svRes = await fetch('/api/ai/improvements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal,
            body: JSON.stringify({ imageUrl: streetViewUrl, area: 'exterior-front' }),
          });
          if (svRes.ok) {
            const svData = await svRes.json();
            conditionScore = svData.overallScore || 72;
            if (svData.improvements) {
              improvementItems = svData.improvements.map((imp: Record<string, unknown>) => {
                const costObj = typeof imp.estimatedCost === 'object' && imp.estimatedCost !== null ? imp.estimatedCost as { low: number; high: number } : null;
                const lowCost = costObj?.low || 5000;
                const highCost = costObj?.high || lowCost * 1.5;
                const roiPct = (imp.potentialROI as number) || 150;
                return {
                  area: (imp.title as string) || 'General',
                  issue: (imp.description as string)?.split('.')[0] || 'Needs improvement',
                  recommendation: (imp.description as string) || '',
                  specificChanges: Array.isArray(imp.specificChanges) ? (imp.specificChanges as string[]) : undefined,
                  estimatedCost: lowCost,
                  costRange: { low: lowCost, high: highCost },
                  potentialValueAdd: Math.round((lowCost * roiPct) / 100),
                  roiPercent: roiPct,
                  timeframe: (imp.timeframe as string) || undefined,
                  costBasis: (imp.costBasis as string) || undefined,
                  valueRationale: (imp.valueRationale as string) || undefined,
                  priority: (imp.priority as string) || 'medium',
                };
              });
            }
          }
        }
      } catch (err) {
        console.error("Street View analysis error:", err);
      }
    }

    // If no image-based improvements, use OpenAI recommendations based on property data
    if (improvementItems.length === 0) {
      try {
        const recRes = await fetch('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            propertyType,
            condition: 75,
            yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
            squareFeet: sqft ? parseInt(sqft) : undefined,
            issues: [],
          }),
        });
        if (recRes.ok) {
          const recData = await recRes.json();
          if (recData.recommendations && Array.isArray(recData.recommendations)) {
            improvementItems = recData.recommendations.map((rec: Record<string, unknown>) => {
              const cost = typeof rec.estimatedCost === 'string' ? parseInt((rec.estimatedCost as string).replace(/[^0-9]/g, '')) || 5000 : (rec.estimatedCost as number) || 5000;
              const valueAdd = typeof rec.valueIncrease === 'string' ? parseInt((rec.valueIncrease as string).replace(/[^0-9]/g, '')) || 10000 : (rec.valueIncrease as number) || 10000;
              return {
                area: (rec.recommendation as string)?.split(':')[0]?.trim() || 'General',
                issue: `${(rec.priority as string) || 'Medium'} priority improvement`,
                recommendation: (rec.recommendation as string) || '',
                specificChanges: Array.isArray(rec.specificChanges) ? (rec.specificChanges as string[]) : undefined,
                estimatedCost: cost,
                costRange: { low: cost, high: Math.round(cost * 1.4) },
                potentialValueAdd: valueAdd,
                roiPercent: cost > 0 ? Math.round((valueAdd / cost) * 100) : 100,
                timeframe: (rec.timeline as string) || undefined,
                costBasis: (rec.costBasis as string) || undefined,
                valueRationale: (rec.valueRationale as string) || undefined,
                priority: ((rec.priority as string) || 'medium').toLowerCase(),
              };
            });
          }
        }
      } catch (err) {
        console.error("Recommendations API error:", err);
      }
    }

    // Last resort fallback if both AI calls failed
    if (improvementItems.length === 0) {
      improvementItems = [
        { area: "Kitchen", issue: "Dated appliances and countertops", recommendation: "Update to modern stainless steel appliances and install quartz countertops. A kitchen refresh is one of the highest-ROI improvements because buyers prioritize kitchens above all other rooms when evaluating a home.", specificChanges: ["Replace countertops with white quartz (Calacatta or marble-look pattern)", "Install matching stainless steel appliance package (refrigerator, range, dishwasher, microwave)", "Replace cabinet hardware with brushed nickel or matte black pulls and knobs", "Add subway tile backsplash in white or light gray with contrasting grout", "Install under-cabinet LED strip lighting for task illumination", "Replace kitchen faucet with pull-down sprayer model in matching finish", "Update light fixtures to modern pendant or recessed LED lighting"], estimatedCost: 25000, costRange: { low: 25000, high: 40000 }, potentialValueAdd: 45000, roiPercent: 180, timeframe: "2-3 weeks", costBasis: "Appliance package ($3,000-$7,000), quartz countertops at $50-$100/sqft for ~40 sqft, installation labor at $40-$60/hr, plus cabinet hardware and backsplash updates.", valueRationale: "NAR Remodeling Impact Report shows minor kitchen remodels recover 75-80% of cost at resale. In competitive markets, updated kitchens command 3-7% higher sale prices. Cost-to-value ratio of 180% factors in buyer willingness to pay premium for move-in ready kitchens.", priority: "high" },
        { area: "Bathrooms", issue: "Original fixtures and tile", recommendation: "Remodel master bath and update fixtures in secondary baths. Modern bathrooms are the second most important feature for buyers, and dated bathrooms are a top reason properties sit on market longer.", specificChanges: ["Install new floating vanity with quartz countertop and undermount sink", "Replace faucets and showerheads with rain-style heads in brushed nickel or matte black", "Re-tile shower surround with large-format porcelain tile (12x24 or larger)", "Install frameless glass shower door to replace shower curtain or framed door", "Add modern LED-backlit mirror above vanity", "Replace toilet with comfort-height elongated bowl model", "Install new ceramic or porcelain floor tile in neutral gray or wood-look pattern"], estimatedCost: 18000, costRange: { low: 18000, high: 28000 }, potentialValueAdd: 30000, roiPercent: 167, timeframe: "2-4 weeks", costBasis: "Master bath full remodel ($12,000-$20,000) including new vanity, tile, fixtures, and shower/tub. Secondary bath fixture updates at $2,000-$4,000 each. Labor accounts for approximately 40% of total cost.", valueRationale: "Bathroom remodels recover 60-70% of cost per NARI data, but the indirect value is higher as updated baths reduce buyer objections and decrease days on market by an average of 12 days, leading to stronger offers.", priority: "high" },
        { area: "Exterior", issue: "Landscaping needs attention", recommendation: "Professional landscaping and curb appeal improvements including foundation plantings, fresh mulch, and seasonal color. Curb appeal creates the critical first impression that determines a buyer's emotional response to the property.", specificChanges: ["Plant foundation shrubs (boxwood, hydrangea, or holly) along front of house", "Add 3-4 inches of fresh hardwood mulch to all planting beds", "Install low-voltage LED path lights along walkway (6-10 fixtures)", "Mount modern coach-style sconces flanking the front door", "Plant seasonal color flowers in beds and window boxes", "Power wash driveway, walkways, and siding", "Paint or replace front door in a bold accent color (navy, red, or black)"], estimatedCost: 8000, costRange: { low: 8000, high: 15000 }, potentialValueAdd: 15000, roiPercent: 188, timeframe: "1-2 weeks", costBasis: "Professional landscape design ($500-$1,500), foundation plantings and trees ($2,000-$5,000), hardscape edging and mulch ($1,000-$3,000), outdoor lighting ($500-$1,500), and seasonal flowers/planters ($500-$1,000).", valueRationale: "Michigan State University research shows quality landscaping adds 5-11% to perceived home value. Curb appeal improvements have one of the highest ROIs in real estate at 100-200% because they affect every buyer who views the property.", priority: "medium" },
        { area: "HVAC", issue: "System approaching end of life", recommendation: "Replace with a high-efficiency HVAC system. While not a cosmetic improvement, HVAC replacement removes a major buyer concern and can be highlighted as a key selling feature that reduces future maintenance risk.", specificChanges: ["Install high-efficiency (16+ SEER) central air conditioning unit", "Replace furnace with 95%+ AFUE rated high-efficiency model", "Seal and insulate all accessible ductwork to reduce energy loss", "Install programmable smart thermostat (Nest, Ecobee, or similar)", "Add return air vents to rooms that lack them for better airflow", "Replace air filter with HEPA-rated filtration system"], estimatedCost: 12000, costRange: { low: 12000, high: 18000 }, potentialValueAdd: 18000, roiPercent: 150, timeframe: "2-3 days", costBasis: "High-efficiency furnace and AC unit ($6,000-$10,000), ductwork inspection and sealing ($500-$1,500), smart thermostat ($200-$500), installation labor ($2,000-$4,000), and disposal of old equipment.", valueRationale: "Energy Star estimates high-efficiency systems save $200-$400/year in energy costs. Appraisers typically add $10,000-$15,000 for a new HVAC system. Buyers discount properties with aging systems by $15,000-$25,000 to account for replacement risk.", priority: "medium" },
        { area: "Flooring", issue: "Carpet in living areas worn", recommendation: "Install hardwood or luxury vinyl plank flooring throughout living areas. Hard surface flooring is the most requested feature by today's buyers, and worn carpet is one of the top turn-offs during showings.", specificChanges: ["Remove existing carpet and padding from all living areas", "Repair and level subfloor where needed with self-leveling compound", "Install luxury vinyl plank flooring in oak or hickory finish (waterproof, 6mm+ thickness)", "Add matching quarter-round or shoe molding at all baseboards", "Install T-molding transitions at doorways between rooms", "Replace any damaged baseboards with matching painted trim"], estimatedCost: 10000, costRange: { low: 10000, high: 18000 }, potentialValueAdd: 20000, roiPercent: 200, timeframe: "3-5 days", costBasis: "Luxury vinyl plank at $3-$7/sqft material for approximately 1,000 sqft of living space, plus $2-$4/sqft for professional installation, including subfloor prep, transitions, and baseboards.", valueRationale: "NAR data shows hardwood/LVP floors recover 100-150% of cost. Real estate agents report that homes with hard surface flooring sell 10-15% faster. The 200% ROI accounts for both the direct value add and the elimination of a common buyer objection.", priority: "low" },
      ];
    }

    const marketFactors = [
      ...(hasRealComps ? [`${realComps.length} verified comparable sales from county records (avg $${realCompsPpsf || avgPricePerSqft}/sqft)`] : []),
      ...(hasRealRecords ? [`Last recorded sale: ${formatCurrency(lastRealSalePrice!)} ($${lastRealPpsf}/sqft) — from public records`] : []),
      ...(trendData ? [
        `Market temperature: ${trendData.marketTemperature.toUpperCase()} — ${trendData.trendDirection} at ${trendData.trendVelocity} pace`,
        `Annual appreciation: ${trendData.annualAppreciationRate > 0 ? "+" : ""}${trendData.annualAppreciationRate}%${trendAdjustmentPct !== 0 ? ` (${trendAdjustmentPct > 0 ? "+" : ""}${trendAdjustmentPct}% applied to valuation)` : ""}`,
        ...(trendData.areaHighlights || []),
      ] : []),
      ...(marketSummary?.keyInsights || []),
      ...(marketSummary?.keyInsights ? [] : [
        `Average price per sqft in ${city || "the area"}: $${avgPricePerSqft}`,
        `Market trend: ${marketSummary?.marketTrend || "stable"}`,
        `${mergedComps.length} comparable sales analyzed${hasRealComps ? ` (${realComps.length} verified + ${mergedComps.length - realComps.length} AI)` : ""}`,
        `Confidence level: ${confidence}%`,
      ]),
    ];

    // Income approach: use actual rent roll NOI when available, otherwise estimate from area cap rate
    const actualGrossRent = rentRoll.length > 0 ? rentRollTotals.totalMonthlyRent * 12 : (parseFloat(grossRent) * 12 || 0);
    const actualVacancy = parseFloat(vacancyRate) / 100 || 0.05;
    const actualEGI = actualGrossRent * (1 - actualVacancy);
    const actualOpex = rentRoll.length > 0 ? totalExpenses : actualEGI * (parseFloat(operatingExpenseRatio) / 100 || 0.35);
    const actualNOI = actualEGI - actualOpex;
    const areaCapRate = enrichmentData?.areaStatistics?.averageCapRate || (marketSummary as Record<string, unknown>)?.avgCapRate as number || 0;
    const incomeApproachCapRate = areaCapRate > 0 ? areaCapRate : 6.0;
    const incomeApproachValue = actualNOI > 0 ? Math.round(actualNOI / (incomeApproachCapRate / 100)) : Math.round(estimatedValue * 1.0);

    // Cost approach: estimate replacement cost from sqft if available
    const buildCostPerSqft = propertyType === "commercial" ? 175 : propertyType === "industrial" ? 100 : 150;
    const propertyAge = yearBuilt ? new Date().getFullYear() - parseInt(yearBuilt) : 20;
    const depreciationRate = Math.min(propertyAge * 0.012, 0.40); // 1.2% per year, max 40%
    // Use lot size for land value estimate when available (price per acre varies by area)
    const lotAcres = lotSize ? parseFloat(lotSize) : 0;
    const estLandValue = lotAcres > 0
      ? Math.round(lotAcres * (estimatedValue / (lotAcres + 1)) * 0.30) // Land typically 25-35% of total value, adjusted by lot size
      : Math.round(estimatedValue * 0.20);
    const replacementCost = baseSqft * buildCostPerSqft;
    const depreciationAmount = Math.round(replacementCost * depreciationRate);
    const costApproachValue = estLandValue + replacementCost - depreciationAmount;

    const valuationResult: ValuationResult = {
      estimatedValue,
      valueRange,
      confidence,
      approaches: {
        income: { value: incomeApproachValue, capRate: incomeApproachCapRate, noi: actualNOI > 0 ? Math.round(actualNOI) : Math.round(estimatedValue * (incomeApproachCapRate / 100)) },
        sales: { value: estimatedValue, pricePerSqft: avgPricePerSqft, adjustedComps: mergedComps.length },
        cost: { value: costApproachValue, landValue: estLandValue, improvements: replacementCost, depreciation: depreciationAmount },
      },
      marketFactors,
      improvements: improvementItems,
      conditionScore,
      ...(trendData && trendAdjustmentPct !== 0 ? {
        marketTrendAdjustment: {
          adjustmentPercent: trendAdjustmentPct,
          adjustmentAmount: trendAdjustmentAmount,
          preAdjustmentValue,
          marketTemperature: trendData.marketTemperature,
          trendDirection: trendData.trendDirection,
          annualAppreciationRate: trendData.annualAppreciationRate,
        },
      } : {}),
    };

    // Don't update state if this analysis was aborted
    if (abortController.signal.aborted) return;

    setComps(mergedComps);
    setValuation(valuationResult);
    if (!purchasePrice) {
      setPurchasePrice(estimatedValue.toString());
    }
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    setActiveTab("valuation");

    // Log the evaluation for owner audit trail and cache as future comp
    fetch("/api/ai/log-evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        city,
        state,
        zipCode,
        propertyType,
        sqft,
        yearBuilt,
        estimatedValue,
        confidence,
        compsCount: mergedComps.length,
        realCompsCount: hasRealComps ? realComps.length : 0,
        marketTemperature: trendData?.marketTemperature || null,
        usedPublicRecords: recordsLoaded,
        usedRealComps: hasRealComps,
        usedAiComps: true,
        usedMarketTrends: !!trendData,
        usedImageAnalysis: uploadedImages.length > 0,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
      }),
    }).catch(() => {});
  };

  // Calculate Underwriting
  const calculateUnderwriting = () => {
    const price = parseFloat(purchasePrice) || 0;
    if (price === 0) {
      setUnderwriting(null);
      return;
    }

    const downPmt = price * (parseFloat(downPaymentPercent) / 100);
    const loan = price - downPmt;
    const rate = parseFloat(interestRate) / 100 / 12;
    const term = parseFloat(loanTerm) * 12;
    // Guard against 0% interest rate: amortization formula divides by zero when rate is 0
    const monthly = rate > 0
      ? loan * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
      : term > 0 ? loan / term : 0;
    const annualDebt = monthly * 12;

    // Closing costs from enrichment data or estimate
    const closingCostPct = enrichmentData?.closingCosts?.buyerClosingCostPercent || 3.5;
    const closingCosts = Math.round(price * (closingCostPct / 100));
    const totalCashRequired = downPmt + closingCosts;

    // Property-specific costs from enrichment
    const annualPropertyTax = enrichmentData?.propertyTax?.annualTaxEstimate || enrichmentData?.operatingExpenseBenchmarks?.propertyTaxAnnual || 0;
    const annualInsurance = enrichmentData?.insurance?.annualPremiumEstimate || enrichmentData?.operatingExpenseBenchmarks?.insuranceAnnual || 0;
    const annualMaintenance = enrichmentData?.maintenanceReserves?.annualMaintenanceTotal || enrichmentData?.operatingExpenseBenchmarks?.repairsMaintenanceAnnual || 0;
    const annualReserves = enrichmentData?.operatingExpenseBenchmarks?.reservesAnnual || 0;

    // Use rent roll data if available, otherwise use manual input
    const gross = rentRoll.length > 0 ? rentRollTotals.totalMonthlyRent * 12 : (parseFloat(grossRent) * 12 || 0);
    const vacancy = parseFloat(vacancyRate) / 100;
    const egi = gross * (1 - vacancy);

    // Use P&L expenses if available
    const opex = rentRoll.length > 0 ? totalExpenses : egi * (parseFloat(operatingExpenseRatio) / 100);
    const noi = egi - opex;
    const cf = noi - annualDebt;

    // Break-even occupancy: what occupancy % is needed to cover all expenses + debt
    const breakEvenOcc = gross > 0 ? ((opex + annualDebt) / gross) * 100 : 0;

    setUnderwriting({
      purchasePrice: price,
      downPayment: downPmt,
      loanAmount: loan,
      interestRate: parseFloat(interestRate),
      loanTerm: parseFloat(loanTerm),
      monthlyPayment: monthly,
      annualDebtService: annualDebt,
      grossRent: gross,
      vacancy: vacancy * 100,
      effectiveGrossIncome: egi,
      operatingExpenses: opex,
      noi,
      cashFlow: cf,
      capRate: price > 0 ? (noi / price) * 100 : 0,
      cashOnCash: totalCashRequired > 0 ? (cf / totalCashRequired) * 100 : 0,
      dscr: annualDebt > 0 ? noi / annualDebt : 0,
      grm: gross > 0 ? price / gross : 0,
      closingCosts: closingCosts,
      totalCashRequired: totalCashRequired,
      annualPropertyTax: annualPropertyTax,
      annualInsurance: annualInsurance,
      annualMaintenance: annualMaintenance,
      annualReserves: annualReserves,
      breakEvenOccupancy: Math.min(breakEvenOcc, 100),
      pricePerUnit: parseInt(units) > 1 ? Math.round(price / parseInt(units)) : undefined,
      pricePerSqft: parseInt(sqft) > 0 ? Math.round(price / parseInt(sqft)) : undefined,
    });
  };

  useEffect(() => {
    if (purchasePrice || grossRent || rentRoll.length > 0) {
      calculateUnderwriting();
    }
  }, [purchasePrice, downPaymentPercent, interestRate, loanTerm, grossRent, vacancyRate, operatingExpenseRatio, rentRoll, expenses, enrichmentData, sqft, units]);

  // Load saved workspaces from API on mount
  useEffect(() => {
    const loadSavedWorkspaces = async () => {
      try {
        const res = await fetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces) {
            setSavedWorkspaces(data.workspaces);
          }
        }
      } catch (err) {
        console.error("Failed to load workspaces:", err);
      }
    };
    if (session?.user) {
      loadSavedWorkspaces();
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save Workspace (persists to database)
  const saveWorkspace = async () => {
    const workspaceName_ = workspaceName || `${propertyType ? PROPERTY_TYPES.find(t => t.id === propertyType)?.name : "Property"} - ${address || "Underwriting"}`;

    const payload = {
      id: currentWorkspaceId || undefined,
      name: workspaceName_,
      address,
      city,
      state,
      zipCode,
      propertyType,
      sqft,
      lotSize,
      yearBuilt,
      units,
      beds,
      baths,
      valuation,
      underwriting,
      images: uploadedImages,
      imageLabels,
      notes,
      rentRoll,
      expenses,
      isPublic,
      askingPrice,
      purchasePrice,
      downPaymentPercent,
      interestRate,
      loanTerm,
      grossRent,
      vacancyRate,
      operatingExpenseRatio,
    };

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const newId = data.workspace?.id;
        if (newId && !currentWorkspaceId) {
          setCurrentWorkspaceId(newId);
        }

        // Refresh workspace list from server
        const listRes = await fetch('/api/workspaces');
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.workspaces) setSavedWorkspaces(listData.workspaces);
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        console.error("Save failed:", err);
        alert("Failed to save: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save workspace. Check your connection.");
    }
  };

  // Promote to Marketplace
  const promoteToMarketplace = () => {
    if (!askingPrice) return;
    setIsPublic(true);
    saveWorkspace();
    setShowPromoteModal(false);
    setPromoteSuccess(true);
    setTimeout(() => setPromoteSuccess(false), 3000);
  };

  // Load Workspace
  const loadWorkspace = (workspace: any) => {
    // Restore address fields - API returns individual fields or combined address
    if ((workspace as any).city) {
      // API workspace with individual fields
      setAddress(workspace.address && workspace.address !== "No address" ? workspace.address.split(",")[0]?.trim() : "");
      setCity((workspace as any).city || "");
      setState((workspace as any).state || "");
      setZipCode((workspace as any).zipCode || "");
    } else if (workspace.address && workspace.address !== "No address") {
      const addressParts = workspace.address.split(", ");
      setAddress(addressParts[0] || "");
      setCity(addressParts[1] || "");
      const stateZip = addressParts[2]?.split(" ") || [];
      setState(stateZip[0] || "");
      setZipCode(stateZip[1] || "");
    }
    setPropertyType(workspace.propertyType || "");
    setValuation(workspace.valuation);
    setUnderwriting(workspace.underwriting);
    setComps(workspace.comps || []);
    setUploadedImages(workspace.images || []);
    setImageLabels((workspace as any).imageLabels || {});
    setReplaceIndex(null);
    setNotes(workspace.notes || "");
    setWorkspaceName(workspace.name);
    setCurrentWorkspaceId(workspace.id);
    setRentRoll(workspace.rentRoll || []);
    setExpenses(workspace.expenses?.length > 0 ? workspace.expenses : DEFAULT_EXPENSES);
    setIsPublic(workspace.isPublic || false);
    setAskingPrice(workspace.askingPrice?.toString() || "");

    // Restore property details
    if ((workspace as any).sqft) setSqft((workspace as any).sqft);
    if ((workspace as any).lotSize) setLotSize((workspace as any).lotSize);
    if ((workspace as any).yearBuilt) setYearBuilt((workspace as any).yearBuilt);
    if ((workspace as any).units) setUnits((workspace as any).units);
    if ((workspace as any).beds) setBeds((workspace as any).beds);
    if ((workspace as any).baths) setBaths((workspace as any).baths);

    // Restore underwriting inputs
    if (workspace.purchasePrice) setPurchasePrice(workspace.purchasePrice);
    if (workspace.downPaymentPercent) setDownPaymentPercent(workspace.downPaymentPercent);
    if (workspace.interestRate) setInterestRate(workspace.interestRate);
    if (workspace.loanTerm) setLoanTerm(workspace.loanTerm);
    if (workspace.grossRent) setGrossRent(workspace.grossRent);
    if (workspace.vacancyRate) setVacancyRate(workspace.vacancyRate);
    if (workspace.operatingExpenseRatio) setOperatingExpenseRatio(workspace.operatingExpenseRatio);

    if (workspace.valuation) {
      setAnalysisComplete(true);
      setActiveTab("valuation");
    } else {
      setActiveTab("underwriting");
    }
    setShowSavedWorkspaces(false);
  };

  // Delete Workspace
  const deleteWorkspace = async (id: string) => {
    try {
      await fetch('/api/workspaces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Delete workspace error:", err);
    }
    setSavedWorkspaces(prev => prev.filter(w => w.id !== id));
    if (currentWorkspaceId === id) setCurrentWorkspaceId(null);
  };

  // Reset Analysis
  const resetAnalysis = () => {
    if (analysisAbortRef.current) { analysisAbortRef.current.abort(); analysisAbortRef.current = null; }
    setAddress(""); setCity(""); setState(""); setZipCode(""); setPropertyType("");
    setSqft(""); setLotSize(""); setYearBuilt(""); setUnits("1"); setBeds(""); setBaths("");
    setUploadedImages([]); setImageLabels({}); setReplaceIndex(null); setValuation(null); setUnderwriting(null); setComps([]);
    setAnalysisComplete(false); setCurrentWorkspaceId(null); setWorkspaceName(""); setNotes("");
    setPurchasePrice(""); setGrossRent(""); setActiveTab("underwriting");
    setRentRoll([]); setExpenses(DEFAULT_EXPENSES); setIsPublic(false); setAskingPrice("");
    setDownPaymentPercent("25"); setInterestRate(liveRates.commercial.toString()); setLoanTerm("30");
    setVacancyRate("5"); setOperatingExpenseRatio("35");
    setEnrichmentData(null); setEnrichmentLoaded(false); setCoordinates(null);
    setPropertyRecords(null); setRecordsLoaded(false);
  };

  // Sanitize HTML to prevent XSS in export windows
  const escapeHtml = (str: string): string =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Sanitize CSV field to prevent formula injection and quote escaping
  const escapeCSV = (str: string): string => {
    const escaped = str.replace(/"/g, '""');
    // Prefix with single-quote if field starts with a formula trigger character
    if (/^[=+\-@\t\r]/.test(escaped)) return `'${escaped}`;
    return escaped;
  };

  // Build summary rows used by both the on-screen table and exports
  const buildSummaryRows = (): Array<[string, string, string]> => {
    const rows: Array<[string, string, string]> = [];
    const fc = formatCurrency;
    const uw = underwriting;

    rows.push(["ACQUISITION", "", ""]);
    rows.push(["Purchase Price", uw ? fc(uw.purchasePrice) : "-", ""]);
    if (uw?.pricePerUnit) rows.push(["Price Per Unit", fc(uw.pricePerUnit), `${units} units`]);
    if (uw?.pricePerSqft) rows.push(["Price Per Sq Ft", `$${uw.pricePerSqft}`, `${parseInt(sqft).toLocaleString()} SF`]);
    rows.push(["Down Payment", uw ? fc(uw.downPayment) : "-", uw ? `${downPaymentPercent}%` : ""]);
    if (uw?.closingCosts) rows.push(["Est. Closing Costs", fc(uw.closingCosts), `${enrichmentData?.closingCosts?.buyerClosingCostPercent || 3.5}%`]);
    if (uw?.totalCashRequired) rows.push(["Total Cash Required", fc(uw.totalCashRequired), ""]);

    rows.push(["FINANCING", "", ""]);
    rows.push(["Loan Amount", uw ? fc(uw.loanAmount) : "-", ""]);
    rows.push(["Interest Rate", uw ? `${uw.interestRate}%` : "-", `via ${liveRates.source}`]);
    rows.push(["Loan Term", uw ? `${uw.loanTerm} years` : "-", ""]);
    rows.push(["Monthly Payment", uw ? fc(Math.round(uw.monthlyPayment)) : "-", ""]);
    rows.push(["Annual Debt Service", uw ? fc(Math.round(uw.annualDebtService)) : "-", ""]);

    rows.push(["INCOME", "", ""]);
    rows.push(["Gross Potential Rent", fc(grossPotentialRent), rentRoll.length > 0 ? `${rentRoll.length} units` : "manual input"]);
    rows.push(["Vacancy & Loss", `-${fc(vacancyLoss)}`, `${vacancyRate}%`]);
    rows.push(["Effective Gross Income", fc(effectiveGrossIncome), ""]);

    rows.push(["OPERATING EXPENSES", "", ""]);
    expenses.forEach(exp => {
      if (exp.annual > 0 || exp.monthly > 0) {
        rows.push([exp.category, `-${fc(exp.annual)}`, `${fc(exp.monthly)}/mo`]);
      }
    });
    rows.push(["Total Operating Expenses", `-${fc(totalExpenses)}`, effectiveGrossIncome > 0 ? `${((totalExpenses / effectiveGrossIncome) * 100).toFixed(1)}% ratio` : ""]);

    rows.push(["NET OPERATING INCOME", fc(noiFromPnL), ""]);

    rows.push(["CASH FLOW", "", ""]);
    rows.push(["NOI", fc(noiFromPnL), ""]);
    rows.push(["Less: Debt Service", uw ? `-${fc(Math.round(uw.annualDebtService))}` : "-", ""]);
    const annualCf = uw ? noiFromPnL - uw.annualDebtService : 0;
    rows.push(["Annual Cash Flow", fc(Math.round(annualCf)), ""]);
    rows.push(["Monthly Cash Flow", fc(Math.round(annualCf / 12)), ""]);

    rows.push(["RETURN METRICS", "", ""]);
    rows.push(["Cap Rate", uw ? `${uw.capRate.toFixed(2)}%` : "-", "NOI / Price"]);
    rows.push(["Cash-on-Cash Return", uw ? `${uw.cashOnCash.toFixed(2)}%` : "-", "Cash Flow / Total Cash In"]);
    rows.push(["DSCR", uw ? `${uw.dscr.toFixed(2)}x` : "-", "NOI / Debt Service"]);
    rows.push(["GRM", uw ? `${uw.grm.toFixed(2)}x` : "-", "Price / Gross Rent"]);
    if (uw?.breakEvenOccupancy) rows.push(["Break-Even Occupancy", `${uw.breakEvenOccupancy.toFixed(1)}%`, ""]);

    return rows;
  };

  // Export as CSV
  const exportCSV = () => {
    const rows = buildSummaryRows();
    const propertyLabel = address ? `${address}, ${city}, ${state}` : "Property Analysis";
    const header = `"Legacy RE Investment Summary"\n"${propertyLabel}"\n"Generated: ${new Date().toLocaleDateString()}"\n\n"Line Item","Value","Notes"\n`;
    const csvRows = rows.map(r => `"${escapeCSV(r[0])}","${escapeCSV(r[1])}","${escapeCSV(r[2])}"`).join("\n");
    const csv = header + csvRows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LegacyRE_${(address || "analysis").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as Excel (HTML table that Excel/Sheets can open)
  const exportExcel = () => {
    const rows = buildSummaryRows();
    const propertyLabel = escapeHtml(address ? `${address}, ${city}, ${state}` : "Property Analysis");
    const sectionStyle = 'style="background:#1e293b;color:#fff;font-weight:700;font-size:11pt;padding:8px 12px;"';
    const headerStyle = 'style="background:#f1f5f9;font-weight:600;padding:6px 12px;border-bottom:2px solid #334155;"';
    const rowStyle = 'style="padding:5px 12px;border-bottom:1px solid #e2e8f0;"';
    const highlightStyle = 'style="padding:5px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;background:#f0fdf4;"';

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:spreadsheet"><head><meta charset="UTF-8"><style>td{font-family:Calibri,Arial,sans-serif;font-size:10pt;}</style></head><body>`;
    html += `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;border:1px solid #cbd5e1;">`;
    html += `<tr><td colspan="3" style="background:#0f172a;color:#fff;font-size:14pt;font-weight:700;padding:12px;">Legacy RE — Investment Summary</td></tr>`;
    html += `<tr><td colspan="3" ${headerStyle}>${propertyLabel} | ${new Date().toLocaleDateString()}</td></tr>`;
    html += `<tr><td ${headerStyle}>Line Item</td><td ${headerStyle}>Value</td><td ${headerStyle}>Notes</td></tr>`;

    rows.forEach(r => {
      const isSection = r[0] === r[0].toUpperCase() && r[1] === "" && r[2] === "";
      const isNOI = r[0] === "NET OPERATING INCOME";
      const isTotalCash = r[0] === "Total Cash Required" || r[0] === "Annual Cash Flow";
      if (isSection) {
        html += `<tr><td colspan="3" ${sectionStyle}>${r[0]}</td></tr>`;
      } else if (isNOI || isTotalCash) {
        html += `<tr><td ${highlightStyle}>${r[0]}</td><td ${highlightStyle}>${r[1]}</td><td ${highlightStyle}>${r[2]}</td></tr>`;
      } else {
        html += `<tr><td ${rowStyle}>${r[0]}</td><td ${rowStyle}>${r[1]}</td><td ${rowStyle}>${r[2]}</td></tr>`;
      }
    });

    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LegacyRE_${(address || "analysis").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as PDF (print-optimized new window)
  const exportPDF = () => {
    const rows = buildSummaryRows();
    const propertyLabel = escapeHtml(address ? `${address}, ${city}, ${state} ${zipCode}` : "Property Analysis");
    const propInfo = escapeHtml([
      propertyType && PROPERTY_TYPES.find(t => t.id === propertyType)?.name,
      sqft && `${parseInt(sqft).toLocaleString()} SF`,
      units && parseInt(units) > 1 && `${units} Units`,
      yearBuilt && `Built ${yearBuilt}`,
    ].filter(Boolean).join(" · "));

    let html = `<!DOCTYPE html><html><head><title>Legacy RE — ${propertyLabel}</title><style>
      @page { margin: 0.6in; size: letter; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #1e293b; font-size: 9.5pt; line-height: 1.4; }
      .header { background: #0f172a; color: #fff; padding: 20px 24px; margin: -0.6in -0.6in 0; }
      .header h1 { font-size: 16pt; font-weight: 700; margin-bottom: 4px; }
      .header .subtitle { font-size: 9pt; opacity: 0.7; }
      .prop-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 2px solid #0f172a; margin: 20px 0 16px; }
      .prop-bar .addr { font-size: 11pt; font-weight: 700; }
      .prop-bar .info { font-size: 8.5pt; color: #64748b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      .section-header td { background: #1e293b; color: #fff; font-weight: 700; font-size: 8.5pt; letter-spacing: 0.5px; padding: 6px 10px; text-transform: uppercase; }
      .row td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; }
      .row td:nth-child(2) { text-align: right; font-weight: 600; white-space: nowrap; }
      .row td:nth-child(3) { text-align: right; color: #64748b; font-size: 8pt; }
      .row.highlight td { background: #f0fdf4; font-weight: 700; font-size: 9.5pt; border-bottom: 2px solid #16a34a; }
      .row.noi td { background: #ecfdf5; font-weight: 700; font-size: 10pt; }
      .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
      .metric-box { text-align: center; padding: 12px 8px; border: 1px solid #e2e8f0; border-radius: 6px; }
      .metric-box .label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
      .metric-box .val { font-size: 14pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
      .metric-box.green { border-color: #86efac; background: #f0fdf4; }
      .metric-box.green .val { color: #16a34a; }
      .metric-box.red { border-color: #fca5a5; background: #fef2f2; }
      .metric-box.red .val { color: #dc2626; }
      .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 7.5pt; color: #94a3b8; display: flex; justify-content: space-between; }
      @media print { .no-print { display: none; } }
    </style></head><body>`;

    html += `<div class="header"><h1>Legacy RE</h1><div class="subtitle">Investment Analysis Report</div></div>`;
    html += `<div class="prop-bar"><div class="addr">${propertyLabel}</div><div class="info">${propInfo} · ${new Date().toLocaleDateString()}</div></div>`;

    // Key metrics bar
    if (underwriting) {
      const uw = underwriting;
      const cfClass = uw.cashFlow >= 0 ? "green" : "red";
      const cocClass = uw.cashOnCash >= 5 ? "green" : uw.cashOnCash >= 0 ? "" : "red";
      html += `<div class="metrics">
        <div class="metric-box ${cfClass}"><div class="label">Annual Cash Flow</div><div class="val">${formatCurrency(Math.round(uw.cashFlow))}</div></div>
        <div class="metric-box ${cocClass}"><div class="label">Cash-on-Cash Return</div><div class="val">${uw.cashOnCash.toFixed(2)}%</div></div>
        <div class="metric-box"><div class="label">Cap Rate</div><div class="val">${uw.capRate.toFixed(2)}%</div></div>
        <div class="metric-box"><div class="label">DSCR</div><div class="val">${uw.dscr.toFixed(2)}x</div></div>
      </div>`;
    }

    // Full table
    html += `<table>`;
    rows.forEach(r => {
      const isSection = r[0] === r[0].toUpperCase() && r[1] === "" && r[2] === "";
      const isNOI = r[0] === "NET OPERATING INCOME";
      const isCf = r[0] === "Annual Cash Flow" || r[0] === "Total Cash Required";
      if (isSection) {
        html += `<tr class="section-header"><td colspan="3">${r[0]}</td></tr>`;
      } else if (isNOI) {
        html += `<tr class="row noi"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`;
      } else if (isCf) {
        html += `<tr class="row highlight"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`;
      } else {
        html += `<tr class="row"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`;
      }
    });
    html += `</table>`;

    html += `<div class="footer"><span>Generated by Legacy RE · legacyre.com</span><span>Rate data: ${liveRates.source} (${liveRates.lastUpdated})</span></div>`;
    html += `<div class="no-print" style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:10px 32px;font-size:11pt;font-weight:600;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;">Print / Save as PDF</button></div>`;
    html += `</body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  // Format Currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  // Get available tabs based on property type and analysis state
  const getAvailableTabs = () => {
    const tabs: Array<"underwriting" | "rentroll" | "pnl" | "valuation" | "comps" | "improvements" | "map"> = [];

    if (isIncomeProperty) {
      tabs.push("underwriting", "rentroll", "pnl");
    }

    if (analysisComplete) {
      tabs.push("valuation", "comps", "improvements", "map");
    }

    return tabs;
  };

  // Auth gate: redirect unauthenticated/demo users to sign in
  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    authRouter.push("/auth/signin");
    return null;
  }

  return (
    <main className="valora-dashboard-page">
      <Header />

      {/* Dashboard Header */}
      <section className="val-dash-header">
        <div className="container">
          <div className="val-dash-header-content">
            <div>
              <div className="val-breadcrumb">
                <Link href="/valora">Legacy RE</Link>
                <span>/</span>
                <span>Property Intelligence</span>
              </div>
              <h1>Property Analysis & Valuation</h1>
              <p>AI-powered valuations, comps, and underwriting for all property types</p>
            </div>
            <div className="val-dash-actions">
              <button
                className="val-dash-btn secondary"
                onClick={() => { resetAnalysis(); setDirectUnderwrite(true); setActiveTab("underwriting"); }}
                title="Go straight to underwriting — no AI analysis needed"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
                New Property
              </button>
              <Link href="/valora/marketplace" className="val-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Marketplace
              </Link>
              <Link href="/valora/improve" className="val-dash-btn secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
                Improve Value
              </Link>
              {savedWorkspaces.length > 0 && (
                <button className="val-dash-btn secondary" onClick={() => setShowSavedWorkspaces(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  Saved ({savedWorkspaces.length})
                </button>
              )}
              {(analysisComplete || isIncomeProperty || directUnderwrite) && (
                <button className="val-dash-btn secondary" onClick={() => { resetAnalysis(); setDirectUnderwrite(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Analysis
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container">
        <div className="val-main-layout">
          {/* Left Panel - Input Form */}
          <div className="val-input-panel">
            <div className="val-input-card">
              <h3>Property Information</h3>

              {/* Address Input – Google Places Autocomplete */}
              <div className="val-form-section">
                <label>Property Address <span className="optional">(optional for underwriting)</span></label>
                <AddressAutocomplete
                  defaultValue={address}
                  placeholder="Start typing an address..."
                  onSelect={(place: PlaceResult) => {
                    setAddress(place.address);
                    if (place.components.city) setCity(place.components.city);
                    if (place.components.stateShort) setState(place.components.stateShort);
                    if (place.components.zip) setZipCode(place.components.zip);
                    if (place.lat && place.lng) setCoordinates({ lat: place.lat, lng: place.lng });
                    // Auto-enrich property data when address is selected
                    if (place.components.city && place.components.stateShort) {
                      fetchEnrichmentData(place.components.city, place.components.stateShort, place.components.zip);
                    }
                    // Reset property records (user must opt-in to pull)
                    setPropertyRecords(null);
                    setRecordsLoaded(false);
                    setRealComps([]);
                    setRealCompsLoaded(false);
                    setRealCompsMessage(null);
                  }}
                />
                {isEnriching && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "#3B82F6" }}>
                    <span className="val-spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span>
                    Loading area tax rates, insurance & market data...
                  </div>
                )}
                {enrichmentLoaded && !isEnriching && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "#16A34A" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Area data loaded &mdash; tax rates, insurance, and expenses auto-populated
                  </div>
                )}
                {!recordsLoaded && !isLoadingRecords && address && city && state && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.375rem" }}>
                    <button
                      onClick={() => fetchPropertyRecords(address, city, state, zipCode)}
                      style={{
                        padding: "0.3rem 0.6rem", fontSize: "0.75rem", fontWeight: 600,
                        background: "#1D4ED8", color: "#fff", border: "none", borderRadius: "5px",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem",
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                      Pull Public Records
                    </button>
                    <span style={{ fontSize: "0.65rem", color: "#6B7280" }}>Uses 1 lookup from your plan. Additional: $2.00 each.</span>
                  </div>
                )}
                {isLoadingRecords && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "#3B82F6" }}>
                    <span className="val-spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span>
                    Loading property records (lot size, sale history)...
                  </div>
                )}
                {recordsLoaded && !isLoadingRecords && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", fontSize: "0.75rem", color: "#16A34A" }}>
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Property records loaded{propertyRecords?.lotSizeAcres ? ` \u2014 ${propertyRecords.lotSizeAcres} acres` : ""}{propertyRecords?.saleHistory?.length ? `, ${propertyRecords.saleHistory.length} sale record${propertyRecords.saleHistory.length !== 1 ? "s" : ""}` : ""}
                      {propertyRecords?.source === "rentcast" && <span style={{ marginLeft: "0.25rem", color: "#9CA3AF" }}>(public records)</span>}
                      {propertyRecords?.source === "openai" && <span style={{ marginLeft: "0.25rem", color: "#9CA3AF" }}>(AI estimate)</span>}
                    </div>
                    {propertyRecords?.usage && (
                      <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#9CA3AF" }}>
                        Lookups: {propertyRecords.usage.used}/{propertyRecords.usage.limit} ({propertyRecords.usage.plan})
                        {propertyRecords.usage.remaining > 0 && ` \u2014 ${propertyRecords.usage.remaining} remaining`}
                        {propertyRecords.usage.remaining <= 0 && (
                          <span style={{ color: "#F59E0B" }}> \u2014 Limit reached. Additional lookups: $2.00 each.</span>
                        )}
                        {propertyRecords.usage.wasOverage && (
                          <span style={{ color: "#EF4444" }}> ($2.00 charged for this lookup)</span>
                        )}
                        {propertyRecords.usage.overageCount > 0 && (
                          <span style={{ color: "#F59E0B" }}> \u2014 Overage this period: ${(propertyRecords.usage.overageCostCents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: "0.2rem", fontSize: "0.65rem", color: "#6B7280" }}>
                      Saving a workspace caches results locally. Re-fetching records from a new analysis or reloading data uses a new lookup.
                    </div>
                  </>
                )}
                <div className="val-input-row" style={{ marginTop: "0.5rem" }}>
                  <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="val-input" />
                  <input type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="val-input small" />
                  <input type="text" placeholder="ZIP" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="val-input small" />
                </div>
              </div>

              {/* Property Type */}
              <div className="val-form-section">
                <label>Property Type</label>
                <div className="val-type-selector">
                  <button className="val-type-dropdown" onClick={() => setShowPropertyTypes(!showPropertyTypes)}>
                    {propertyType ? (
                      <>
                        <span>{PROPERTY_TYPES.find(t => t.id === propertyType)?.icon}</span>
                        <span>{PROPERTY_TYPES.find(t => t.id === propertyType)?.name}</span>
                      </>
                    ) : (
                      <span>Select property type...</span>
                    )}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {showPropertyTypes && (
                    <div className="val-type-menu">
                      {PROPERTY_TYPES.map(type => (
                        <button key={type.id} className={`val-type-option ${propertyType === type.id ? "active" : ""}`} onClick={() => { setPropertyType(type.id); setShowPropertyTypes(false); }}>
                          <span>{type.icon}</span>
                          <span>{type.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Details */}
              <div className="val-form-section">
                <label>Property Details</label>
                <div className="val-input-row">
                  <div className="val-input-group">
                    <input type="number" placeholder="Sq Ft" value={sqft} onChange={(e) => setSqft(e.target.value)} className="val-input" />
                    <span className="val-input-suffix">sqft</span>
                  </div>
                  <div className="val-input-group">
                    <input type="number" placeholder="Lot Size" value={lotSize} onChange={(e) => setLotSize(e.target.value)} className="val-input" />
                    <span className="val-input-suffix">acres</span>
                  </div>
                </div>
                <div className="val-input-row">
                  <input type="number" placeholder="Year Built" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} className="val-input" />
                  {isIncomeProperty && (
                    <input type="number" placeholder="# Units" value={units} onChange={(e) => setUnits(e.target.value)} className="val-input" />
                  )}
                </div>
                {(propertyType === "single-family" || propertyType === "multifamily") && (
                  <div className="val-input-row">
                    <input type="number" placeholder="Beds" value={beds} onChange={(e) => setBeds(e.target.value)} className="val-input" />
                    <input type="number" placeholder="Baths" value={baths} onChange={(e) => setBaths(e.target.value)} className="val-input" />
                  </div>
                )}
              </div>

              {/* Photo Upload */}
              <div className="val-form-section">
                <label>Property Photos <span className="optional">(optional)</span></label>
                <input ref={fileInputRef} type="file" multiple={replaceIndex === null} accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                {uploadedImages.length > 0 && (
                  <div className="val-photo-gallery">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="val-photo-card">
                        <div className="val-photo-card-img">
                          <img src={img} alt={imageLabels[index] || `Photo ${index + 1}`} />
                          <div className="val-photo-card-actions">
                            <button
                              className="val-photo-action-btn"
                              title="Replace photo"
                              onClick={(e) => { e.stopPropagation(); triggerReplace(index); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M23 4v6h-6M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                              </svg>
                            </button>
                            <button
                              className="val-photo-action-btn danger"
                              title="Remove photo"
                              onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <input
                          className="val-photo-label-input"
                          type="text"
                          placeholder={`Photo ${index + 1} label`}
                          value={imageLabels[index] || ""}
                          onChange={(e) => setImageLabels(prev => ({ ...prev, [index]: e.target.value }))}
                        />
                      </div>
                    ))}
                    {/* Add more photos card */}
                    <div className="val-photo-card val-photo-add-card" onClick={() => { setReplaceIndex(null); fileInputRef.current?.click(); }}>
                      <div className="val-photo-card-img val-photo-add-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        <span>Add Photo</span>
                      </div>
                    </div>
                  </div>
                )}
                {uploadedImages.length === 0 && (
                  <div className="val-photo-dropzone" onClick={() => { setReplaceIndex(null); fileInputRef.current?.click(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span>Drop photos or click to upload</span>
                  </div>
                )}
              </div>

              {/* Pull Real Comps (opt-in) */}
              <div className="val-form-section" style={{ background: useRealComps ? "#F0FDF4" : "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: useRealComps ? "0.5rem" : 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#1B2A4A", margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={useRealComps}
                      onChange={(e) => setUseRealComps(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#16A34A" }}
                    />
                    Pull Real Comparable Sales
                  </label>
                  <span style={{ fontSize: "0.65rem", color: "#6B7280", background: "#E5E7EB", padding: "2px 6px", borderRadius: "4px" }}>
                    Uses 1 lookup from your plan
                  </span>
                </div>
                {useRealComps && (
                  <>
                    <div style={{ fontSize: "0.75rem", color: "#4B5563", marginBottom: "0.5rem" }}>
                      Fetch verified recent sales from county records near this property. Each pull counts as 1 evaluation from your plan. Additional pulls beyond your plan limit are <strong>$2.00 each</strong>.
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 120px" }}>
                        <label style={{ fontSize: "0.7rem", color: "#6B7280", display: "block", marginBottom: "2px" }}>Lookback Period</label>
                        <select
                          value={realCompsLookback}
                          onChange={(e) => setRealCompsLookback(e.target.value as "6" | "9" | "12")}
                          className="val-input"
                          style={{ fontSize: "0.8rem", padding: "0.35rem" }}
                        >
                          <option value="6">6 months</option>
                          <option value="9">9 months</option>
                          <option value="12">12 months</option>
                        </select>
                      </div>
                      <div style={{ flex: "1 1 100px" }}>
                        <label style={{ fontSize: "0.7rem", color: "#6B7280", display: "block", marginBottom: "2px" }}>Max Comps</label>
                        <select
                          value={realCompsLimit}
                          onChange={(e) => setRealCompsLimit(e.target.value)}
                          className="val-input"
                          style={{ fontSize: "0.8rem", padding: "0.35rem" }}
                        >
                          <option value="4">4 comps</option>
                          <option value="6">6 comps</option>
                          <option value="8">8 comps</option>
                          <option value="10">10 comps</option>
                        </select>
                      </div>
                      <div style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
                        <button
                          onClick={fetchRealComps}
                          disabled={!address || !city || !state || isLoadingRealComps}
                          style={{
                            padding: "0.4rem 0.75rem", fontSize: "0.8rem", fontWeight: 600,
                            background: isLoadingRealComps ? "#9CA3AF" : "#16A34A", color: "#fff",
                            border: "none", borderRadius: "6px", cursor: isLoadingRealComps ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: "0.375rem",
                          }}
                        >
                          {isLoadingRealComps ? (
                            <><span className="val-spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span>Pulling...</>
                          ) : (
                            <>Pull Comps</>
                          )}
                        </button>
                      </div>
                    </div>
                    {realCompsMessage && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: realComps.length > 0 ? "#16A34A" : "#D97706", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        {realComps.length > 0 ? (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        )}
                        {realCompsMessage}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Analyze Button */}
              <button className="val-analyze-btn" onClick={runAnalysis} disabled={!address || !propertyType || isAnalyzing}>
                {isAnalyzing ? (<><span className="val-spinner"></span>Analyzing Property...</>) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>Run AI Analysis</>
                )}
              </button>
            </div>

            {/* Current Interest Rates - fetched live on every page load */}
            <div className="val-rates-card">
              <h4>
                {ratesLoading ? "Loading Rates..." : "Live Interest Rates"}
                {!ratesLoading && liveRates.source && liveRates.source !== "loading..." && (
                  <span style={{ fontSize: "0.65rem", fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>
                    via {liveRates.source}
                  </span>
                )}
              </h4>
              <div className="val-rates-list">
                <div className="val-rate-item"><span>30-Year Fixed</span><span className="rate">{enrichmentData?.currentMortgageRates?.conventional30 || liveRates.conventional30}%</span></div>
                <div className="val-rate-item"><span>15-Year Fixed</span><span className="rate">{enrichmentData?.currentMortgageRates?.conventional15 || liveRates.conventional15}%</span></div>
                <div className="val-rate-item"><span>Commercial</span><span className="rate">{enrichmentData?.currentMortgageRates?.commercial || liveRates.commercial}%</span></div>
                <div className="val-rate-item"><span>Bridge Loan</span><span className="rate">{enrichmentData?.currentMortgageRates?.bridge || liveRates.bridge}%</span></div>
                <div className="val-rate-item"><span>SBA 504</span><span className="rate">{liveRates.sba504}%</span></div>
                {liveRates.fedFundsRate !== null && (
                  <div className="val-rate-item"><span>Fed Funds Rate</span><span className="rate">{liveRates.fedFundsRate}%</span></div>
                )}
                {liveRates.prime !== null && (
                  <div className="val-rate-item"><span>Prime Rate</span><span className="rate">{liveRates.prime}%</span></div>
                )}
                {liveRates.treasury10yr !== null && (
                  <div className="val-rate-item"><span>10-Year Treasury</span><span className="rate">{liveRates.treasury10yr}%</span></div>
                )}
              </div>
              <span className="val-rates-updated">
                {ratesLoading ? "Fetching live rates..." : `Updated: ${liveRates.lastUpdated}`}
              </span>
            </div>

            {/* Area Statistics - shown when enrichment data is loaded */}
            {enrichmentData?.areaStatistics && (
              <div className="val-rates-card">
                <h4>Area Market Data</h4>
                <div className="val-rates-list">
                  <div className="val-rate-item"><span>Median Price</span><span className="rate">{formatCurrency(enrichmentData.areaStatistics.medianHomePrice)}</span></div>
                  <div className="val-rate-item"><span>Avg Cap Rate</span><span className="rate">{enrichmentData.areaStatistics.averageCapRate}%</span></div>
                  <div className="val-rate-item"><span>Vacancy Rate</span><span className="rate">{enrichmentData.areaStatistics.vacancyRate}%</span></div>
                  <div className="val-rate-item"><span>Rent Growth</span><span className="rate">{enrichmentData.areaStatistics.rentGrowthRate}%/yr</span></div>
                  <div className="val-rate-item"><span>Avg Days on Market</span><span className="rate">{enrichmentData.areaStatistics.averageDaysOnMarket}</span></div>
                  <div className="val-rate-item"><span>Rent/SF/Mo</span><span className="rate">${enrichmentData.areaStatistics.medianRentPerSqft?.toFixed(2)}</span></div>
                  <div className="val-rate-item"><span>Pop. Growth</span><span className="rate">{enrichmentData.areaStatistics.populationGrowth}%</span></div>
                  <div className="val-rate-item"><span>Job Growth</span><span className="rate">{enrichmentData.areaStatistics.employmentGrowthRate}%</span></div>
                </div>
                {enrichmentData.meta && (
                  <span className="val-rates-updated">Source: {enrichmentData.source === "openai" ? "AI analysis" : "Estimates"} for {enrichmentData.meta.location}</span>
                )}
              </div>
            )}

            {/* Property Tax & Insurance Summary */}
            {enrichmentData?.propertyTax && (
              <div className="val-rates-card">
                <h4>Ownership Costs</h4>
                <div className="val-rates-list">
                  <div className="val-rate-item"><span>Tax Rate ({enrichmentData.propertyTax.taxJurisdiction})</span><span className="rate">{enrichmentData.propertyTax.effectiveTaxRate}%</span></div>
                  <div className="val-rate-item"><span>Annual Property Tax</span><span className="rate">{formatCurrency(enrichmentData.propertyTax.annualTaxEstimate)}</span></div>
                  <div className="val-rate-item"><span>Tax Trend</span><span className="rate" style={{ textTransform: "capitalize" }}>{enrichmentData.propertyTax.taxTrend}</span></div>
                  {enrichmentData.insurance && (
                    <>
                      <div className="val-rate-item"><span>Annual Insurance</span><span className="rate">{formatCurrency(enrichmentData.insurance.annualPremiumEstimate)}</span></div>
                      <div className="val-rate-item"><span>Flood Risk</span><span className="rate" style={{ textTransform: "capitalize" }}>{enrichmentData.insurance.floodZoneRisk}</span></div>
                    </>
                  )}
                  {enrichmentData.closingCosts && (
                    <div className="val-rate-item"><span>Est. Closing Costs</span><span className="rate">{enrichmentData.closingCosts.buyerClosingCostPercent}%</span></div>
                  )}
                  {enrichmentData.maintenanceReserves && (
                    <div className="val-rate-item"><span>Maint./SF/Yr</span><span className="rate">${enrichmentData.maintenanceReserves.annualMaintenancePerSqft?.toFixed(2)}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Property Records — Lot Size & Sale History */}
            {recordsLoaded && propertyRecords && (propertyRecords.lotSizeAcres || (propertyRecords.saleHistory && propertyRecords.saleHistory.length > 0)) && (
              <div className="val-rates-card">
                <h4>Property Records</h4>
                <div className="val-rates-list">
                  {propertyRecords.lotSizeAcres && (
                    <div className="val-rate-item">
                      <span>Lot Size</span>
                      <span className="rate">{propertyRecords.lotSizeAcres} acres{propertyRecords.lotSizeSqft ? ` (${propertyRecords.lotSizeSqft.toLocaleString()} sqft)` : ""}</span>
                    </div>
                  )}
                  {propertyRecords.propertyDetails?.lastSalePrice && (
                    <div className="val-rate-item">
                      <span>Last Sale Price</span>
                      <span className="rate">{formatCurrency(propertyRecords.propertyDetails.lastSalePrice)}</span>
                    </div>
                  )}
                  {propertyRecords.propertyDetails?.lastSaleDate && (
                    <div className="val-rate-item">
                      <span>Last Sale Date</span>
                      <span className="rate">{new Date(propertyRecords.propertyDetails.lastSaleDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {propertyRecords.saleHistory.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <h5 style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>Sale History</h5>
                    <table className="val-sale-history-tbl">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Price</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyRecords.saleHistory.map((sale, idx) => (
                          <tr key={idx}>
                            <td>{new Date(sale.date).toLocaleDateString()}</td>
                            <td>{formatCurrency(sale.price)}</td>
                            <td>{sale.type || "Sale"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <span className="val-rates-updated">
                  Source: {propertyRecords.source === "rentcast" ? "Public Records (RentCast)" : propertyRecords.source === "openai" ? "AI Estimate" : "Estimates"}
                  {propertyRecords.disclaimer && <> &mdash; {propertyRecords.disclaimer}</>}
                </span>
              </div>
            )}

            {/* Quick Links */}
            <div className="val-quick-links-card">
              <h4>Quick Links</h4>
              <Link href="/valora/marketplace" className="val-quick-link">Browse Marketplace</Link>
              <Link href="/valora/improve" className="val-quick-link">Improve Building Value</Link>
              <Link href="/valora/brokers" className="val-quick-link">Broker Portal</Link>
            </div>
          </div>

          {/* Right Panel - Underwriting Workspace / Results */}
          <div className="val-results-panel">
            {!isIncomeProperty && !analysisComplete && !directUnderwrite ? (
              <div className="val-empty-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                  <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                  <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <h3>Select a Property Type</h3>
                <p>Choose a property type to open the underwriting workspace, click <strong>New Property</strong> above to start underwriting directly, or enter an address to run AI analysis.</p>
              </div>
            ) : (
              <>
                {/* Workspace Header */}
                <div className="val-results-header">
                  <div className="val-results-title">
                    {address ? (
                      <>
                        <h2>{address}</h2>
                        <p>{city}, {state} {zipCode}</p>
                      </>
                    ) : (
                      <>
                        <h2>{PROPERTY_TYPES.find(t => t.id === propertyType)?.name} Underwriting</h2>
                        <p>Enter deal inputs below to analyze returns</p>
                      </>
                    )}
                    {isPublic && <span className="val-public-badge">On Market</span>}
                  </div>
                  <div className="val-results-actions">
                    <input type="text" placeholder="Workspace name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="val-workspace-input" />
                    <button className="val-save-btn" onClick={saveWorkspace}>{saveSuccess ? "Saved!" : "Save"}</button>
                    {!isPublic && valuation && (
                      <button className="val-promote-btn" onClick={() => setShowPromoteModal(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                        List for Sale
                      </button>
                    )}
                    {promoteSuccess && <span className="val-promote-success">Listed!</span>}
                    <div className="val-export-dropdown">
                      <button className="val-export-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Export
                      </button>
                      <div className="val-export-menu">
                        <button onClick={exportPDF}>Export PDF</button>
                        <button onClick={exportExcel}>Export Excel</button>
                        <button onClick={exportCSV}>Export CSV</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="val-tabs">
                  {getAvailableTabs().map(tab => (
                    <button key={tab} className={`val-tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                      {tab === "rentroll" ? "Rent Roll" : tab === "pnl" ? "P&L" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="val-tab-content">
                  {/* Underwriting Tab */}
                  {activeTab === "underwriting" && isIncomeProperty && (
                    <div className="val-underwriting-content">
                      <div className="val-uw-inputs">
                        <h4>Deal Inputs</h4>
                        <div className="val-uw-grid">
                          <div className="val-uw-input"><label>Purchase Price</label><input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Enter amount" /></div>
                          <div className="val-uw-input"><label>Down Payment %</label><input type="number" value={downPaymentPercent} onChange={(e) => setDownPaymentPercent(e.target.value)} /></div>
                          <div className="val-uw-input"><label>Interest Rate %</label><input type="number" step="0.125" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} /></div>
                          <div className="val-uw-input"><label>Loan Term (years)</label><input type="number" value={loanTerm} onChange={(e) => setLoanTerm(e.target.value)} /></div>
                        </div>
                        {rentRoll.length === 0 && (
                          <>
                            <h4 style={{ marginTop: "1.5rem" }}>Income Inputs</h4>
                            <div className="val-uw-grid">
                              <div className="val-uw-input"><label>Monthly Gross Rent</label><input type="number" value={grossRent} onChange={(e) => setGrossRent(e.target.value)} placeholder="Or use Rent Roll" /></div>
                              <div className="val-uw-input"><label>Vacancy Rate %</label><input type="number" value={vacancyRate} onChange={(e) => setVacancyRate(e.target.value)} /></div>
                              <div className="val-uw-input"><label>Operating Expense %</label><input type="number" value={operatingExpenseRatio} onChange={(e) => setOperatingExpenseRatio(e.target.value)} /></div>
                            </div>
                          </>
                        )}
                        {rentRoll.length > 0 && (
                          <p className="val-uw-note">Income and expenses calculated from Rent Roll and P&L tabs</p>
                        )}
                      </div>
                      {underwriting && (
                        <div className="val-uw-results">
                          <h4>Analysis Results</h4>
                          <div className="val-uw-metrics">
                            <div className={`val-uw-metric ${underwriting.cashFlow >= 0 ? "positive" : "negative"}`}><span className="metric-label">Annual Cash Flow</span><span className="metric-value">{formatCurrency(underwriting.cashFlow)}</span></div>
                            <div className={`val-uw-metric ${underwriting.cashOnCash >= 8 ? "positive" : underwriting.cashOnCash >= 5 ? "neutral" : "negative"}`}><span className="metric-label">Cash-on-Cash</span><span className="metric-value">{underwriting.cashOnCash.toFixed(2)}%</span></div>
                            <div className={`val-uw-metric ${underwriting.capRate >= 6 ? "positive" : underwriting.capRate >= 4 ? "neutral" : "negative"}`}><span className="metric-label">Cap Rate</span><span className="metric-value">{underwriting.capRate.toFixed(2)}%</span></div>
                            <div className={`val-uw-metric ${underwriting.dscr >= 1.25 ? "positive" : underwriting.dscr >= 1 ? "neutral" : "negative"}`}><span className="metric-label">DSCR</span><span className="metric-value">{underwriting.dscr.toFixed(2)}x</span></div>
                            {underwriting.breakEvenOccupancy !== undefined && underwriting.breakEvenOccupancy > 0 && (
                              <div className={`val-uw-metric ${underwriting.breakEvenOccupancy <= 80 ? "positive" : underwriting.breakEvenOccupancy <= 90 ? "neutral" : "negative"}`}><span className="metric-label">Break-Even Occ.</span><span className="metric-value">{underwriting.breakEvenOccupancy.toFixed(1)}%</span></div>
                            )}
                            <div className="val-uw-metric"><span className="metric-label">GRM</span><span className="metric-value">{underwriting.grm.toFixed(2)}x</span></div>
                          </div>
                          <div className="val-uw-breakdown">
                            <div className="breakdown-section">
                              <h5>Acquisition & Financing</h5>
                              <div className="breakdown-row"><span>Purchase Price</span><span>{formatCurrency(underwriting.purchasePrice)}</span></div>
                              {underwriting.pricePerUnit && <div className="breakdown-row"><span>Price Per Unit</span><span>{formatCurrency(underwriting.pricePerUnit)}</span></div>}
                              {underwriting.pricePerSqft && <div className="breakdown-row"><span>Price Per Sq Ft</span><span>${underwriting.pricePerSqft}</span></div>}
                              <div className="breakdown-row"><span>Down Payment ({downPaymentPercent}%)</span><span>{formatCurrency(underwriting.downPayment)}</span></div>
                              {underwriting.closingCosts !== undefined && underwriting.closingCosts > 0 && (
                                <div className="breakdown-row"><span>Est. Closing Costs ({enrichmentData?.closingCosts?.buyerClosingCostPercent || 3.5}%)</span><span>{formatCurrency(underwriting.closingCosts)}</span></div>
                              )}
                              {underwriting.totalCashRequired !== undefined && underwriting.totalCashRequired > 0 && (
                                <div className="breakdown-row highlight"><span>Total Cash Required</span><span>{formatCurrency(underwriting.totalCashRequired)}</span></div>
                              )}
                              <div className="breakdown-row"><span>Loan Amount</span><span>{formatCurrency(underwriting.loanAmount)}</span></div>
                              <div className="breakdown-row"><span>Monthly Payment</span><span>{formatCurrency(underwriting.monthlyPayment)}</span></div>
                              <div className="breakdown-row"><span>Annual Debt Service</span><span>{formatCurrency(underwriting.annualDebtService)}</span></div>
                            </div>
                            <div className="breakdown-section">
                              <h5>Income & Expenses</h5>
                              <div className="breakdown-row"><span>Gross Rental Income</span><span>{formatCurrency(underwriting.grossRent)}</span></div>
                              <div className="breakdown-row"><span>Less Vacancy ({underwriting.vacancy}%)</span><span>-{formatCurrency(underwriting.grossRent * (underwriting.vacancy / 100))}</span></div>
                              <div className="breakdown-row"><span>Effective Gross Income</span><span>{formatCurrency(underwriting.effectiveGrossIncome)}</span></div>
                              <div className="breakdown-row"><span>Operating Expenses</span><span>-{formatCurrency(underwriting.operatingExpenses)}</span></div>
                              <div className="breakdown-row highlight"><span>Net Operating Income (NOI)</span><span>{formatCurrency(underwriting.noi)}</span></div>
                            </div>
                            {/* Ownership Cost Breakdown - from enrichment data */}
                            {enrichmentData?.propertyTax && (
                              <div className="breakdown-section">
                                <h5>Annual Ownership Costs</h5>
                                <div className="breakdown-row"><span>Property Tax ({enrichmentData.propertyTax.effectiveTaxRate}%)</span><span>{formatCurrency(underwriting.annualPropertyTax || 0)}</span></div>
                                <div className="breakdown-row"><span>Insurance</span><span>{formatCurrency(underwriting.annualInsurance || 0)}</span></div>
                                <div className="breakdown-row"><span>Maintenance & Repairs</span><span>{formatCurrency(underwriting.annualMaintenance || 0)}</span></div>
                                <div className="breakdown-row"><span>Reserves</span><span>{formatCurrency(underwriting.annualReserves || 0)}</span></div>
                                <div className="breakdown-row"><span>Debt Service</span><span>{formatCurrency(underwriting.annualDebtService)}</span></div>
                                <div className="breakdown-row highlight"><span>Total Annual Cost</span><span>{formatCurrency((underwriting.annualPropertyTax || 0) + (underwriting.annualInsurance || 0) + (underwriting.annualMaintenance || 0) + (underwriting.annualReserves || 0) + underwriting.annualDebtService)}</span></div>
                                <div className="breakdown-row" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  <span>Monthly Carry Cost</span>
                                  <span>{formatCurrency(Math.round(((underwriting.annualPropertyTax || 0) + (underwriting.annualInsurance || 0) + (underwriting.annualMaintenance || 0) + (underwriting.annualReserves || 0) + underwriting.annualDebtService) / 12))}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Scenario Analysis */}
                          <div style={{ marginTop: "1.5rem" }}>
                            <h4 style={{ marginBottom: "0.75rem" }}>Scenario Analysis</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                              {/* Conservative */}
                              {(() => {
                                const consVacancy = underwriting.vacancy + 3;
                                const consGross = underwriting.grossRent * 0.95;
                                const consEgi = consGross * (1 - consVacancy / 100);
                                const consOpex = underwriting.operatingExpenses * 1.1;
                                const consNoi = consEgi - consOpex;
                                const consCf = consNoi - underwriting.annualDebtService;
                                const consTotalCash = underwriting.totalCashRequired || underwriting.downPayment;
                                const consCoc = consTotalCash > 0 ? (consCf / consTotalCash) * 100 : 0;
                                return (
                                  <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#EF4444", marginBottom: "0.5rem" }}>Conservative</div>
                                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.375rem" }}>Rent -5%, Vacancy +3%, Opex +10%</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>NOI</span><span style={{ fontWeight: 600 }}>{formatCurrency(consNoi)}</span></div>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash Flow</span><span style={{ fontWeight: 600, color: consCf >= 0 ? "#16A34A" : "#EF4444" }}>{formatCurrency(consCf)}</span></div>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash-on-Cash</span><span style={{ fontWeight: 600 }}>{consCoc.toFixed(2)}%</span></div>
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Base Case */}
                              <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3B82F6", marginBottom: "0.5rem" }}>Base Case</div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.375rem" }}>Current assumptions</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>NOI</span><span style={{ fontWeight: 600 }}>{formatCurrency(underwriting.noi)}</span></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash Flow</span><span style={{ fontWeight: 600, color: underwriting.cashFlow >= 0 ? "#16A34A" : "#EF4444" }}>{formatCurrency(underwriting.cashFlow)}</span></div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash-on-Cash</span><span style={{ fontWeight: 600 }}>{underwriting.cashOnCash.toFixed(2)}%</span></div>
                                </div>
                              </div>
                              {/* Optimistic */}
                              {(() => {
                                const optVacancy = Math.max(underwriting.vacancy - 2, 1);
                                const optGross = underwriting.grossRent * 1.05;
                                const optEgi = optGross * (1 - optVacancy / 100);
                                const optOpex = underwriting.operatingExpenses * 0.95;
                                const optNoi = optEgi - optOpex;
                                const optCf = optNoi - underwriting.annualDebtService;
                                const optTotalCash = underwriting.totalCashRequired || underwriting.downPayment;
                                const optCoc = optTotalCash > 0 ? (optCf / optTotalCash) * 100 : 0;
                                return (
                                  <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16A34A", marginBottom: "0.5rem" }}>Optimistic</div>
                                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "0.375rem" }}>Rent +5%, Vacancy -2%, Opex -5%</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.78rem" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>NOI</span><span style={{ fontWeight: 600 }}>{formatCurrency(optNoi)}</span></div>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash Flow</span><span style={{ fontWeight: 600, color: optCf >= 0 ? "#16A34A" : "#EF4444" }}>{formatCurrency(optCf)}</span></div>
                                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash-on-Cash</span><span style={{ fontWeight: 600 }}>{optCoc.toFixed(2)}%</span></div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            {/* Sensitivity note */}
                            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.5 }}>
                              Sensitivity: A 1% change in vacancy impacts NOI by {formatCurrency(Math.round(underwriting.grossRent * 0.01))} annually. A 1% rate increase adds {formatCurrency(Math.round(underwriting.loanAmount * 0.01 / 12) * 12)}/yr to debt service.
                            </div>
                          </div>
                        </div>
                      )}
                      {!underwriting && (
                        <div className="val-uw-empty">
                          <p>Enter a purchase price and income details to see underwriting analysis</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rent Roll Tab */}
                  {activeTab === "rentroll" && isIncomeProperty && (
                    <div className="val-rentroll-content">
                      <div className="val-rentroll-header">
                        <h4>Rent Roll</h4>
                        <button className="val-add-unit-btn" onClick={() => setShowAddUnit(true)}>+ Add Unit</button>
                      </div>
                      {rentRoll.length > 0 ? (
                        <>
                          <div className="val-rentroll-summary">
                            <div className="summary-stat"><span>Total Units</span><span>{rentRollTotals.totalUnits}</span></div>
                            <div className="summary-stat"><span>Occupied</span><span className="positive">{rentRollTotals.occupiedUnits}</span></div>
                            <div className="summary-stat"><span>Vacant</span><span className="negative">{rentRollTotals.vacantUnits}</span></div>
                            <div className="summary-stat"><span>Occupancy</span><span>{rentRollTotals.occupancyRate.toFixed(1)}%</span></div>
                            <div className="summary-stat"><span>Monthly Income</span><span>{formatCurrency(rentRollTotals.totalMonthlyRent)}</span></div>
                            <div className="summary-stat"><span>Loss to Lease</span><span className="negative">{formatCurrency(rentRollTotals.lossToLease)}/mo</span></div>
                          </div>
                          <div className="val-rentroll-table">
                            <div className="val-rentroll-row header">
                              <span>Unit</span><span>Type</span><span>Sq Ft</span><span>Rent</span><span>Market</span><span>Tenant</span><span>Lease End</span><span>Status</span><span></span>
                            </div>
                            {rentRoll.map(unit => (
                              <div key={unit.id} className="val-rentroll-row editable">
                                <input className="rr-inline unit-num" value={unit.unitNumber} onChange={(e) => updateUnit(unit.id, "unitNumber", e.target.value)} />
                                <select className="rr-inline" value={unit.unitType} onChange={(e) => updateUnit(unit.id, "unitType", e.target.value)}>
                                  <option>Studio</option><option>1BR</option><option>1BR/1BA</option><option>2BR/1BA</option><option>2BR/2BA</option><option>3BR/2BA</option>
                                </select>
                                <input className="rr-inline" type="number" value={unit.sqft || ""} onChange={(e) => updateUnit(unit.id, "sqft", e.target.value)} />
                                <input className="rr-inline" type="number" value={unit.monthlyRent || ""} onChange={(e) => updateUnit(unit.id, "monthlyRent", e.target.value)} placeholder="$0" />
                                <input className="rr-inline" type="number" value={unit.marketRent || ""} onChange={(e) => updateUnit(unit.id, "marketRent", e.target.value)} placeholder="$0" />
                                <input className="rr-inline" value={unit.tenant || ""} onChange={(e) => updateUnit(unit.id, "tenant", e.target.value)} placeholder="-" />
                                <input className="rr-inline" type="date" value={unit.leaseEnd || ""} onChange={(e) => updateUnit(unit.id, "leaseEnd", e.target.value)} />
                                <select className="rr-inline status-select" value={unit.status} onChange={(e) => updateUnit(unit.id, "status", e.target.value)}>
                                  <option value="occupied">Occupied</option><option value="vacant">Vacant</option><option value="notice">Notice</option>
                                </select>
                                <button className="delete-unit" onClick={() => deleteUnit(unit.id)}>×</button>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="val-rentroll-empty">
                          <p>No units added yet. Click "+ Add Unit" to build your rent roll.</p>
                          <p className="hint">Adding units will automatically feed income data to the underwriting analysis.</p>
                        </div>
                      )}
                      {showAddUnit && (
                        <div className="val-add-unit-form">
                          <h5>Add Unit</h5>
                          <div className="add-unit-grid">
                            <input placeholder="Unit #" value={newUnit.unitNumber} onChange={(e) => setNewUnit({...newUnit, unitNumber: e.target.value})} />
                            <select value={newUnit.unitType} onChange={(e) => setNewUnit({...newUnit, unitType: e.target.value})}>
                              <option>Studio</option><option>1BR/1BA</option><option>2BR/1BA</option><option>2BR/2BA</option><option>3BR/2BA</option>
                            </select>
                            <input type="number" placeholder="Sq Ft" value={newUnit.sqft || ""} onChange={(e) => setNewUnit({...newUnit, sqft: parseInt(e.target.value)})} />
                            <input type="number" placeholder="Monthly Rent" value={newUnit.monthlyRent || ""} onChange={(e) => setNewUnit({...newUnit, monthlyRent: parseInt(e.target.value)})} />
                            <input type="number" placeholder="Market Rent" value={newUnit.marketRent || ""} onChange={(e) => setNewUnit({...newUnit, marketRent: parseInt(e.target.value)})} />
                            <input placeholder="Tenant Name" value={newUnit.tenant} onChange={(e) => setNewUnit({...newUnit, tenant: e.target.value})} />
                            <input type="date" placeholder="Lease End" value={newUnit.leaseEnd} onChange={(e) => setNewUnit({...newUnit, leaseEnd: e.target.value})} />
                            <select value={newUnit.status} onChange={(e) => setNewUnit({...newUnit, status: e.target.value as "occupied" | "vacant" | "notice"})}>
                              <option value="occupied">Occupied</option><option value="vacant">Vacant</option><option value="notice">Notice</option>
                            </select>
                          </div>
                          <div className="add-unit-actions">
                            <button className="cancel" onClick={() => setShowAddUnit(false)}>Cancel</button>
                            <button className="add" onClick={addUnit}>Add Unit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* P&L Tab */}
                  {activeTab === "pnl" && isIncomeProperty && (
                    <div className="val-pnl-content">
                      <h4>Pro Forma P&L Statement</h4>
                      {enrichmentLoaded && (
                        <div style={{ padding: "0.625rem 0.875rem", background: "rgba(59,130,246,0.06)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.78rem", color: "#3B82F6", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                          <span>Expenses auto-populated from {enrichmentData?.source === "openai" ? "AI analysis" : "area estimates"} for {enrichmentData?.meta?.location || `${city}, ${state}`}. Adjust values as needed for your specific property.</span>
                        </div>
                      )}
                      <div className="val-pnl-section income">
                        <h5>Income</h5>
                        <div className="pnl-row"><span>Gross Potential Rent</span><span>{formatCurrency(grossPotentialRent)}</span></div>
                        <div className="pnl-row negative"><span>Less: Vacancy & Loss to Lease</span><span>-{formatCurrency(vacancyLoss)}</span></div>
                        <div className="pnl-row total"><span>Effective Gross Income</span><span>{formatCurrency(effectiveGrossIncome)}</span></div>
                      </div>
                      <div className="val-pnl-section expenses">
                        <div className="pnl-section-header">
                          <h5>Operating Expenses</h5>
                          <button className="pnl-add-btn" onClick={() => setExpenses(prev => [...prev, { id: Date.now().toString(), category: "New Expense", annual: 0, monthly: 0 }])}>+ Add Line</button>
                        </div>
                        {expenses.map(exp => (
                          <div key={exp.id} className="pnl-row editable">
                            <input
                              className="pnl-category-input"
                              value={exp.category}
                              onChange={(e) => setExpenses(prev => prev.map(x => x.id === exp.id ? { ...x, category: e.target.value } : x))}
                            />
                            <div className="expense-inputs">
                              <input type="number" value={exp.monthly || ""} onChange={(e) => updateExpense(exp.id, "monthly", parseInt(e.target.value) || 0)} placeholder="$0" />
                              <span className="per-label">/mo</span>
                              <input type="number" value={exp.annual || ""} onChange={(e) => updateExpense(exp.id, "annual", parseInt(e.target.value) || 0)} placeholder="$0" />
                              <span className="per-label">/yr</span>
                              <button className="pnl-remove-btn" title="Remove line item" onClick={() => setExpenses(prev => prev.filter(x => x.id !== exp.id))}>×</button>
                            </div>
                          </div>
                        ))}
                        <div className="pnl-row total"><span>Total Operating Expenses</span><span>-{formatCurrency(totalExpenses)}</span></div>
                      </div>
                      <div className="val-pnl-section noi">
                        <div className="pnl-row highlight"><span>Net Operating Income (NOI)</span><span>{formatCurrency(noiFromPnL)}</span></div>
                        <div className="pnl-metrics">
                          <div><span>Expense Ratio</span><span>{effectiveGrossIncome > 0 ? ((totalExpenses / effectiveGrossIncome) * 100).toFixed(1) : 0}%</span></div>
                          <div><span>Per Unit/Year</span><span>{rentRoll.length > 0 ? formatCurrency(totalExpenses / rentRoll.length) : "-"}</span></div>
                          <div><span>Per Sq Ft/Year</span><span>{rentRollTotals.totalSqft > 0 ? `$${(totalExpenses / rentRollTotals.totalSqft).toFixed(2)}` : "-"}</span></div>
                          {purchasePrice && parseFloat(purchasePrice) > 0 && noiFromPnL > 0 && (
                            <div><span>Implied Cap Rate</span><span>{((noiFromPnL / parseFloat(purchasePrice)) * 100).toFixed(2)}%</span></div>
                          )}
                        </div>
                      </div>
                      {/* Debt Service & Cash Flow from P&L */}
                      {underwriting && (
                        <div className="val-pnl-section" style={{ marginTop: "0.5rem" }}>
                          <h5>Below the Line</h5>
                          <div className="pnl-row"><span>Annual Debt Service</span><span>-{formatCurrency(underwriting.annualDebtService)}</span></div>
                          <div className="pnl-row highlight"><span>Cash Flow Before Tax</span><span style={{ color: noiFromPnL - underwriting.annualDebtService >= 0 ? "#16A34A" : "#EF4444" }}>{formatCurrency(noiFromPnL - underwriting.annualDebtService)}</span></div>
                          <div className="pnl-row"><span>Monthly Cash Flow</span><span style={{ color: noiFromPnL - underwriting.annualDebtService >= 0 ? "#16A34A" : "#EF4444" }}>{formatCurrency(Math.round((noiFromPnL - underwriting.annualDebtService) / 12))}</span></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Valuation Tab */}
                  {activeTab === "valuation" && valuation && (
                    <div className="val-valuation-content">
                      <div className="val-ai-disclaimer" style={propertyRecords?.source === "rentcast" ? { background: "#ecfdf5", borderColor: "#10b981", color: "#065f46" } : undefined}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <div>
                          {propertyRecords?.source === "rentcast" ? (
                            <><strong>Grounded by Public Records</strong> — This valuation uses real sale history from county deed records to calibrate AI estimates. Comps and market data remain AI-generated and should be verified with local MLS data.</>
                          ) : (
                            <><strong>AI Estimate</strong> — This valuation is generated by AI based on market knowledge, not MLS transaction records. Values, comps, and market data are estimates and should be verified with local MLS data and a licensed appraiser before making investment decisions.</>
                          )}
                        </div>
                      </div>
                      <div className="val-main-value">
                        <div className="val-value-card primary">
                          <span className="label">AI Estimated Market Value</span>
                          <span className="value">{formatCurrency(valuation.estimatedValue)}</span>
                          <div className="range">
                            <span>{formatCurrency(valuation.valueRange.low)}</span>
                            <div className="range-bar"><div className="range-fill" style={{ width: "50%" }}></div></div>
                            <span>{formatCurrency(valuation.valueRange.high)}</span>
                          </div>
                          <span className="confidence">{valuation.confidence}% Confidence</span>
                        </div>
                        <div className="val-condition-score">
                          <div className="score-ring">
                            <svg viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke={valuation.conditionScore >= 70 ? "#22C55E" : valuation.conditionScore >= 50 ? "#F59E0B" : "#EF4444"} strokeWidth="8" strokeDasharray={`${valuation.conditionScore * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                            </svg>
                            <div className="score-text"><span>{valuation.conditionScore}</span><small>/100</small></div>
                          </div>
                          <span className="score-label">Condition Score</span>
                        </div>
                      </div>
                      <div className="val-approaches">
                        <h4>Valuation Approaches</h4>
                        <div className="val-approaches-grid">
                          <div className="val-approach-card">
                            <h5>Income Approach</h5>
                            <span className="approach-value">{formatCurrency(valuation.approaches.income.value)}</span>
                            <div className="approach-details">
                              <div><span>Cap Rate:</span><span>{valuation.approaches.income.capRate}%</span></div>
                              <div><span>NOI:</span><span>{formatCurrency(valuation.approaches.income.noi)}</span></div>
                            </div>
                          </div>
                          <div className="val-approach-card">
                            <h5>Sales Comparison</h5>
                            <span className="approach-value">{formatCurrency(valuation.approaches.sales.value)}</span>
                            <div className="approach-details">
                              <div><span>$/SF:</span><span>${valuation.approaches.sales.pricePerSqft}</span></div>
                              <div><span>Comps Used:</span><span>{valuation.approaches.sales.adjustedComps}</span></div>
                            </div>
                          </div>
                          <div className="val-approach-card">
                            <h5>Cost Approach</h5>
                            <span className="approach-value">{formatCurrency(valuation.approaches.cost.value)}</span>
                            <div className="approach-details">
                              <div><span>Land:</span><span>{formatCurrency(valuation.approaches.cost.landValue)}</span></div>
                              <div><span>Depreciation:</span><span>{formatCurrency(valuation.approaches.cost.depreciation)}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Market Trend Analysis */}
                      {marketTrends && (
                        <div className="val-market-trends" style={{ marginBottom: "1.25rem" }}>
                          <h4>Local Market Trend Analysis</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div style={{ background: marketTrends.marketTemperature === "hot" ? "#FEF2F2" : marketTrends.marketTemperature === "warm" ? "#FFFBEB" : marketTrends.marketTemperature === "cool" ? "#EFF6FF" : marketTrends.marketTemperature === "cold" ? "#EEF2FF" : "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Market Temp</div>
                              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: marketTrends.marketTemperature === "hot" ? "#DC2626" : marketTrends.marketTemperature === "warm" ? "#D97706" : marketTrends.marketTemperature === "cool" ? "#2563EB" : marketTrends.marketTemperature === "cold" ? "#4338CA" : "#6B7280" }}>
                                {marketTrends.marketTemperature.toUpperCase()}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{marketTrends.temperatureScore}/100</div>
                            </div>
                            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Appreciation</div>
                              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: marketTrends.annualAppreciationRate > 0 ? "#16A34A" : marketTrends.annualAppreciationRate < 0 ? "#DC2626" : "#6B7280" }}>
                                {marketTrends.annualAppreciationRate > 0 ? "+" : ""}{marketTrends.annualAppreciationRate}%
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>annual rate</div>
                            </div>
                            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Days on Market</div>
                              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1B2A4A" }}>
                                {marketTrends.medianDaysOnMarket}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>median DOM</div>
                            </div>
                            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>$/sqft Trend</div>
                              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: marketTrends.pricePerSqftTrend.changePercent > 0 ? "#16A34A" : marketTrends.pricePerSqftTrend.changePercent < 0 ? "#DC2626" : "#6B7280" }}>
                                {marketTrends.pricePerSqftTrend.changePercent > 0 ? "+" : ""}{marketTrends.pricePerSqftTrend.changePercent}%
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>12-month change</div>
                            </div>
                            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "0.75rem", textAlign: "center" }}>
                              <div style={{ fontSize: "0.7rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.25rem" }}>Buyer Demand</div>
                              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1B2A4A" }}>
                                {(marketTrends.buyerDemand || "").replace(/_/g, " ").toUpperCase()}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>inventory: {(marketTrends.inventoryLevel || "").replace(/_/g, " ")}</div>
                            </div>
                          </div>
                          {/* Trend adjustment callout */}
                          {valuation.marketTrendAdjustment && valuation.marketTrendAdjustment.adjustmentPercent !== 0 && (
                            <div style={{ background: valuation.marketTrendAdjustment.adjustmentPercent > 0 ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${valuation.marketTrendAdjustment.adjustmentPercent > 0 ? "#10B981" : "#EF4444"}`, borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem", fontSize: "0.8rem" }}>
                              <strong style={{ color: valuation.marketTrendAdjustment.adjustmentPercent > 0 ? "#065F46" : "#991B1B" }}>
                                Market Trend Adjustment: {valuation.marketTrendAdjustment.adjustmentPercent > 0 ? "+" : ""}{valuation.marketTrendAdjustment.adjustmentPercent}% ({valuation.marketTrendAdjustment.adjustmentAmount > 0 ? "+" : ""}{formatCurrency(valuation.marketTrendAdjustment.adjustmentAmount)})
                              </strong>
                              <div style={{ marginTop: "0.25rem", color: valuation.marketTrendAdjustment.adjustmentPercent > 0 ? "#047857" : "#B91C1C" }}>
                                Base value {formatCurrency(valuation.marketTrendAdjustment.preAdjustmentValue)} adjusted to {formatCurrency(valuation.estimatedValue)} to reflect the {valuation.marketTrendAdjustment.marketTemperature} {valuation.marketTrendAdjustment.trendDirection} market in this area ({valuation.marketTrendAdjustment.annualAppreciationRate > 0 ? "+" : ""}{valuation.marketTrendAdjustment.annualAppreciationRate}% annual appreciation).
                              </div>
                            </div>
                          )}
                          {/* Key drivers */}
                          {marketTrends.keyDrivers && marketTrends.keyDrivers.length > 0 && (
                            <div style={{ marginBottom: "0.5rem" }}>
                              <strong style={{ fontSize: "0.8rem", color: "#374151" }}>Key Market Drivers:</strong>
                              <ul style={{ margin: "0.25rem 0 0 1rem", fontSize: "0.8rem", color: "#4B5563" }}>
                                {marketTrends.keyDrivers.map((d, i) => <li key={i}>{d}</li>)}
                              </ul>
                            </div>
                          )}
                          {/* 12-month outlook */}
                          {marketTrends.outlook12Month && (
                            <div style={{ fontSize: "0.8rem", color: "#374151", fontStyle: "italic", padding: "0.5rem", background: "#F3F4F6", borderRadius: "6px" }}>
                              <strong>12-Month Outlook:</strong> {marketTrends.outlook12Month}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="val-market-factors">
                        <h4>Market Factors</h4>
                        <ul>{valuation.marketFactors.map((factor, i) => <li key={i}>{factor}</li>)}</ul>
                      </div>
                    </div>
                  )}

                  {/* Comps Tab */}
                  {activeTab === "comps" && (
                    <div className="val-comps-content">
                      <div className="val-ai-disclaimer" style={propertyRecords?.source === "rentcast" ? { background: "#ecfdf5", borderColor: "#10b981", color: "#065f46" } : undefined}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <div>
                          {propertyRecords?.source === "rentcast" ? (
                            <><strong>Comps Calibrated by Public Records</strong> — AI-generated comps have been calibrated using real sale history from county deed records for the subject property. Comp addresses and prices are still AI estimates — verify with local MLS data.</>
                          ) : (
                            <><strong>AI Estimated Comps</strong> — These comparable sales are AI-generated estimates, not actual MLS records. Addresses, sale prices, and dates are approximations based on market knowledge for this area. Always verify with local MLS data.</>
                          )}
                        </div>
                      </div>
                      <div className="val-comps-header">
                        <h4>Estimated Comparable Sales</h4>
                        <span>
                          {comps.filter(c => c.verified).length > 0
                            ? `${comps.filter(c => c.verified).length} verified + ${comps.filter(c => !c.verified).length} AI-estimated comps`
                            : `${comps.length} AI-estimated comps`}
                          {comps.some(c => c.googleValidated) ? " - distances verified via Google Maps" : ""}
                        </span>
                      </div>
                      <div className="val-comps-table">
                        <div className="val-comps-row header"><span>Address</span><span>Distance</span><span>Sale Price</span><span>Date</span><span>Sq Ft</span><span>$/SF</span></div>
                        {comps.map(comp => {
                          const recColor = (comp.recencyScore ?? 80) >= 80 ? "#16A34A" : (comp.recencyScore ?? 80) >= 55 ? "#F59E0B" : "#EF4444";
                          return (
                          <div key={comp.id} className="val-comps-row" style={{ flexDirection: "column", gap: "0.25rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr", gap: "0.5rem", alignItems: "center", width: "100%" }}>
                              <span className="address" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                {comp.address}
                                {comp.verified && (
                                  <span title="Verified sale from county records (RentCast)" style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", borderRadius: "4px", background: "#DBEAFE", color: "#1D4ED8", fontSize: "0.6rem", fontWeight: 600 }}>VERIFIED</span>
                                )}
                                {comp.googleValidated && !comp.verified && (
                                  <span title="Address verified via Google Maps" style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", borderRadius: "4px", background: "#DCFCE7", color: "#16A34A", fontSize: "0.6rem", fontWeight: 600 }}>GPS</span>
                                )}
                              </span>
                              <span>{comp.distance}</span>
                              <span className="price">{formatCurrency(comp.salePrice)}</span>
                              <span style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                                <span>{comp.saleDate}</span>
                                {comp.daysAgo !== undefined && (
                                  <span style={{ fontSize: "0.65rem", color: recColor, fontWeight: 600 }}>
                                    {comp.daysAgo}d ago &bull; {comp.recencyLabel}
                                  </span>
                                )}
                              </span>
                              <span>{comp.sqft.toLocaleString()}</span>
                              <span>${comp.pricePerSqft}</span>
                            </div>
                            {comp.adjustments && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", color: "#64748b", paddingLeft: "0.25rem" }}>
                                <span style={{ fontStyle: "italic" }}>Adjustments: {comp.adjustments}</span>
                                {comp.recencyScore !== undefined && (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "4px", background: recColor + "12", color: recColor, fontSize: "0.6rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: recColor, display: "inline-block" }}></span>
                                    Recency {comp.recencyScore}/100
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                      <div className="val-comps-summary">
                        <div className="summary-item"><span>Average Sale Price</span><span>{formatCurrency(comps.reduce((a, b) => a + b.salePrice, 0) / comps.length)}</span></div>
                        <div className="summary-item"><span>Average $/SF</span><span>${Math.round(comps.reduce((a, b) => a + b.pricePerSqft, 0) / comps.length)}</span></div>
                        <div className="summary-item"><span>Median Sale Price</span><span>{formatCurrency([...comps].sort((a, b) => a.salePrice - b.salePrice)[Math.floor(comps.length / 2)].salePrice)}</span></div>
                      </div>
                      {/* Market Report Summary */}
                      {valuation && (
                        <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(27,42,74,0.03)", borderRadius: "8px" }}>
                          <h5 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1B2A4A", marginBottom: "0.75rem" }}>Market Intelligence Report</h5>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "0.75rem" }}>
                            <div style={{ textAlign: "center", padding: "0.5rem", background: "white", borderRadius: "6px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Avg $/SF</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1B2A4A" }}>${valuation.approaches.sales.pricePerSqft}</div>
                            </div>
                            <div style={{ textAlign: "center", padding: "0.5rem", background: "white", borderRadius: "6px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Comps Analyzed</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1B2A4A" }}>{comps.length}</div>
                            </div>
                            <div style={{ textAlign: "center", padding: "0.5rem", background: "white", borderRadius: "6px" }}>
                              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Confidence</div>
                              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: valuation.confidence >= 70 ? "#16A34A" : "#F59E0B" }}>{valuation.confidence}%</div>
                            </div>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8rem", color: "#475569", lineHeight: 1.7 }}>
                            {valuation.marketFactors.map((factor, i) => <li key={i}>{factor}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Improvements Tab */}
                  {activeTab === "improvements" && valuation && (
                    <div className="val-improvements-content">
                      <div className="val-improvements-header">
                        <h4>Value-Add Opportunities</h4>
                        <div className="val-improvements-summary">
                          <span>Total Investment: {formatCurrency(valuation.improvements.reduce((a, b) => a + b.estimatedCost, 0))}</span>
                          <span>Potential Value Add: {formatCurrency(valuation.improvements.reduce((a, b) => a + b.potentialValueAdd, 0))}</span>
                          <span className="roi">ROI: {((valuation.improvements.reduce((a, b) => a + b.potentialValueAdd, 0) / valuation.improvements.reduce((a, b) => a + b.estimatedCost, 0) - 1) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      {/* How calculations work */}
                      <div style={{ padding: "0.75rem 1rem", background: "rgba(212,168,67,0.08)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>
                        <strong style={{ color: "#1B2A4A" }}>How estimates are calculated:</strong> Cost estimates are based on current market rates for materials and labor in your area. ROI is calculated as (Estimated Value Add / Investment Cost) x 100. Value add projections reference industry data from NAR, NARI, and comparable renovation outcomes. All figures are AI-generated estimates and should be verified with local contractor quotes.
                      </div>
                      <div className="val-improvements-list">
                        {valuation.improvements.map((item, i) => (
                          <div key={i} className={`val-improvement-item priority-${item.priority}`}>
                            <div className="improvement-header"><span className="area">{item.area}</span><span className={`priority ${item.priority}`}>{item.priority}</span></div>
                            <p className="issue">{item.issue}</p>
                            <p className="recommendation" style={{ lineHeight: 1.6, marginBottom: "0.75rem" }}>{item.recommendation}</p>
                            {/* Specific Changes to Make */}
                            {item.specificChanges && item.specificChanges.length > 0 && (
                              <div style={{ margin: "0.625rem 0 0.75rem", padding: "0.75rem 0.875rem", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: "8px" }}>
                                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1B2A4A", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                  <svg viewBox="0 0 20 20" fill="#3B82F6" width="14" height="14"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                  Specific Changes to Increase Value
                                </div>
                                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.78rem", color: "#334155", lineHeight: 1.7, listStyleType: "none" }}>
                                  {item.specificChanges.map((change, ci) => (
                                    <li key={ci} style={{ position: "relative", paddingLeft: "0.25rem", marginBottom: "0.25rem" }}>
                                      <span style={{ position: "absolute", left: "-1.1rem", color: "#3B82F6", fontWeight: 700 }}>{ci + 1}.</span>
                                      {change}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="improvement-numbers">
                              <div>
                                <span>Est. Cost</span>
                                <span className="cost">{item.costRange ? `${formatCurrency(item.costRange.low)} - ${formatCurrency(item.costRange.high)}` : formatCurrency(item.estimatedCost)}</span>
                              </div>
                              <div>
                                <span>Value Add</span>
                                <span className="value-add">{formatCurrency(item.potentialValueAdd)}</span>
                              </div>
                              <div>
                                <span>ROI</span>
                                <span className="item-roi">{item.roiPercent ? `${item.roiPercent}%` : `${((item.potentialValueAdd / item.estimatedCost - 1) * 100).toFixed(0)}%`}</span>
                              </div>
                              {item.timeframe && (
                                <div>
                                  <span>Timeframe</span>
                                  <span>{item.timeframe}</span>
                                </div>
                              )}
                            </div>
                            {/* ROI Calculation Breakdown */}
                            <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.75rem", background: "rgba(27,42,74,0.04)", borderRadius: "6px", fontSize: "0.78rem", color: "#475569", lineHeight: 1.6 }}>
                              <div style={{ fontWeight: 600, color: "#1B2A4A", marginBottom: "0.25rem" }}>Investment & Return Calculation</div>
                              <div>Investment: {formatCurrency(item.estimatedCost)} (low est.) x {item.roiPercent || Math.round((item.potentialValueAdd / item.estimatedCost) * 100)}% ROI = <strong style={{ color: "#22C55E" }}>{formatCurrency(item.potentialValueAdd)}</strong> estimated value add</div>
                              <div>Net gain after cost: <strong>{formatCurrency(item.potentialValueAdd - item.estimatedCost)}</strong></div>
                            </div>
                            {/* Cost Basis */}
                            {item.costBasis && (
                              <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(27,42,74,0.02)", borderRadius: "6px", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.5 }}>
                                <strong style={{ color: "#475569" }}>Cost Estimate Basis:</strong> {item.costBasis}
                              </div>
                            )}
                            {/* Value Rationale */}
                            {item.valueRationale && (
                              <div style={{ marginTop: "0.375rem", padding: "0.5rem 0.75rem", background: "rgba(34,197,94,0.04)", borderRadius: "6px", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.5 }}>
                                <strong style={{ color: "#16A34A" }}>Value Rationale:</strong> {item.valueRationale}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map Tab – Google Maps, Street View, Amenities */}
                  {activeTab === "map" && (
                    <div className="val-map-content">
                      {/* Street View */}
                      {address && (
                        <div style={{ marginBottom: "1rem" }}>
                          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", fontWeight: 600 }}>Street View</h4>
                          <StreetView
                            address={`${address}, ${city}, ${state} ${zipCode}`}
                            location={coordinates || undefined}
                            height={280}
                            multiAngle
                          />
                        </div>
                      )}

                      {/* Interactive Map with Comps */}
                      <div style={{ marginBottom: "1rem" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", fontWeight: 600 }}>Property Map</h4>
                        <PropertyMap
                          address={`${address}, ${city}, ${state} ${zipCode}`}
                          location={coordinates || undefined}
                          propertyValue={valuation?.estimatedValue}
                          comparables={comps.map(c => ({
                            address: c.address,
                            salePrice: c.salePrice,
                            distance: c.distance,
                          }))}
                          height={350}
                        />
                        <div className="map-legend" style={{ marginTop: "0.5rem" }}>
                          <div className="legend-item"><span className="dot subject"></span><span>Subject Property</span></div>
                          <div className="legend-item"><span className="dot comp"></span><span>Comparable Sales ({comps.length})</span></div>
                        </div>
                      </div>

                      {/* Nearby Amenities */}
                      {coordinates && (
                        <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary, #f8fafc)", borderRadius: "8px" }}>
                          <NearbyAmenities lat={coordinates.lat} lng={coordinates.lng} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Investment Summary Table - always visible when underwriting data exists */}
                {isIncomeProperty && (underwriting || totalExpenses > 0 || grossPotentialRent > 0) && (
                  <div className="val-summary-table" id="investment-summary">
                    <div className="val-summary-header">
                      <h4>Investment Summary</h4>
                      <div className="val-summary-actions">
                        <button className="val-summary-export-btn" onClick={exportCSV} title="Download CSV">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          CSV
                        </button>
                        <button className="val-summary-export-btn" onClick={exportExcel} title="Download Excel">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          XLS
                        </button>
                        <button className="val-summary-export-btn" onClick={exportPDF} title="Print / PDF">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          PDF
                        </button>
                      </div>
                    </div>
                    <table className="val-summary-tbl">
                      <thead>
                        <tr><th>Line Item</th><th>Value</th><th>Notes</th></tr>
                      </thead>
                      <tbody>
                        {/* ACQUISITION */}
                        <tr className="section-row"><td colSpan={3}>Acquisition</td></tr>
                        <tr><td>Purchase Price</td><td className="val-r">{underwriting ? formatCurrency(underwriting.purchasePrice) : "-"}</td><td className="val-note"></td></tr>
                        {underwriting?.pricePerUnit && <tr><td>Price Per Unit</td><td className="val-r">{formatCurrency(underwriting.pricePerUnit)}</td><td className="val-note">{units} units</td></tr>}
                        {underwriting?.pricePerSqft && <tr><td>Price Per Sq Ft</td><td className="val-r">${underwriting.pricePerSqft}</td><td className="val-note">{parseInt(sqft).toLocaleString()} SF</td></tr>}
                        <tr><td>Down Payment</td><td className="val-r">{underwriting ? formatCurrency(underwriting.downPayment) : "-"}</td><td className="val-note">{downPaymentPercent}%</td></tr>
                        {underwriting?.closingCosts ? <tr><td>Est. Closing Costs</td><td className="val-r">{formatCurrency(underwriting.closingCosts)}</td><td className="val-note">{enrichmentData?.closingCosts?.buyerClosingCostPercent || 3.5}%</td></tr> : null}
                        {underwriting?.totalCashRequired ? <tr className="highlight-row"><td>Total Cash Required</td><td className="val-r">{formatCurrency(underwriting.totalCashRequired)}</td><td className="val-note"></td></tr> : null}

                        {/* FINANCING */}
                        <tr className="section-row"><td colSpan={3}>Financing</td></tr>
                        <tr><td>Loan Amount</td><td className="val-r">{underwriting ? formatCurrency(underwriting.loanAmount) : "-"}</td><td className="val-note"></td></tr>
                        <tr><td>Interest Rate</td><td className="val-r">{underwriting ? `${underwriting.interestRate}%` : "-"}</td><td className="val-note live-tag">{liveRates.source !== "loading..." ? `${liveRates.source}` : ""}</td></tr>
                        <tr><td>Loan Term</td><td className="val-r">{underwriting ? `${underwriting.loanTerm} yrs` : "-"}</td><td className="val-note"></td></tr>
                        <tr><td>Monthly Payment</td><td className="val-r">{underwriting ? formatCurrency(Math.round(underwriting.monthlyPayment)) : "-"}</td><td className="val-note"></td></tr>
                        <tr><td>Annual Debt Service</td><td className="val-r">{underwriting ? formatCurrency(Math.round(underwriting.annualDebtService)) : "-"}</td><td className="val-note"></td></tr>

                        {/* INCOME */}
                        <tr className="section-row"><td colSpan={3}>Income</td></tr>
                        <tr><td>Gross Potential Rent</td><td className="val-r">{formatCurrency(grossPotentialRent)}</td><td className="val-note">{rentRoll.length > 0 ? `${rentRoll.length} units` : "manual"}</td></tr>
                        <tr className="negative-row"><td>Vacancy &amp; Loss</td><td className="val-r">-{formatCurrency(vacancyLoss)}</td><td className="val-note">{vacancyRate}%</td></tr>
                        <tr className="subtotal-row"><td>Effective Gross Income</td><td className="val-r">{formatCurrency(effectiveGrossIncome)}</td><td className="val-note"></td></tr>

                        {/* OPERATING EXPENSES */}
                        <tr className="section-row"><td colSpan={3}>Operating Expenses</td></tr>
                        {expenses.filter(e => e.annual > 0 || e.monthly > 0).map(exp => (
                          <tr key={exp.id}><td>{exp.category}</td><td className="val-r">-{formatCurrency(exp.annual)}</td><td className="val-note">{formatCurrency(exp.monthly)}/mo</td></tr>
                        ))}
                        {expenses.every(e => e.annual === 0 && e.monthly === 0) && (
                          <tr><td colSpan={3} className="val-note" style={{ textAlign: "center", padding: "0.5rem" }}>No expenses entered — use the P&L tab</td></tr>
                        )}
                        <tr className="subtotal-row"><td>Total Operating Expenses</td><td className="val-r">-{formatCurrency(totalExpenses)}</td><td className="val-note">{effectiveGrossIncome > 0 ? `${((totalExpenses / effectiveGrossIncome) * 100).toFixed(1)}%` : ""}</td></tr>

                        {/* NOI */}
                        <tr className="noi-row"><td>Net Operating Income (NOI)</td><td className="val-r">{formatCurrency(noiFromPnL)}</td><td className="val-note"></td></tr>

                        {/* CASH FLOW */}
                        <tr className="section-row"><td colSpan={3}>Cash Flow</td></tr>
                        <tr><td>NOI</td><td className="val-r">{formatCurrency(noiFromPnL)}</td><td className="val-note"></td></tr>
                        <tr className="negative-row"><td>Less: Annual Debt Service</td><td className="val-r">{underwriting ? `-${formatCurrency(Math.round(underwriting.annualDebtService))}` : "-"}</td><td className="val-note"></td></tr>
                        {(() => {
                          const annualCf = underwriting ? noiFromPnL - underwriting.annualDebtService : 0;
                          return (
                            <>
                              <tr className={`highlight-row ${annualCf >= 0 ? "positive" : "negative"}`}><td>Annual Cash Flow</td><td className="val-r">{formatCurrency(Math.round(annualCf))}</td><td className="val-note"></td></tr>
                              <tr className={annualCf >= 0 ? "positive" : "negative"}><td>Monthly Cash Flow</td><td className="val-r">{formatCurrency(Math.round(annualCf / 12))}</td><td className="val-note"></td></tr>
                            </>
                          );
                        })()}

                        {/* RETURN METRICS */}
                        <tr className="section-row"><td colSpan={3}>Return Metrics</td></tr>
                        <tr><td>Cap Rate</td><td className="val-r">{underwriting ? `${underwriting.capRate.toFixed(2)}%` : "-"}</td><td className="val-note">NOI / Price</td></tr>
                        <tr className="highlight-row"><td>Cash-on-Cash Return</td><td className="val-r">{underwriting ? `${underwriting.cashOnCash.toFixed(2)}%` : "-"}</td><td className="val-note">Cash Flow / Total Cash In</td></tr>
                        <tr><td>DSCR</td><td className="val-r">{underwriting ? `${underwriting.dscr.toFixed(2)}x` : "-"}</td><td className="val-note">NOI / Debt Service</td></tr>
                        <tr><td>GRM</td><td className="val-r">{underwriting ? `${underwriting.grm.toFixed(2)}x` : "-"}</td><td className="val-note">Price / Gross Rent</td></tr>
                        {underwriting?.breakEvenOccupancy ? <tr><td>Break-Even Occupancy</td><td className="val-r">{underwriting.breakEvenOccupancy.toFixed(1)}%</td><td className="val-note"></td></tr> : null}
                      </tbody>
                    </table>
                    <div className="val-summary-footer">
                      <span>Rates: {liveRates.source} ({liveRates.lastUpdated})</span>
                      <span>{enrichmentData?.source === "openai" ? "Area data: AI analysis" : enrichmentData ? "Area data: Estimates" : ""}</span>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div className="val-notes-section">
                  <h4>Notes</h4>
                  <textarea placeholder="Add notes about this property or deal..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}></textarea>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Promote to Marketplace Modal */}
      {showPromoteModal && (
        <div className="val-modal-overlay" onClick={() => setShowPromoteModal(false)}>
          <div className="val-modal" onClick={(e) => e.stopPropagation()}>
            <div className="val-modal-header"><h3>List Property for Sale</h3><button onClick={() => setShowPromoteModal(false)}>×</button></div>
            <div className="val-modal-content">
              <p>Make this property visible to buyers on the Legacy RE Marketplace.</p>
              <div className="promote-form">
                <label>Asking Price</label>
                <input type="number" placeholder="Enter asking price" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} />
                {valuation && <p className="estimate-note">Estimated value: {formatCurrency(valuation.estimatedValue)}</p>}
              </div>
              <div className="promote-actions">
                <button className="cancel" onClick={() => setShowPromoteModal(false)}>Cancel</button>
                <button className="promote" onClick={promoteToMarketplace} disabled={!askingPrice}>List Property</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Workspaces Modal */}
      {showSavedWorkspaces && (
        <div className="val-modal-overlay" onClick={() => setShowSavedWorkspaces(false)}>
          <div className="val-modal" onClick={(e) => e.stopPropagation()}>
            <div className="val-modal-header"><h3>Saved Workspaces</h3><button onClick={() => setShowSavedWorkspaces(false)}>×</button></div>
            <div className="val-modal-content">
              {savedWorkspaces.length > 0 ? (
                <div className="val-workspaces-list">
                  {savedWorkspaces.map(workspace => (
                    <div key={workspace.id} className="val-workspace-item">
                      <div className="workspace-info" onClick={() => loadWorkspace(workspace)}>
                        <span className="workspace-name">{workspace.name} {workspace.isPublic && <span className="public-tag">On Market</span>}</span>
                        <span className="workspace-address">{workspace.address}</span>
                        <div className="workspace-meta">
                          <span>{workspace.date}</span>
                          <span>{PROPERTY_TYPES.find(t => t.id === workspace.propertyType)?.name}</span>
                          {workspace.valuation && <span className="workspace-value">{formatCurrency(workspace.valuation.estimatedValue)}</span>}
                          {!workspace.valuation && workspace.underwriting && <span className="workspace-value">NOI: {formatCurrency(workspace.underwriting.noi)}</span>}
                        </div>
                      </div>
                      <button className="workspace-delete" onClick={() => deleteWorkspace(workspace.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="val-no-workspaces"><p>No saved workspaces yet</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
