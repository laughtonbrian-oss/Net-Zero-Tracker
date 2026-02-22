/**
 * Seed script — Meridian Forge Ltd (primary) + Apex Composites Ltd (second tenant)
 *
 * Run with:  npx tsx prisma/seed.ts
 *
 * 32 interventions across all 13 sites, both scenarios, technicalAssetLife on every
 * ScenarioIntervention record. Designed for a visually rich MACC chart with bars both
 * sides of zero.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaLibSql({ url });
const db = new PrismaClient({ adapter } as never) as PrismaClient;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

/** Linear ramp from startYear to fullYear, constant at annualAtFull from fullYear to 2050 */
function ramp(
  startYear: number,
  fullYear: number,
  annualAtFull: number
): Array<{ year: number; tco2eReduction: number }> {
  const steps = Math.max(1, fullYear - startYear + 1);
  const r = [];
  for (let y = startYear; y <= 2050; y++) {
    if (y >= fullYear) {
      r.push({ year: y, tco2eReduction: annualAtFull });
    } else {
      r.push({
        year: y,
        tco2eReduction: Math.round((annualAtFull * (y - startYear + 1)) / steps),
      });
    }
  }
  return r;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database…\n");

  // ── Wipe existing data (order respects FK constraints) ────────────────────
  await db.growthRate.deleteMany();
  await db.actualEmission.deleteMany();
  await db.energyReading.deleteMany();
  await db.companyEmissionFactor.deleteMany();
  await db.interventionAnnualReduction.deleteMany();
  await db.interventionDocument.deleteMany();
  await db.scenarioIntervention.deleteMany();
  await db.scenario.deleteMany();
  await db.asset.deleteMany();
  await db.intervention.deleteMany();
  await db.businessUnit.deleteMany();
  await db.site.deleteMany();
  await db.baselineEntry.deleteMany();
  await db.baseline.deleteMany();
  await db.target.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
  await db.company.deleteMany();

  // ──────────────────────────────────────────────────────────────────────────
  // COMPANY 1 — Meridian Forge Ltd
  // ──────────────────────────────────────────────────────────────────────────
  const meridian = await db.company.create({
    data: { name: "Meridian Forge Ltd", slug: "meridian-forge", plan: "PAID" },
  });
  console.log(`✅  Company: ${meridian.name}`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const pw = await hash("Password123!");

  const sarah = await db.user.create({
    data: {
      companyId: meridian.id,
      name: "Sarah Chen",
      email: "sarah.chen@meridianforge.co.uk",
      password: pw,
      role: "ADMIN",
    },
  });
  const james = await db.user.create({
    data: {
      companyId: meridian.id,
      name: "James Whitmore",
      email: "james.whitmore@meridianforge.co.uk",
      password: pw,
      role: "EDITOR",
    },
  });
  const priya = await db.user.create({
    data: {
      companyId: meridian.id,
      name: "Priya Patel",
      email: "priya.patel@meridianforge.co.uk",
      password: pw,
      role: "VIEWER",
    },
  });
  console.log(`✅  Users: ${sarah.name} (Admin), ${james.name} (Editor), ${priya.name} (Viewer)`);

  // ── Sites ─────────────────────────────────────────────────────────────────
  const sheffield = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Sheffield Works",
      address: "Newhall Road, Sheffield, S9 2QL",
      region: "Yorkshire",
      country: "United Kingdom",
      latitude: 53.3949,
      longitude: -1.4185,
    },
  });
  const manchester = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Manchester Distribution Centre",
      address: "Port Salford, Salford, M5 2XS",
      region: "Greater Manchester",
      country: "United Kingdom",
      latitude: 53.4788,
      longitude: -2.301,
    },
  });
  const bristol = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Bristol Assembly",
      address: "Aztec West Business Park, Bristol, BS32 4TD",
      region: "West of England",
      country: "United Kingdom",
      latitude: 51.5237,
      longitude: -2.5427,
    },
  });
  const chicago = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Chicago Manufacturing Hub",
      address: "2200 S Halsted St, Chicago, IL 60608",
      region: "Illinois",
      country: "United States",
      latitude: 41.8781,
      longitude: -87.6298,
    },
  });
  const houston = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Houston Operations Centre",
      address: "8900 N Sam Houston Pkwy E, Houston, TX 77064",
      region: "Texas",
      country: "United States",
      latitude: 29.7604,
      longitude: -95.3698,
    },
  });
  const losAngeles = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Los Angeles Facility",
      address: "2401 E 8th St, Los Angeles, CA 90021",
      region: "California",
      country: "United States",
      latitude: 34.0537,
      longitude: -118.2427,
    },
  });
  const seattle = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Seattle Tech Centre",
      address: "4000 Aurora Ave N, Seattle, WA 98103",
      region: "Washington",
      country: "United States",
      latitude: 47.548,
      longitude: -122.3553,
    },
  });
  const atlanta = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Atlanta Distribution",
      address: "3200 Piedmont Rd NE, Atlanta, GA 30305",
      region: "Georgia",
      country: "United States",
      latitude: 33.749,
      longitude: -84.388,
    },
  });
  const denver = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Denver Regional Office",
      address: "1700 Lincoln St, Denver, CO 80203",
      region: "Colorado",
      country: "United States",
      latitude: 39.7392,
      longitude: -104.9903,
    },
  });
  const toronto = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Toronto Assembly Plant",
      address: "1 Port Industrial Blvd, Toronto, ON M5A 1A4",
      region: "Ontario",
      country: "Canada",
      latitude: 43.6532,
      longitude: -79.3832,
    },
  });
  const vancouver = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Vancouver Logistics",
      address: "1200 Terminal Ave, Vancouver, BC V6A 2R2",
      region: "British Columbia",
      country: "Canada",
      latitude: 49.2827,
      longitude: -123.1207,
    },
  });
  const calgary = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Calgary Processing Facility",
      address: "4500 52 Ave SE, Calgary, AB T2B 3R2",
      region: "Alberta",
      country: "Canada",
      latitude: 51.0447,
      longitude: -114.0719,
    },
  });
  const warsaw = await db.site.create({
    data: {
      companyId: meridian.id,
      name: "Warsaw European Hub",
      address: "ul. Puławska 182, 02-670 Warszawa",
      region: "Masovian",
      country: "Poland",
      latitude: 52.2297,
      longitude: 21.0122,
    },
  });
  console.log(`✅  Sites: 13 total (3 UK, 6 US, 3 Canada, 1 Poland)`);

  // ── Business Units ─────────────────────────────────────────────────────────
  const buManufacturing = await db.businessUnit.create({
    data: { companyId: meridian.id, name: "Manufacturing" },
  });
  const buLogistics = await db.businessUnit.create({
    data: { companyId: meridian.id, name: "Logistics & Distribution" },
  });
  const buCorporate = await db.businessUnit.create({
    data: { companyId: meridian.id, name: "Corporate & Facilities" },
  });
  console.log(`✅  Business units: Manufacturing, Logistics & Distribution, Corporate & Facilities`);

  // ── Baseline ──────────────────────────────────────────────────────────────
  const baseline = await db.baseline.create({
    data: {
      companyId: meridian.id,
      year: 2022,
      growthRatePct: 1.2,
      entries: {
        create: [
          { scope: 1, category: "Natural Gas Combustion", emissionsTco2e: 4200 },
          { scope: 1, category: "Diesel Fleet & Plant", emissionsTco2e: 1850 },
          { scope: 1, category: "Fugitive Emissions (Refrigerants)", emissionsTco2e: 650 },
          { scope: 2, category: "Purchased Electricity", emissionsTco2e: 3800 },
          { scope: 3, category: "Purchased Goods & Services", emissionsTco2e: 4200 },
          { scope: 3, category: "Employee Commuting", emissionsTco2e: 580 },
          { scope: 3, category: "Business Travel", emissionsTco2e: 320 },
          { scope: 3, category: "Upstream Transport & Distribution", emissionsTco2e: 1100 },
          { scope: 3, category: "Downstream Transport", emissionsTco2e: 820 },
          { scope: 3, category: "Waste Generated in Operations", emissionsTco2e: 280 },
        ],
      },
    },
  });
  await db.growthRate.createMany({
    data: [
      { baselineId: baseline.id, fromYear: 2023, toYear: 2030, ratePct: 1.2 },
      { baselineId: baseline.id, fromYear: 2031, toYear: 2040, ratePct: 0.5 },
      { baselineId: baseline.id, fromYear: 2041, toYear: 2050, ratePct: 0.0 },
    ],
  });
  console.log(`✅  Baseline: 2022, 17,800 tCO₂e (S1: 6,700 | S2: 3,800 | S3: 7,300)`);

  // ── Targets ───────────────────────────────────────────────────────────────
  await db.target.createMany({
    data: [
      {
        companyId: meridian.id,
        label: "SBTi Near-Term — 50% Scope 1+2 by 2030",
        scopeCombination: "1+2",
        targetYear: 2030,
        reductionPct: 50,
        isInterim: true,
        isSbtiAligned: true,
      },
      {
        companyId: meridian.id,
        label: "Net Zero — 90% Scope 1+2+3 by 2050",
        scopeCombination: "1+2+3",
        targetYear: 2050,
        reductionPct: 90,
        isInterim: false,
        isSbtiAligned: true,
      },
    ],
  });
  console.log(`✅  Targets: SBTi near-term (2030) + Net Zero (2050)`);

  // ────────────────────────────────────────────────────────────────────────────
  // INTERVENTIONS — 32 across all 13 sites + company-wide
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Sheffield Works (5) ──────────────────────────────────────────────────
  const solar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Rooftop Solar PV — Sheffield Works",
      description: "1.2 MWp rooftop PV array across forge building and warehouse roof. Sleeved PPA with zero upfront capex.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 5250,
      implementationStartYear: 2024,
      fullBenefitYear: 2025,
      status: "COMPLETED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2024, 2025, 1050).map((r) => ({ interventionId: solar.id, ...r })),
  });

  const led = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "LED Lighting Upgrade — Sheffield Works",
      description: "Full LED retrofit across forge floor, warehouse aisles, and office block. ESOS audit-identified quick win with 18-month payback.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 19200,
      implementationStartYear: 2023,
      fullBenefitYear: 2024,
      status: "COMPLETED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2023, 2024, 1600).map((r) => ({ interventionId: led.id, ...r })),
  });

  const compAir = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Compressed Air Optimisation — Sheffield Works",
      description: "Variable speed drives on compressors, leak detection survey, and pressure optimisation. Quick-win project with 18-month payback.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 1050,
      implementationStartYear: 2024,
      fullBenefitYear: 2025,
      status: "IN_PROGRESS",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2024, 2025, 150).map((r) => ({ interventionId: compAir.id, ...r })),
  });

  const insulation = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Building Fabric Insulation — Sheffield Works",
      description: "Roof insulation top-up (300mm mineral wool), cavity wall insulation on the office block, and replacement of single-glazed roof lights.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 3200,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 640).map((r) => ({ interventionId: insulation.id, ...r })),
  });

  const heatPump = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Industrial Heat Pump — Sheffield Works",
      description: "High-temperature industrial heat pump to replace gas-fired boiler system. Requires IETF grant application.",
      category: "Process Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 16800,
      implementationStartYear: 2026,
      fullBenefitYear: 2028,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2028, 4200).map((r) => ({ interventionId: heatPump.id, ...r })),
  });

  // ─── Manchester Distribution Centre (2) ───────────────────────────────────
  const manchFleet = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: manchester.id,
      businessUnitId: buLogistics.id,
      name: "Fleet Electrification — Manchester DC",
      description: "Phased replacement of 14 diesel HGVs and 6 light commercial vehicles with battery-electric equivalents. LEVI grant application submitted.",
      category: "Transport Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 9000,
      implementationStartYear: 2026,
      fullBenefitYear: 2029,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2029, 2250).map((r) => ({ interventionId: manchFleet.id, ...r })),
  });

  const manchBMS = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: manchester.id,
      businessUnitId: buLogistics.id,
      name: "Building Management System — Manchester DC",
      description: "Smart BMS to optimise heating, cooling, and lighting schedules. Integration with weather API and occupancy sensors.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 2520,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 420).map((r) => ({ interventionId: manchBMS.id, ...r })),
  });

  // ─── Bristol Assembly (2) ─────────────────────────────────────────────────
  const bristolHP = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: bristol.id,
      businessUnitId: buManufacturing.id,
      name: "Heat Pump HVAC — Bristol Assembly",
      description: "Air-source heat pump system to replace ageing gas boilers for space heating and hot water. Sized at 280 kW output.",
      category: "Process Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 2900,
      implementationStartYear: 2027,
      fullBenefitYear: 2029,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2027, 2029, 870).map((r) => ({ interventionId: bristolHP.id, ...r })),
  });

  const bristolSolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: bristol.id,
      businessUnitId: buManufacturing.id,
      name: "Rooftop Solar PV — Bristol Assembly",
      description: "480 kWp rooftop solar installation on the main assembly hall. Excess generation exported to grid.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 1200,
      implementationStartYear: 2026,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 240).map((r) => ({ interventionId: bristolSolar.id, ...r })),
  });

  // ─── Chicago Manufacturing Hub (2) ────────────────────────────────────────
  const chicagoSolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: chicago.id,
      businessUnitId: buManufacturing.id,
      name: "Solar PV Array — Chicago Hub",
      description: "1.0 MWp ground-mounted solar array on adjacent land. ITC tax credit (30%) reduces net cost significantly.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 2600,
      implementationStartYear: 2026,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 520).map((r) => ({ interventionId: chicagoSolar.id, ...r })),
  });

  const chicagoCA = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: chicago.id,
      businessUnitId: buManufacturing.id,
      name: "Compressed Air Optimisation — Chicago Hub",
      description: "VSD compressor upgrades, leak survey, and pressure optimisation programme. DOE BestPractices guidelines applied.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 1440,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 180).map((r) => ({ interventionId: chicagoCA.id, ...r })),
  });

  // ─── Houston Operations Centre (2) ────────────────────────────────────────
  const houstonLED = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: houston.id,
      businessUnitId: buManufacturing.id,
      name: "LED Lighting & Controls — Houston",
      description: "LED fixture replacement plus occupancy and daylight sensing controls across operations centre. Estimated 62% reduction in lighting energy.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 2175,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 290).map((r) => ({ interventionId: houstonLED.id, ...r })),
  });

  const houstonBMS = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: houston.id,
      businessUnitId: buManufacturing.id,
      name: "Building Management Systems — Houston",
      description: "Integrated BMS to optimise HVAC, compressed air scheduling, and process heating. Estimated 18% reduction in site energy.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 2100,
      implementationStartYear: 2026,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 350).map((r) => ({ interventionId: houstonBMS.id, ...r })),
  });

  // ─── Los Angeles Facility (2) ─────────────────────────────────────────────
  const laFleet = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: losAngeles.id,
      businessUnitId: buLogistics.id,
      name: "Fleet Electrification — Los Angeles",
      description: "Replacement of 8 diesel delivery vehicles with battery-electric alternatives. CARB ZEV mandate accelerates timeline.",
      category: "Transport Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 4340,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 1240).map((r) => ({ interventionId: laFleet.id, ...r })),
  });

  const laSolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: losAngeles.id,
      businessUnitId: buLogistics.id,
      name: "Rooftop Solar PV — Los Angeles",
      description: "750 kWp rooftop PV system. High irradiance location gives excellent yield. ITC 30% tax credit applied.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 1900,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 380).map((r) => ({ interventionId: laSolar.id, ...r })),
  });

  // ─── Seattle Tech Centre (2) ──────────────────────────────────────────────
  const seattleHP = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: seattle.id,
      businessUnitId: buCorporate.id,
      name: "Heat Pumps — Seattle Tech Centre",
      description: "Air-source heat pump system to decarbonise space heating in office and lab areas. Mild Seattle climate gives excellent COP.",
      category: "Process Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 1360,
      implementationStartYear: 2026,
      fullBenefitYear: 2028,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2028, 340).map((r) => ({ interventionId: seattleHP.id, ...r })),
  });

  const seattleIns = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: seattle.id,
      businessUnitId: buCorporate.id,
      name: "Building Fabric Insulation — Seattle Centre",
      description: "External wall insulation, roof upgrade, and high-performance glazing. Works complement heat pump installation.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 1140,
      implementationStartYear: 2027,
      fullBenefitYear: 2029,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2027, 2029, 190).map((r) => ({ interventionId: seattleIns.id, ...r })),
  });

  // ─── Atlanta Distribution (2) ─────────────────────────────────────────────
  const atlantaSolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: atlanta.id,
      businessUnitId: buLogistics.id,
      name: "Solar PV — Atlanta Distribution",
      description: "800 kWp rooftop and canopy solar at the Atlanta distribution centre. High solar irradiance in Georgia gives strong yield.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 2050,
      implementationStartYear: 2026,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 410).map((r) => ({ interventionId: atlantaSolar.id, ...r })),
  });

  const atlantaLED = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: atlanta.id,
      businessUnitId: buLogistics.id,
      name: "LED Lighting — Atlanta Distribution",
      description: "High-bay LED fixtures replacing metal halide fittings in the 120,000 sq ft warehouse. Motion sensing reduces hours further.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 1275,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 170).map((r) => ({ interventionId: atlantaLED.id, ...r })),
  });

  // ─── Denver Regional Office (2) ───────────────────────────────────────────
  const denverSolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: denver.id,
      businessUnitId: buCorporate.id,
      name: "Rooftop Solar — Denver Office",
      description: "500 kWp solar array on office building roof. Denver's high altitude and 300 annual sunny days deliver excellent performance.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 1300,
      implementationStartYear: 2026,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 260).map((r) => ({ interventionId: denverSolar.id, ...r })),
  });

  const denverFleet = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: denver.id,
      businessUnitId: buCorporate.id,
      name: "Fleet Electrification — Denver",
      description: "Replacement of 12-vehicle company car and light commercial fleet with EVs. CVRP incentives available in Colorado.",
      category: "Transport Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 2100,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 560).map((r) => ({ interventionId: denverFleet.id, ...r })),
  });

  // ─── Toronto Assembly Plant (2) ───────────────────────────────────────────
  const torontoFleet = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: toronto.id,
      businessUnitId: buManufacturing.id,
      name: "Fleet Electrification — Toronto Plant",
      description: "Full electrification of 18-vehicle delivery and yard management fleet. iZEV incentive covers up to CAD 5,000 per vehicle.",
      category: "Transport Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 5920,
      implementationStartYear: 2026,
      fullBenefitYear: 2029,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2029, 2220).map((r) => ({ interventionId: torontoFleet.id, ...r })),
  });

  const torontoIns = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: toronto.id,
      businessUnitId: buManufacturing.id,
      name: "Building Insulation — Toronto Plant",
      description: "Roof, wall, and floor insulation upgrade to meet ASHRAE 90.1-2019 standard. Cold climate makes heating savings significant.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 1860,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 620).map((r) => ({ interventionId: torontoIns.id, ...r })),
  });

  // ─── Vancouver Logistics (2) ──────────────────────────────────────────────
  const vanHP = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: vancouver.id,
      businessUnitId: buLogistics.id,
      name: "Heat Pumps — Vancouver Logistics",
      description: "Ground-source heat pump system utilising the mild Pacific Northwest climate. BC Hydro CleanBC incentive covers 25% of capex.",
      category: "Process Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 1740,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 580).map((r) => ({ interventionId: vanHP.id, ...r })),
  });

  const vanPPA = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: vancouver.id,
      businessUnitId: buCorporate.id,
      name: "Corporate PPA — North America",
      description: "Virtual PPA for 8 GWh/yr of Canadian hydropower certificates covering all Canadian and US sites. 10-year term.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 4800,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 480).map((r) => ({ interventionId: vanPPA.id, ...r })),
  });

  // ─── Calgary Processing Facility (2) ──────────────────────────────────────
  const calgarySolar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: calgary.id,
      businessUnitId: buManufacturing.id,
      name: "Solar PV — Calgary Processing",
      description: "400 kWp rooftop PV system. Alberta's deregulated electricity market allows direct export of surplus generation.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 950,
      implementationStartYear: 2027,
      fullBenefitYear: 2028,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2027, 2028, 190).map((r) => ({ interventionId: calgarySolar.id, ...r })),
  });

  const calgaryLED = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: calgary.id,
      businessUnitId: buManufacturing.id,
      name: "LED Lighting — Calgary Processing",
      description: "LED retrofit across processing facility. Long operating hours (16hr/day) and cold-climate ballast inefficiencies make this a strong ROI project.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 1050,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 210).map((r) => ({ interventionId: calgaryLED.id, ...r })),
  });

  // ─── Warsaw European Hub (2) ──────────────────────────────────────────────
  const warsawIns = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: warsaw.id,
      businessUnitId: buManufacturing.id,
      name: "Building Insulation — Warsaw Hub",
      description: "Comprehensive thermal envelope upgrade: external insulation (200mm EPS), roof insulation, and triple-glazed windows. High grid factor makes electricity savings impactful.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 3520,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 880).map((r) => ({ interventionId: warsawIns.id, ...r })),
  });

  const warsawLED = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: warsaw.id,
      businessUnitId: buManufacturing.id,
      name: "LED Lighting & Controls — Warsaw Hub",
      description: "Full LED retrofit with DALI control system and daylight dimming. Poland's high grid emission factor (0.773 kgCO2e/kWh) makes lighting savings particularly impactful.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 2850,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 380).map((r) => ({ interventionId: warsawLED.id, ...r })),
  });

  // ─── Company-wide (3) ─────────────────────────────────────────────────────
  const ppa = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "Corporate Renewable PPA — UK Sites",
      description: "10-year sleeved PPA with Vattenfall for 5 GWh/yr of UK offshore wind. Eliminates remaining market-based Scope 2 across UK sites.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 15200,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 1900).map((r) => ({ interventionId: ppa.id, ...r })),
  });

  const supplyChain = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "Supply Chain Decarbonisation Programme",
      description: "Engagement with top-20 suppliers representing 70% of Scope 3 Category 1. Includes supplier scorecards, joint reduction targets, and annual reporting.",
      category: "Supply Chain",
      scopesAffected: "[3]",
      totalReductionTco2e: 12600,
      implementationStartYear: 2026,
      fullBenefitYear: 2030,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2030, 3150).map((r) => ({ interventionId: supplyChain.id, ...r })),
  });

  const ukEV = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "EV Charging Network — UK Sites",
      description: "Installation of 60 AC and 6 DC rapid chargers across Sheffield, Manchester, and Bristol sites. Supports fleet transition and employee EV adoption.",
      category: "Transport Decarbonisation",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 2880,
      implementationStartYear: 2026,
      fullBenefitYear: 2028,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2028, 720).map((r) => ({ interventionId: ukEV.id, ...r })),
  });

  console.log(`✅  Interventions (32) + annual reductions through 2050`);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIOS
  // ──────────────────────────────────────────────────────────────────────────

  const scenarioAmbitious = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Ambitious — Net Zero by 2040",
      description: "All major capital projects front-loaded. Higher capex 2025–2030 targets Scope 1+2 elimination by 2035 with supply chain programme delivering net zero by 2040. Assumes grant funding for heat pumps and 100% EV fleets by 2029.",
    },
  });

  const scenarioConservative = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Conservative — Net Zero by 2050",
      description: "Phased approach to manage technology risk and capital constraints. Capital-intensive projects deferred 3–4 years. Lower execution % on fleet and supply chain reflecting market and engagement risks.",
    },
  });

  // ── Ambitious ScenarioInterventions ───────────────────────────────────────
  await db.scenarioIntervention.createMany({
    data: [
      // Sheffield Works
      {
        scenarioId: scenarioAmbitious.id, interventionId: solar.id,
        startYear: 2024, endYear: 2049, executionPct: 100,
        capex: 0, opex: 18000, financialLifetime: 20, technicalAssetLife: 25,
        notes: "Sleeved PPA — zero upfront capex. O&M included in opex.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: led.id,
        startYear: 2023, endYear: 2038, executionPct: 100,
        capex: 285000, opex: 5000, externalFunding: 900000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Already completed. Energy savings NPV factored in as external funding.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: compAir.id,
        startYear: 2024, endYear: 2039, executionPct: 100,
        capex: 128000, opex: 8000, externalFunding: 480000, financialLifetime: 8, technicalAssetLife: 15,
        notes: "In progress. Savings NPV over 8yr factored in.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: insulation.id,
        startYear: 2025, endYear: 2055, executionPct: 100,
        capex: 420000, opex: 5000, externalFunding: 600000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "Phase 1: roof 2025. Phase 2: walls and glazing 2026. Heating savings NPV factored in.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: heatPump.id,
        startYear: 2026, endYear: 2046, executionPct: 100, startQuarter: 2,
        capex: 3800000, opex: 95000, externalFunding: 760000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 120, personnelRatePerDay: 750,
        notes: "IETF grant (20% of capex) assumed. Feasibility study complete.",
      },
      // Manchester
      {
        scenarioId: scenarioAmbitious.id, interventionId: manchFleet.id,
        startYear: 2026, endYear: 2036, executionPct: 100, implementationPacePctPerYear: 25,
        capex: 1200000, opex: 32000, externalFunding: 220000, financialLifetime: 7, technicalAssetLife: 10,
        personnelTimeDays: 30, personnelRatePerDay: 600,
        notes: "LEVI grant application submitted. Charging infrastructure funded separately.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: manchBMS.id,
        startYear: 2025, endYear: 2037, executionPct: 100,
        capex: 95000, opex: 4000, externalFunding: 320000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Energy savings NPV over 12yr exceeds installation cost.",
      },
      // Bristol
      {
        scenarioId: scenarioAmbitious.id, interventionId: bristolHP.id,
        startYear: 2027, endYear: 2047, executionPct: 100,
        capex: 680000, opex: 18000, financialLifetime: 20, technicalAssetLife: 20,
        notes: "Feasibility completed 2024. Planning permission submitted Q1 2025.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: bristolSolar.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 150000, opex: 4000, financialLifetime: 25, technicalAssetLife: 25,
      },
      // Chicago
      {
        scenarioId: scenarioAmbitious.id, interventionId: chicagoSolar.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 280000, opex: 9000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "ITC 30% tax credit reduces net capex to $196k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: chicagoCA.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 95000, opex: 5000, externalFunding: 360000, financialLifetime: 8, technicalAssetLife: 15,
        notes: "DOE BestPractices assessment identified $40k annual savings.",
      },
      // Houston
      {
        scenarioId: scenarioAmbitious.id, interventionId: houstonLED.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 165000, opex: 3500, externalFunding: 520000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "CenterPoint Energy rebate $15k. Savings NPV over 10yr factored in.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: houstonBMS.id,
        startYear: 2026, endYear: 2038, executionPct: 100,
        capex: 110000, opex: 5000, financialLifetime: 12, technicalAssetLife: 12,
      },
      // Los Angeles
      {
        scenarioId: scenarioAmbitious.id, interventionId: laFleet.id,
        startYear: 2025, endYear: 2035, executionPct: 100, implementationPacePctPerYear: 33,
        capex: 850000, opex: 24000, externalFunding: 150000, financialLifetime: 7, technicalAssetLife: 10,
        notes: "CARB HVIP incentive applied. Charging infra via Electrify America partner programme.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: laSolar.id,
        startYear: 2025, endYear: 2050, executionPct: 100,
        capex: 200000, opex: 6000, financialLifetime: 25, technicalAssetLife: 25,
      },
      // Seattle
      {
        scenarioId: scenarioAmbitious.id, interventionId: seattleHP.id,
        startYear: 2026, endYear: 2046, executionPct: 100,
        capex: 420000, opex: 12000, financialLifetime: 20, technicalAssetLife: 20,
        notes: "Puget Sound Energy electrification rebate $30k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: seattleIns.id,
        startYear: 2027, endYear: 2057, executionPct: 100,
        capex: 210000, opex: 3500, externalFunding: 380000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "Works sequenced after heat pump to maximise synergy. Heating savings NPV factored in.",
      },
      // Atlanta
      {
        scenarioId: scenarioAmbitious.id, interventionId: atlantaSolar.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 230000, opex: 7500, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Georgia Power commercial solar rebate $20k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: atlantaLED.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 98000, opex: 2500, externalFunding: 310000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Savings NPV over 10yr factored in. Simple payback 2.8 years.",
      },
      // Denver
      {
        scenarioId: scenarioAmbitious.id, interventionId: denverSolar.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 155000, opex: 5000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Colorado C-PACE financing available — zero-down installation.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: denverFleet.id,
        startYear: 2025, endYear: 2035, executionPct: 100, implementationPacePctPerYear: 50,
        capex: 380000, opex: 11000, externalFunding: 60000, financialLifetime: 8, technicalAssetLife: 10,
        notes: "CVRP $4,500 per vehicle × 10 vehicles assumed.",
      },
      // Toronto
      {
        scenarioId: scenarioAmbitious.id, interventionId: torontoFleet.id,
        startYear: 2026, endYear: 2036, executionPct: 100, implementationPacePctPerYear: 25,
        capex: 1100000, opex: 28000, externalFunding: 180000, financialLifetime: 7, technicalAssetLife: 10,
        notes: "iZEV incentive CAD 5,000 per vehicle × 18 vehicles = CAD 90k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: torontoIns.id,
        startYear: 2025, endYear: 2055, executionPct: 100,
        capex: 280000, opex: 4000, externalFunding: 520000, financialLifetime: 30, technicalAssetLife: 30,
        notes: "Canada Greener Homes Grant applicable. Natural gas savings NPV factored in.",
      },
      // Vancouver
      {
        scenarioId: scenarioAmbitious.id, interventionId: vanHP.id,
        startYear: 2025, endYear: 2045, executionPct: 100,
        capex: 450000, opex: 13000, financialLifetime: 20, technicalAssetLife: 20,
        notes: "BC Hydro CleanBC incentive 25% of capex = $112k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: vanPPA.id,
        startYear: 2025, endYear: 2035, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Virtual PPA at spot price parity. No balance sheet impact.",
      },
      // Calgary
      {
        scenarioId: scenarioAmbitious.id, interventionId: calgarySolar.id,
        startYear: 2027, endYear: 2052, executionPct: 100,
        capex: 115000, opex: 3500, financialLifetime: 25, technicalAssetLife: 25,
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: calgaryLED.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 72000, opex: 2000, externalFunding: 225000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "ATCO Energy savings rebate. Savings NPV over 10yr factored in.",
      },
      // Warsaw
      {
        scenarioId: scenarioAmbitious.id, interventionId: warsawIns.id,
        startYear: 2025, endYear: 2055, executionPct: 100,
        capex: 310000, opex: 5500, externalFunding: 650000, financialLifetime: 30, technicalAssetLife: 30,
        notes: "EU Cohesion Fund grant. High Polish grid factor makes insulation ROI very strong.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: warsawLED.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 185000, opex: 4500, externalFunding: 680000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "High Polish grid intensity (0.773 kgCO2e/kWh) gives exceptional tCO2e savings.",
      },
      // Company-wide
      {
        scenarioId: scenarioAmbitious.id, interventionId: ppa.id,
        startYear: 2025, endYear: 2035, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Sleeved PPA signed. Premium vs market rate £3.50/MWh.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: supplyChain.id,
        startYear: 2026, endYear: 2050, executionPct: 90,
        capex: 0, opex: 120000, financialLifetime: 7, technicalAssetLife: null,
        personnelTimeDays: 180, personnelRatePerDay: 600,
        notes: "Internal sustainability team + external consultant for supplier engagement.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: ukEV.id,
        startYear: 2026, endYear: 2038, executionPct: 100,
        capex: 380000, opex: 15000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Workplace Charging Scheme grant £350 per socket × 60 sockets = £21k.",
      },
    ],
  });

  // ── Conservative ScenarioInterventions ────────────────────────────────────
  await db.scenarioIntervention.createMany({
    data: [
      // Sheffield Works (committed/in-progress — same dates)
      {
        scenarioId: scenarioConservative.id, interventionId: solar.id,
        startYear: 2024, endYear: 2049, executionPct: 100,
        capex: 0, opex: 18000, financialLifetime: 20, technicalAssetLife: 25,
        notes: "Already committed — PPA in place.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: led.id,
        startYear: 2023, endYear: 2038, executionPct: 100,
        capex: 285000, opex: 5000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Already completed — included for reporting.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: compAir.id,
        startYear: 2024, endYear: 2039, executionPct: 100,
        capex: 128000, opex: 8000, financialLifetime: 8, technicalAssetLife: 15,
        notes: "Already in progress — included as committed.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: insulation.id,
        startYear: 2026, endYear: 2056, executionPct: 95,
        capex: 420000, opex: 5000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "Deferred 1 year to align with contractor availability.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: heatPump.id,
        startYear: 2030, endYear: 2050, executionPct: 85,
        capex: 3800000, opex: 95000, financialLifetime: 20, technicalAssetLife: 20,
        notes: "Deferred to align with boiler end-of-life 2030. No grant funding assumed.",
      },
      // Manchester
      {
        scenarioId: scenarioConservative.id, interventionId: manchFleet.id,
        startYear: 2029, endYear: 2039, executionPct: 75, implementationPacePctPerYear: 20,
        capex: 1200000, opex: 32000, financialLifetime: 7, technicalAssetLife: 10,
        notes: "Deferred pending EV HGV market maturity and charging infrastructure readiness.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: manchBMS.id,
        startYear: 2027, endYear: 2039, executionPct: 90,
        capex: 95000, opex: 4000, financialLifetime: 12, technicalAssetLife: 12,
      },
      // Bristol
      {
        scenarioId: scenarioConservative.id, interventionId: bristolHP.id,
        startYear: 2030, endYear: 2050, executionPct: 85,
        capex: 680000, opex: 18000, financialLifetime: 20, technicalAssetLife: 20,
        notes: "Deferred to coincide with boiler replacement cycle.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: bristolSolar.id,
        startYear: 2028, endYear: 2053, executionPct: 100,
        capex: 150000, opex: 4000, financialLifetime: 25, technicalAssetLife: 25,
      },
      // Chicago
      {
        scenarioId: scenarioConservative.id, interventionId: chicagoSolar.id,
        startYear: 2028, endYear: 2053, executionPct: 100,
        capex: 280000, opex: 9000, financialLifetime: 25, technicalAssetLife: 25,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: chicagoCA.id,
        startYear: 2027, endYear: 2042, executionPct: 90,
        capex: 95000, opex: 5000, financialLifetime: 8, technicalAssetLife: 15,
      },
      // Houston
      {
        scenarioId: scenarioConservative.id, interventionId: houstonLED.id,
        startYear: 2027, endYear: 2042, executionPct: 90,
        capex: 165000, opex: 3500, financialLifetime: 10, technicalAssetLife: 15,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: houstonBMS.id,
        startYear: 2028, endYear: 2040, executionPct: 85,
        capex: 110000, opex: 5000, financialLifetime: 12, technicalAssetLife: 12,
      },
      // Los Angeles
      {
        scenarioId: scenarioConservative.id, interventionId: laFleet.id,
        startYear: 2028, endYear: 2038, executionPct: 75, implementationPacePctPerYear: 25,
        capex: 850000, opex: 24000, financialLifetime: 7, technicalAssetLife: 10,
        notes: "Deferred — awaiting longer-range EV options for LA–Phoenix route.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: laSolar.id,
        startYear: 2027, endYear: 2052, executionPct: 100,
        capex: 200000, opex: 6000, financialLifetime: 25, technicalAssetLife: 25,
      },
      // Seattle
      {
        scenarioId: scenarioConservative.id, interventionId: seattleHP.id,
        startYear: 2029, endYear: 2049, executionPct: 85,
        capex: 420000, opex: 12000, financialLifetime: 20, technicalAssetLife: 20,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: seattleIns.id,
        startYear: 2029, endYear: 2059, executionPct: 90,
        capex: 210000, opex: 3500, financialLifetime: 25, technicalAssetLife: 30,
      },
      // Atlanta
      {
        scenarioId: scenarioConservative.id, interventionId: atlantaSolar.id,
        startYear: 2028, endYear: 2053, executionPct: 100,
        capex: 230000, opex: 7500, financialLifetime: 25, technicalAssetLife: 25,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: atlantaLED.id,
        startYear: 2027, endYear: 2042, executionPct: 90,
        capex: 98000, opex: 2500, financialLifetime: 10, technicalAssetLife: 15,
      },
      // Denver
      {
        scenarioId: scenarioConservative.id, interventionId: denverSolar.id,
        startYear: 2028, endYear: 2053, executionPct: 100,
        capex: 155000, opex: 5000, financialLifetime: 25, technicalAssetLife: 25,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: denverFleet.id,
        startYear: 2028, endYear: 2038, executionPct: 75, implementationPacePctPerYear: 40,
        capex: 380000, opex: 11000, financialLifetime: 8, technicalAssetLife: 10,
      },
      // Toronto
      {
        scenarioId: scenarioConservative.id, interventionId: torontoFleet.id,
        startYear: 2029, endYear: 2039, executionPct: 70, implementationPacePctPerYear: 20,
        capex: 1100000, opex: 28000, financialLifetime: 7, technicalAssetLife: 10,
        notes: "Deferred pending availability of Class 5 EV trucks in Canada.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: torontoIns.id,
        startYear: 2027, endYear: 2057, executionPct: 90,
        capex: 280000, opex: 4000, financialLifetime: 30, technicalAssetLife: 30,
      },
      // Vancouver
      {
        scenarioId: scenarioConservative.id, interventionId: vanHP.id,
        startYear: 2028, endYear: 2048, executionPct: 85,
        capex: 450000, opex: 13000, financialLifetime: 20, technicalAssetLife: 20,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: vanPPA.id,
        startYear: 2027, endYear: 2037, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred until existing electricity contracts expire.",
      },
      // Calgary
      {
        scenarioId: scenarioConservative.id, interventionId: calgarySolar.id,
        startYear: 2029, endYear: 2054, executionPct: 100,
        capex: 115000, opex: 3500, financialLifetime: 25, technicalAssetLife: 25,
      },
      {
        scenarioId: scenarioConservative.id, interventionId: calgaryLED.id,
        startYear: 2027, endYear: 2042, executionPct: 90,
        capex: 72000, opex: 2000, financialLifetime: 10, technicalAssetLife: 15,
      },
      // Warsaw
      {
        scenarioId: scenarioConservative.id, interventionId: warsawIns.id,
        startYear: 2027, endYear: 2057, executionPct: 90,
        capex: 310000, opex: 5500, financialLifetime: 30, technicalAssetLife: 30,
        notes: "Deferred pending EU grant confirmation.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: warsawLED.id,
        startYear: 2027, endYear: 2042, executionPct: 90,
        capex: 185000, opex: 4500, financialLifetime: 10, technicalAssetLife: 15,
      },
      // Company-wide
      {
        scenarioId: scenarioConservative.id, interventionId: ppa.id,
        startYear: 2027, endYear: 2037, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred until current electricity contract expires 2027.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: supplyChain.id,
        startYear: 2029, endYear: 2050, executionPct: 65,
        capex: 0, opex: 85000, financialLifetime: 7, technicalAssetLife: null,
        personnelTimeDays: 120, personnelRatePerDay: 600,
        notes: "Reduced execution reflecting supplier engagement challenges.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: ukEV.id,
        startYear: 2028, endYear: 2040, executionPct: 90,
        capex: 380000, opex: 15000, financialLifetime: 12, technicalAssetLife: 12,
      },
    ],
  });

  console.log(`✅  Scenarios: "${scenarioAmbitious.name}" + "${scenarioConservative.name}"`);
  console.log(`    64 ScenarioIntervention records (32 per scenario) with technicalAssetLife`);

  // ── Assets ────────────────────────────────────────────────────────────────
  await db.asset.createMany({
    data: [
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Gas-Fired Boiler System (2× 2MW)",
        assetType: "Industrial Boiler", category: "Heating",
        conditionRating: "RED",
        conditionNotes: "Primary heat exchanger showing corrosion. Efficiency dropped from 88% to 71% at last service (Oct 2024). Urgent replacement recommended.",
        installationYear: 2004, expectedUsefulLife: 20,
        currentEnergyKwh: 5200000, scope: 1,
        linkedInterventionId: heatPump.id, alertThresholdYears: 5, replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Compressed Air System (160 kW)",
        assetType: "Compressor", category: "Compressed Air",
        conditionRating: "AMBER",
        conditionNotes: "VSD retrofit completed on 3 of 4 compressors. Final Atlas Copco GA110 unit awaiting parts Q2 2025. Leak rate reduced from 28% to 14%.",
        installationYear: 2013, expectedUsefulLife: 15,
        currentEnergyKwh: 1080000, scope: 2,
        linkedInterventionId: compAir.id, alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Diesel HGV Fleet (14 vehicles)",
        assetType: "Heavy Goods Vehicles", category: "Transport",
        conditionRating: "AMBER",
        conditionNotes: "Mixed fleet: 6× Euro VI DAF XF (2019), 5× Euro VI Volvo FH (2020), 3× Ford Transit (2021). Two DAF units due for PSVAR compliance upgrade.",
        installationYear: 2019, expectedUsefulLife: 7,
        currentEnergyKwh: null, scope: 1,
        linkedInterventionId: manchFleet.id, alertThresholdYears: 3, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Injection Moulding Machines (×6 Arburg)",
        assetType: "Manufacturing Equipment", category: "Industrial Process",
        conditionRating: "GREEN",
        conditionNotes: "All 6 Arburg Allrounder 570S units operating within spec. Hydraulic seals replaced on units 3 and 5 in 2024.",
        installationYear: 2017, expectedUsefulLife: 15,
        currentEnergyKwh: 2180000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Cold Store Chiller Units (×3)",
        assetType: "Refrigeration", category: "HVAC",
        conditionRating: "RED",
        conditionNotes: "R22 refrigerant — phase-out mandated by F-Gas regulation. Unit 1 suffered compressor failure Nov 2024. Refill of R22 is no longer legal — replacement urgent.",
        installationYear: 2006, expectedUsefulLife: 15,
        currentEnergyKwh: 620000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id, siteId: bristol.id,
        name: "CNC Machining Centres (×3 Mazak)",
        assetType: "CNC Machine", category: "Industrial Process",
        conditionRating: "GREEN",
        conditionNotes: "Mazak Integrex i-400 units under extended warranty until 2027. On predictive maintenance programme.",
        installationYear: 2021, expectedUsefulLife: 15,
        currentEnergyKwh: 980000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Chicago CNC Line (×4 Haas)",
        assetType: "CNC Machine", category: "Industrial Process",
        conditionRating: "GREEN",
        installationYear: 2020, expectedUsefulLife: 15,
        currentEnergyKwh: 1600000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Chicago HVAC System",
        assetType: "HVAC", category: "Heating",
        conditionRating: "AMBER",
        installationYear: 2012, expectedUsefulLife: 20,
        currentEnergyKwh: 880000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "Toronto Assembly Robots (×8)",
        assetType: "Robotics", category: "Industrial Process",
        conditionRating: "GREEN",
        installationYear: 2022, expectedUsefulLife: 12,
        currentEnergyKwh: 1200000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: warsaw.id,
        name: "Warsaw Industrial Boiler",
        assetType: "Industrial Boiler", category: "Heating",
        conditionRating: "AMBER",
        installationYear: 2010, expectedUsefulLife: 20,
        currentEnergyKwh: 2400000, scope: 1,
        alertThresholdYears: 4, replacementPriority: "HIGH",
      },
    ],
  });
  console.log(`✅  Assets (10) created`);

  // ── Actual Emissions ──────────────────────────────────────────────────────
  await db.actualEmission.createMany({
    data: [
      { companyId: meridian.id, year: 2022, scope1: 6700, scope2: 3800, scope3: 7300, notes: "Baseline year — verified by EY (Limited Assurance)" },
      { companyId: meridian.id, year: 2023, scope1: 6450, scope2: 3620, scope3: 7180, notes: "LED upgrade complete mid-year. Natural gas reduction from insulation pilot." },
      { companyId: meridian.id, year: 2024, scope1: 6300, scope2: 3100, scope3: 7050, notes: "Solar PV at Sheffield online Q2. Compressed air optimisation delivering." },
    ],
  });
  console.log(`✅  Actual emissions: 2022, 2023, 2024`);

  // ── Energy Readings ───────────────────────────────────────────────────────
  const energyReadings = [];
  for (let month = 1; month <= 12; month++) {
    energyReadings.push(
      { companyId: meridian.id, siteId: sheffield.id, year: 2023, month, energyType: "ELECTRICITY", kWh: 185000 + Math.round(Math.random() * 20000), cost: 38000 + Math.round(Math.random() * 5000) },
      { companyId: meridian.id, siteId: sheffield.id, year: 2023, month, energyType: "GAS", kWh: 420000 + Math.round(Math.random() * 40000), cost: 14000 + Math.round(Math.random() * 2000) },
      { companyId: meridian.id, siteId: sheffield.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 160000 + Math.round(Math.random() * 20000), cost: 33000 + Math.round(Math.random() * 4000) },
      { companyId: meridian.id, siteId: sheffield.id, year: 2024, month, energyType: "GAS", kWh: 380000 + Math.round(Math.random() * 30000), cost: 13000 + Math.round(Math.random() * 1500) },
      { companyId: meridian.id, siteId: manchester.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 95000 + Math.round(Math.random() * 15000), cost: 19500 + Math.round(Math.random() * 3000) },
      { companyId: meridian.id, siteId: manchester.id, year: 2024, month, energyType: "DIESEL", kWh: 85000 + Math.round(Math.random() * 10000), cost: 12000 + Math.round(Math.random() * 2000) }
    );
  }
  await db.energyReading.createMany({ data: energyReadings });
  console.log(`✅  Energy readings: Sheffield (2023-2024) + Manchester (2024)`);

  // ──────────────────────────────────────────────────────────────────────────
  // COMPANY 2 — Apex Composites Ltd (second tenant for isolation testing)
  // ──────────────────────────────────────────────────────────────────────────
  const apex = await db.company.create({
    data: { name: "Apex Composites Ltd", slug: "apex-composites", plan: "FREE" },
  });
  const david = await db.user.create({
    data: { companyId: apex.id, name: "David Walsh", email: "david.walsh@apexcomposites.co.uk", password: pw, role: "ADMIN" },
  });
  const apexSite = await db.site.create({
    data: { companyId: apex.id, name: "Apex Composites — Coventry", address: "Middlemarch Business Park, Coventry, CV3 4FJ", region: "West Midlands", country: "United Kingdom", latitude: 52.3777, longitude: -1.4984 },
  });
  const apexBaseline = await db.baseline.create({
    data: {
      companyId: apex.id, year: 2023, growthRatePct: 0.8,
      entries: {
        create: [
          { scope: 1, category: "Natural Gas", emissionsTco2e: 1800 },
          { scope: 2, category: "Purchased Electricity", emissionsTco2e: 1200 },
          { scope: 3, category: "Purchased Goods & Services", emissionsTco2e: 2100 },
        ],
      },
    },
  });
  await db.target.create({
    data: { companyId: apex.id, label: "50% Absolute Reduction by 2040", scopeCombination: "1+2+3", targetYear: 2040, reductionPct: 50, isInterim: false, isSbtiAligned: false },
  });

  console.log(`\n✅  Company 2: ${apex.name}`);
  console.log(`    User: ${david.name} (Admin)`);
  console.log(`    Site: ${apexSite.name}`);
  console.log(`    Baseline: ${apexBaseline.year}, 5,100 tCO₂e`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Seed complete!

Login credentials (password: Password123!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meridian Forge Ltd (full data):
  Admin  → sarah.chen@meridianforge.co.uk
  Editor → james.whitmore@meridianforge.co.uk
  Viewer → priya.patel@meridianforge.co.uk

Apex Composites Ltd (second tenant):
  Admin  → david.walsh@apexcomposites.co.uk
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meridian Forge baseline: 17,800 tCO₂e (2022)
  Scope 1: 6,700 tCO₂e | Scope 2: 3,800 tCO₂e | Scope 3: 7,300 tCO₂e
Sites: 13 (Sheffield, Manchester, Bristol + 10 international)
Interventions: 32 (across all 13 sites + company-wide)
Scenarios: 2 (Ambitious 2040 / Conservative 2050)
  Each with 32 interventions; all ScenarioIntervention records have technicalAssetLife
  MACC chart: ~12 negative-MAC bars (LED, insulation, compressed air) + positive-MAC bars
Assets: 10 (2× RED, 4× AMBER, 4× GREEN)
Actual emissions: 2022–2024
Energy readings: Sheffield (2023-2024) + Manchester (2024)
Growth rates: 1.2% (2023-2030), 0.5% (2031-2040), 0% (2041-2050)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
