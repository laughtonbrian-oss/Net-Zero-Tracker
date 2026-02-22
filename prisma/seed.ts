/**
 * Seed script — Meridian Forge Ltd (primary) + Apex Composites Ltd (second tenant)
 *
 * Run with:  npx tsx prisma/seed.ts
 *
 * Data represents a mid-sized manufacturing company targeting net zero by 2050.
 * Total baseline: ~17,800 tCO₂e (Scope 1: 6,700 | Scope 2: 3,800 | Scope 3: 7,300)
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database…\n");

  // ── Wipe existing data (order respects FK constraints) ──────────────────
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

  // ────────────────────────────────────────────────────────────────────────
  // COMPANY 1 — Meridian Forge Ltd
  // ────────────────────────────────────────────────────────────────────────
  const meridian = await db.company.create({
    data: { name: "Meridian Forge Ltd", slug: "meridian-forge", plan: "PAID" },
  });
  console.log(`✅  Company: ${meridian.name}`);

  // ── Users ────────────────────────────────────────────────────────────────
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
      longitude: -2.3010,
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

  // 10 new international sites
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
      latitude: 47.5480,
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
      latitude: 33.7490,
      longitude: -84.3880,
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

  // ── Business Units ────────────────────────────────────────────────────────
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

  // ── Baseline (base year 2022, 17,800 tCO₂e total, 1.2% BAU growth) ──────
  const baseline = await db.baseline.create({
    data: {
      companyId: meridian.id,
      year: 2022,
      growthRatePct: 1.2,
      entries: {
        create: [
          // Scope 1 — 6,700 tCO₂e
          { scope: 1, category: "Natural Gas Combustion",        emissionsTco2e: 4200 },
          { scope: 1, category: "Diesel Fleet & Plant",          emissionsTco2e: 1850 },
          { scope: 1, category: "Fugitive Emissions (Refrigerants)", emissionsTco2e: 650 },
          // Scope 2 — 3,800 tCO₂e
          { scope: 2, category: "Purchased Electricity",         emissionsTco2e: 3800 },
          // Scope 3 — 7,300 tCO₂e
          { scope: 3, category: "Purchased Goods & Services",    emissionsTco2e: 4200 },
          { scope: 3, category: "Employee Commuting",            emissionsTco2e: 580 },
          { scope: 3, category: "Business Travel",               emissionsTco2e: 320 },
          { scope: 3, category: "Upstream Transport & Distribution", emissionsTco2e: 1100 },
          { scope: 3, category: "Downstream Transport",          emissionsTco2e: 820 },
          { scope: 3, category: "Waste Generated in Operations", emissionsTco2e: 280 },
        ],
      },
    },
  });

  // ── Growth Rates for Baseline ──────────────────────────────────────────────
  await db.growthRate.createMany({
    data: [
      { baselineId: baseline.id, fromYear: 2023, toYear: 2030, ratePct: 1.2 },
      { baselineId: baseline.id, fromYear: 2031, toYear: 2040, ratePct: 0.5 },
      { baselineId: baseline.id, fromYear: 2041, toYear: 2050, ratePct: 0.0 },
    ],
  });

  console.log(`✅  Baseline: 2022, 17,800 tCO₂e (S1: 6,700 | S2: 3,800 | S3: 7,300) + growth rates`);

  // ── Targets ───────────────────────────────────────────────────────────────
  await db.target.create({
    data: {
      companyId: meridian.id,
      label: "SBTi Near-Term — 50% Scope 1+2 by 2030",
      scopeCombination: "1+2",
      targetYear: 2030,
      reductionPct: 50,
      isInterim: true,
      isSbtiAligned: true,
    },
  });

  await db.target.create({
    data: {
      companyId: meridian.id,
      label: "Net Zero — 90% Scope 1+2+3 by 2050",
      scopeCombination: "1+2+3",
      targetYear: 2050,
      reductionPct: 90,
      isInterim: false,
      isSbtiAligned: true,
    },
  });
  console.log(`✅  Targets: SBTi near-term (2030) + Net Zero (2050)`);

  // ── Interventions ─────────────────────────────────────────────────────────
  // 1. Rooftop Solar PV
  const solar = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Rooftop Solar PV — Sheffield Works",
      description:
        "1.2 MWp rooftop solar installation across the main manufacturing building and warehouse roof. Funded through a 20-year PPA with zero upfront capex.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 6400,
      implementationStartYear: 2024,
      fullBenefitYear: 2025,
      status: "IN_PROGRESS",
      owner: "James Whitmore",
    },
  });

  // Annual reductions through 2050
  const solarReductions = [];
  for (let y = 2024; y <= 2050; y++) {
    solarReductions.push({ interventionId: solar.id, year: y, tco2eReduction: y === 2024 ? 320 : 320 });
  }
  await db.interventionAnnualReduction.createMany({ data: solarReductions });

  // 2. LED Lighting
  const led = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "LED Lighting Upgrade — All Sites",
      description:
        "Replacement of all fluorescent and HID lighting with LED across Sheffield, Manchester, and Bristol facilities. Payback period ~3 years.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 2200,
      implementationStartYear: 2023,
      fullBenefitYear: 2024,
      status: "COMPLETED",
      owner: "Sarah Chen",
    },
  });

  const ledReductions = [];
  for (let y = 2023; y <= 2050; y++) {
    ledReductions.push({ interventionId: led.id, year: y, tco2eReduction: y === 2023 ? 110 : 220 });
  }
  await db.interventionAnnualReduction.createMany({ data: ledReductions });

  // 3. Fleet Electrification
  const fleet = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: manchester.id,
      businessUnitId: buLogistics.id,
      name: "Fleet Electrification — Logistics",
      description:
        "Phased replacement of 14 diesel HGVs and vans with electric equivalents. Charging infrastructure at Manchester DC and Sheffield. £2.1m capex over 5 years.",
      category: "Transport & Mobility",
      scopesAffected: "[1]",
      totalReductionTco2e: 9250,
      implementationStartYear: 2025,
      fullBenefitYear: 2030,
      status: "PLANNED",
      owner: "Priya Patel",
    },
  });

  const fleetReductions = [
    { year: 2025, tco2eReduction: 370 },
    { year: 2026, tco2eReduction: 740 },
    { year: 2027, tco2eReduction: 1110 },
    { year: 2028, tco2eReduction: 1480 },
    { year: 2029, tco2eReduction: 1850 },
  ];
  for (let y = 2030; y <= 2050; y++) {
    fleetReductions.push({ year: y, tco2eReduction: 1850 });
  }
  await db.interventionAnnualReduction.createMany({
    data: fleetReductions.map((r) => ({ interventionId: fleet.id, ...r })),
  });

  // 4. Industrial Heat Pump
  const heatPump = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Industrial Heat Pump — Sheffield Works",
      description:
        "High-temperature industrial heat pump to replace the gas-fired boiler system providing process heat to forge and annealing lines. Requires 2024 feasibility study and IETF grant application.",
      category: "Process Decarbonisation",
      scopesAffected: "[1]",
      totalReductionTco2e: 16800,
      implementationStartYear: 2026,
      fullBenefitYear: 2028,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });

  const hpReductions = [
    { year: 2026, tco2eReduction: 1400 },
    { year: 2027, tco2eReduction: 2800 },
  ];
  for (let y = 2028; y <= 2050; y++) {
    hpReductions.push({ year: y, tco2eReduction: 4200 });
  }
  await db.interventionAnnualReduction.createMany({
    data: hpReductions.map((r) => ({ interventionId: heatPump.id, ...r })),
  });

  // 5. Power Purchase Agreement (PPA)
  const ppa = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "Corporate Renewable PPA",
      description:
        "10-year sleeved power purchase agreement with Vattenfall for 5 GWh/yr of certified UK offshore wind electricity. Eliminates remaining market-based Scope 2 emissions.",
      category: "Renewable Energy",
      scopesAffected: "[2]",
      totalReductionTco2e: 15200,
      implementationStartYear: 2025,
      fullBenefitYear: 2026,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });

  const ppaReductions = [{ year: 2025, tco2eReduction: 950 }];
  for (let y = 2026; y <= 2050; y++) {
    ppaReductions.push({ year: y, tco2eReduction: 1900 });
  }
  await db.interventionAnnualReduction.createMany({
    data: ppaReductions.map((r) => ({ interventionId: ppa.id, ...r })),
  });

  // 6. Compressed Air Optimisation
  const compAir = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Compressed Air Optimisation",
      description:
        "Variable speed drives on compressors, leak detection survey, and pressure optimisation. Quick-win project with 18-month payback.",
      category: "Energy Efficiency",
      scopesAffected: "[2]",
      totalReductionTco2e: 1050,
      implementationStartYear: 2024,
      fullBenefitYear: 2025,
      status: "IN_PROGRESS",
      owner: "James Whitmore",
    },
  });

  const caReductions = [{ year: 2024, tco2eReduction: 75 }];
  for (let y = 2025; y <= 2050; y++) {
    caReductions.push({ year: y, tco2eReduction: 150 });
  }
  await db.interventionAnnualReduction.createMany({ data: caReductions.map((r) => ({ interventionId: compAir.id, ...r })) });

  // 7. Supply Chain Scope 3 Programme
  const supplyChain = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: null,
      businessUnitId: buCorporate.id,
      name: "Supply Chain Decarbonisation Programme",
      description:
        "Engagement with top-20 suppliers (representing 70% of Scope 3 Category 1). Includes supplier scorecards, joint reduction targets, and annual reporting requirements. Target: 30% reduction in supply chain emissions by 2030.",
      category: "Supply Chain",
      scopesAffected: "[3]",
      totalReductionTco2e: 12600,
      implementationStartYear: 2026,
      fullBenefitYear: 2030,
      status: "PLANNED",
      owner: "Sarah Chen",
    },
  });

  const scReductions = [
    { year: 2026, tco2eReduction: 630 },
    { year: 2027, tco2eReduction: 1260 },
    { year: 2028, tco2eReduction: 2100 },
    { year: 2029, tco2eReduction: 2940 },
  ];
  for (let y = 2030; y <= 2050; y++) {
    scReductions.push({ year: y, tco2eReduction: 3150 });
  }
  await db.interventionAnnualReduction.createMany({
    data: scReductions.map((r) => ({ interventionId: supplyChain.id, ...r })),
  });

  // 8. Building Fabric Insulation
  const insulation = await db.intervention.create({
    data: {
      companyId: meridian.id,
      siteId: sheffield.id,
      businessUnitId: buManufacturing.id,
      name: "Building Fabric Insulation — Sheffield Works",
      description:
        "Roof insulation top-up (300mm mineral wool), cavity wall insulation on the office block, and replacement of single-glazed roof lights with triple-skin polycarbonate panels.",
      category: "Energy Efficiency",
      scopesAffected: "[1,2]",
      totalReductionTco2e: 3200,
      implementationStartYear: 2025,
      fullBenefitYear: 2027,
      status: "PLANNED",
      owner: "James Whitmore",
    },
  });

  const insReductions = [
    { year: 2025, tco2eReduction: 320 },
    { year: 2026, tco2eReduction: 480 },
  ];
  for (let y = 2027; y <= 2050; y++) {
    insReductions.push({ year: y, tco2eReduction: 640 });
  }
  await db.interventionAnnualReduction.createMany({
    data: insReductions.map((r) => ({ interventionId: insulation.id, ...r })),
  });

  console.log(`✅  Interventions (8) + annual reductions through 2050`);

  // ── Scenarios ─────────────────────────────────────────────────────────────

  // Scenario 1: Ambitious — Net Zero by 2040
  const scenarioAmbitious = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Ambitious — Net Zero by 2040",
      description:
        "All major capital projects front-loaded. Higher capex 2025–2030 targets Scope 1+2 elimination by 2035, with supply chain programme delivering net zero by 2040. Assumes IETF grant funding for heat pump and 100% EV fleet by 2029.",
    },
  });

  await db.scenarioIntervention.createMany({
    data: [
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: solar.id,
        startYear: 2024,
        endYear: 2044,
        executionPct: 100,
        capex: 0,
        opex: 18000,
        financialLifetime: 20,
        notes: "PPA structure — no upfront capex. O&M included in opex.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: led.id,
        startYear: 2023,
        endYear: 2050,
        executionPct: 100,
        capex: 285000,
        opex: 5000,
        externalFunding: 900000, // energy savings NPV over 10yr
        financialLifetime: 10,
        notes: "ESOS audit identified LED as highest-ROI quick win. Savings NPV factored in.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: fleet.id,
        startYear: 2025,
        endYear: 2050,
        executionPct: 100,
        implementationPacePctPerYear: 20,
        capex: 2100000,
        opex: 45000,
        externalFunding: 350000,
        financialLifetime: 7,
        personnelTimeDays: 45,
        personnelRatePerDay: 650,
        notes: "LEVI grant application submitted. Charging infrastructure funded separately via OpEx.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: heatPump.id,
        startYear: 2026,
        endYear: 2050,
        startQuarter: 2,
        executionPct: 100,
        capex: 3800000,
        opex: 95000,
        externalFunding: 760000,
        financialLifetime: 20,
        personnelTimeDays: 120,
        personnelRatePerDay: 750,
        notes: "IETF grant (Industrial Energy Transformation Fund) — 20% of capex. Feasibility complete.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: ppa.id,
        startYear: 2025,
        endYear: 2050,
        executionPct: 100,
        capex: 0,
        opex: 0,
        financialLifetime: 10,
        notes: "Sleeved PPA signed with Vattenfall. Premium vs market rate is £3.50/MWh.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: compAir.id,
        startYear: 2024,
        endYear: 2050,
        executionPct: 100,
        capex: 128000,
        opex: 8000,
        externalFunding: 480000, // energy savings NPV over 8yr
        financialLifetime: 8,
        notes: "VSD installation complete on 3 of 4 compressors. Final unit Q2 2025. Savings NPV factored in.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: supplyChain.id,
        startYear: 2026,
        endYear: 2050,
        executionPct: 90,
        capex: 0,
        opex: 120000,
        financialLifetime: 7,
        personnelTimeDays: 180,
        personnelRatePerDay: 600,
        notes: "Internal sustainability team resource + external consultant for supplier engagement.",
      },
      {
        scenarioId: scenarioAmbitious.id,
        interventionId: insulation.id,
        startYear: 2025,
        endYear: 2050,
        executionPct: 100,
        capex: 420000,
        opex: 5000,
        externalFunding: 600000, // heating savings NPV
        financialLifetime: 25,
        notes: "Phase 1: roof insulation 2025. Phase 2: glazing and walls 2026. Heating savings NPV factored in.",
      },
    ],
  });

  // Scenario 2: Conservative — Net Zero by 2050
  const scenarioConservative = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Conservative — Net Zero by 2050",
      description:
        "Phased approach to manage technology risk and capital constraints. Heat pump and fleet electrification deferred by 3–4 years. Supply chain programme at 65% execution reflecting supplier engagement risk. Consistent with board-approved capex envelope.",
    },
  });

  await db.scenarioIntervention.createMany({
    data: [
      {
        scenarioId: scenarioConservative.id,
        interventionId: solar.id,
        startYear: 2024,
        endYear: 2044,
        executionPct: 100,
        capex: 0,
        opex: 18000,
        financialLifetime: 20,
        notes: "Same as Ambitious — already committed.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: led.id,
        startYear: 2023,
        endYear: 2050,
        executionPct: 100,
        capex: 285000,
        opex: 5000,
        financialLifetime: 10,
        notes: "Already completed — included for reporting.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: fleet.id,
        startYear: 2028,
        endYear: 2050,
        executionPct: 80,
        implementationPacePctPerYear: 15,
        capex: 2100000,
        opex: 45000,
        financialLifetime: 7,
        notes: "Deferred to 2028 pending EV HGV market maturity and battery range improvements.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: heatPump.id,
        startYear: 2030,
        endYear: 2050,
        executionPct: 85,
        capex: 3800000,
        opex: 95000,
        financialLifetime: 20,
        notes: "Deferred to align with boiler end-of-life in 2030. No grant funding assumed.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: ppa.id,
        startYear: 2027,
        endYear: 2050,
        executionPct: 100,
        capex: 0,
        opex: 0,
        financialLifetime: 10,
        notes: "PPA deferred until current electricity contract expires in 2027.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: compAir.id,
        startYear: 2024,
        endYear: 2050,
        executionPct: 100,
        capex: 128000,
        opex: 8000,
        financialLifetime: 8,
        notes: "Already in progress — included as committed.",
      },
      {
        scenarioId: scenarioConservative.id,
        interventionId: supplyChain.id,
        startYear: 2028,
        endYear: 2050,
        executionPct: 65,
        capex: 0,
        opex: 85000,
        financialLifetime: 7,
        personnelTimeDays: 120,
        personnelRatePerDay: 600,
        notes: "Reduced execution reflecting supplier engagement challenges in Scope 3 Category 1.",
      },
    ],
  });

  console.log(`✅  Scenarios: "${scenarioAmbitious.name}" + "${scenarioConservative.name}"`);

  // ── Assets ────────────────────────────────────────────────────────────────

  await db.asset.createMany({
    data: [
      {
        companyId: meridian.id,
        siteId: sheffield.id,
        name: "Gas-Fired Boiler System (2× 2MW)",
        assetType: "Industrial Boiler",
        category: "Heating",
        conditionRating: "RED",
        conditionNotes:
          "Primary heat exchanger showing corrosion. Efficiency dropped from 88% to 71% at last service (Oct 2024). Recommended for urgent replacement.",
        installationYear: 2004,
        expectedUsefulLife: 20,
        currentEnergyKwh: 5200000,
        scope: 1,
        linkedInterventionId: heatPump.id,
        alertThresholdYears: 5,
        replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id,
        siteId: sheffield.id,
        name: "Compressed Air System (160 kW)",
        assetType: "Compressor",
        category: "Compressed Air",
        conditionRating: "AMBER",
        conditionNotes:
          "VSD retrofit completed on 3 of 4 compressors. Final Atlas Copco GA110 unit awaiting parts Q2 2025. Leak rate reduced from 28% to 14%.",
        installationYear: 2013,
        expectedUsefulLife: 15,
        currentEnergyKwh: 1080000,
        scope: 2,
        linkedInterventionId: compAir.id,
        alertThresholdYears: 3,
        replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id,
        siteId: manchester.id,
        name: "Diesel HGV Fleet (14 vehicles)",
        assetType: "Heavy Goods Vehicles",
        category: "Transport",
        conditionRating: "AMBER",
        conditionNotes:
          "Mixed fleet: 6× Euro VI DAF XF (2019), 5× Euro VI Volvo FH (2020), 3× Ford Transit (2021). All within MOT. Two DAF units due for PSVAR compliance upgrade.",
        installationYear: 2019,
        expectedUsefulLife: 7,
        currentEnergyKwh: null,
        scope: 1,
        linkedInterventionId: fleet.id,
        alertThresholdYears: 3,
        replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id,
        siteId: sheffield.id,
        name: "Injection Moulding Machines (×6 Arburg)",
        assetType: "Manufacturing Equipment",
        category: "Industrial Process",
        conditionRating: "GREEN",
        conditionNotes:
          "All 6 Arburg Allrounder 570S units operating within spec. Last preventive maintenance completed August 2024. Hydraulic seals replaced on units 3 and 5.",
        installationYear: 2017,
        expectedUsefulLife: 15,
        currentEnergyKwh: 2180000,
        scope: 2,
        linkedInterventionId: null,
        alertThresholdYears: 3,
        replacementPriority: "LOW",
      },
      {
        companyId: meridian.id,
        siteId: manchester.id,
        name: "Cold Store Chiller Units (×3)",
        assetType: "Refrigeration",
        category: "HVAC",
        conditionRating: "RED",
        conditionNotes:
          "R22 refrigerant — phase-out mandated by F-Gas regulation. Unit 1 suffered a compressor failure in Nov 2024; temporary hire unit in place. Refill of R22 is no longer legal — replacement is urgent.",
        installationYear: 2006,
        expectedUsefulLife: 15,
        currentEnergyKwh: 620000,
        scope: 2,
        linkedInterventionId: null,
        alertThresholdYears: 5,
        replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id,
        siteId: bristol.id,
        name: "CNC Machining Centres (×3 Mazak)",
        assetType: "CNC Machine",
        category: "Industrial Process",
        conditionRating: "GREEN",
        conditionNotes:
          "Mazak Integrex i-400 units installed as part of Bristol expansion. Servo drives under extended warranty until 2027. On predictive maintenance programme.",
        installationYear: 2021,
        expectedUsefulLife: 15,
        currentEnergyKwh: 980000,
        scope: 2,
        linkedInterventionId: null,
        alertThresholdYears: 3,
        replacementPriority: "LOW",
      },
      // Assets for new sites
      {
        companyId: meridian.id,
        siteId: chicago.id,
        name: "Chicago CNC Line (×4 Haas)",
        assetType: "CNC Machine",
        category: "Industrial Process",
        conditionRating: "GREEN",
        installationYear: 2020,
        expectedUsefulLife: 15,
        currentEnergyKwh: 1600000,
        scope: 2,
        alertThresholdYears: 3,
        replacementPriority: "LOW",
      },
      {
        companyId: meridian.id,
        siteId: chicago.id,
        name: "Chicago HVAC System",
        assetType: "HVAC",
        category: "Heating",
        conditionRating: "AMBER",
        installationYear: 2012,
        expectedUsefulLife: 20,
        currentEnergyKwh: 880000,
        scope: 1,
        alertThresholdYears: 3,
        replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id,
        siteId: toronto.id,
        name: "Toronto Assembly Robots (×8)",
        assetType: "Robotics",
        category: "Industrial Process",
        conditionRating: "GREEN",
        installationYear: 2022,
        expectedUsefulLife: 12,
        currentEnergyKwh: 1200000,
        scope: 2,
        alertThresholdYears: 3,
        replacementPriority: "LOW",
      },
      {
        companyId: meridian.id,
        siteId: warsaw.id,
        name: "Warsaw Industrial Boiler",
        assetType: "Industrial Boiler",
        category: "Heating",
        conditionRating: "AMBER",
        installationYear: 2010,
        expectedUsefulLife: 20,
        currentEnergyKwh: 2400000,
        scope: 1,
        alertThresholdYears: 4,
        replacementPriority: "HIGH",
      },
    ],
  });

  console.log(`✅  Assets (10) created`);

  // ── Actual Emissions ───────────────────────────────────────────────────────
  await db.actualEmission.createMany({
    data: [
      {
        companyId: meridian.id,
        year: 2022,
        scope1: 6700,
        scope2: 3800,
        scope3: 7300,
        notes: "Baseline year — verified by EY (Limited Assurance)",
      },
      {
        companyId: meridian.id,
        year: 2023,
        scope1: 6450,
        scope2: 3620,
        scope3: 7180,
        notes: "LED upgrade complete mid-year. Natural gas reduction from insulation pilot.",
      },
      {
        companyId: meridian.id,
        year: 2024,
        scope1: 6300,
        scope2: 3100,
        scope3: 7050,
        notes: "Solar PV at Sheffield online Q2. Compressed air optimisation delivering.",
      },
    ],
  });

  console.log(`✅  Actual emissions: 2022, 2023, 2024`);

  // ── Energy Readings ───────────────────────────────────────────────────────
  const energyReadings = [];

  // Sheffield 2023 and 2024
  for (let month = 1; month <= 12; month++) {
    energyReadings.push({
      companyId: meridian.id,
      siteId: sheffield.id,
      year: 2023,
      month,
      energyType: "ELECTRICITY",
      kWh: 185000 + Math.round(Math.random() * 20000),
      cost: 38000 + Math.round(Math.random() * 5000),
    });
    energyReadings.push({
      companyId: meridian.id,
      siteId: sheffield.id,
      year: 2023,
      month,
      energyType: "GAS",
      kWh: 420000 + Math.round(Math.random() * 40000),
      cost: 14000 + Math.round(Math.random() * 2000),
    });
    energyReadings.push({
      companyId: meridian.id,
      siteId: sheffield.id,
      year: 2024,
      month,
      energyType: "ELECTRICITY",
      kWh: 160000 + Math.round(Math.random() * 20000), // reduced from solar
      cost: 33000 + Math.round(Math.random() * 4000),
    });
    energyReadings.push({
      companyId: meridian.id,
      siteId: sheffield.id,
      year: 2024,
      month,
      energyType: "GAS",
      kWh: 380000 + Math.round(Math.random() * 30000),
      cost: 13000 + Math.round(Math.random() * 1500),
    });
  }

  // Manchester 2024
  for (let month = 1; month <= 12; month++) {
    energyReadings.push({
      companyId: meridian.id,
      siteId: manchester.id,
      year: 2024,
      month,
      energyType: "ELECTRICITY",
      kWh: 95000 + Math.round(Math.random() * 15000),
      cost: 19500 + Math.round(Math.random() * 3000),
    });
    energyReadings.push({
      companyId: meridian.id,
      siteId: manchester.id,
      year: 2024,
      month,
      energyType: "DIESEL",
      kWh: 85000 + Math.round(Math.random() * 10000),
      cost: 12000 + Math.round(Math.random() * 2000),
    });
  }

  await db.energyReading.createMany({ data: energyReadings });

  console.log(`✅  Energy readings: Sheffield (2023-2024) + Manchester (2024)`);

  // ────────────────────────────────────────────────────────────────────────
  // COMPANY 2 — Apex Composites Ltd (second tenant for isolation testing)
  // ────────────────────────────────────────────────────────────────────────
  const apex = await db.company.create({
    data: { name: "Apex Composites Ltd", slug: "apex-composites", plan: "FREE" },
  });

  const david = await db.user.create({
    data: {
      companyId: apex.id,
      name: "David Walsh",
      email: "david.walsh@apexcomposites.co.uk",
      password: pw,
      role: "ADMIN",
    },
  });

  const apexSite = await db.site.create({
    data: {
      companyId: apex.id,
      name: "Apex Composites — Coventry",
      address: "Middlemarch Business Park, Coventry, CV3 4FJ",
      region: "West Midlands",
      country: "United Kingdom",
      latitude: 52.3777,
      longitude: -1.4984,
    },
  });

  const apexBaseline = await db.baseline.create({
    data: {
      companyId: apex.id,
      year: 2023,
      growthRatePct: 0.8,
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
    data: {
      companyId: apex.id,
      label: "50% Absolute Reduction by 2040",
      scopeCombination: "1+2+3",
      targetYear: 2040,
      reductionPct: 50,
      isInterim: false,
      isSbtiAligned: false,
    },
  });

  console.log(`\n✅  Company 2: ${apex.name}`);
  console.log(`    User: ${david.name} (Admin)`);
  console.log(`    Site: ${apexSite.name}`);
  console.log(`    Baseline: ${apexBaseline.year}, 5,100 tCO₂e`);

  // ── Summary ───────────────────────────────────────────────────────────────
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
Interventions: 8 (2 in-progress, 1 completed, 5 planned)
Scenarios: 2 (Ambitious 2040 / Conservative 2050)
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
