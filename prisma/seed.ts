/**
 * Seed script — Meridian Forge Ltd (primary) + Apex Composites Ltd (second tenant)
 *
 * Run with:  npx tsx prisma/seed.ts
 *
 * Meridian Forge:
 *   Baseline  45,000 tCO₂e (2022) — S1: 15,500 | S2: 12,500 | S3: 17,000
 *   Sites     14 (3 UK, 6 US, 3 Canada, 1 Poland, 1 UK HQ)
 *   Interventions  15 across sites + company-wide
 *   Scenarios 3 (Ambitious 2040 / Moderate 2045 / Conservative 2050)
 *   Assets    56 across all 14 sites
 *   Actuals   2022-2025, energy readings for 5 sites, 6 emission factors
 */

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, authToken });
const db = new PrismaClient({ adapter } as never) as PrismaClient;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

/** Linear ramp from startYear to fullYear, constant at annualAtFull from fullYear to 2050 */
function ramp(
  startYear: number,
  fullYear: number,
  annualAtFull: number,
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
      companyId: meridian.id, name: "Sarah Chen",
      email: "sarah.chen@meridianforge.co.uk", password: pw, role: "ADMIN",
    },
  });
  const james = await db.user.create({
    data: {
      companyId: meridian.id, name: "James Whitmore",
      email: "james.whitmore@meridianforge.co.uk", password: pw, role: "EDITOR",
    },
  });
  const priya = await db.user.create({
    data: {
      companyId: meridian.id, name: "Priya Patel",
      email: "priya.patel@meridianforge.co.uk", password: pw, role: "VIEWER",
    },
  });
  console.log(`✅  Users: ${sarah.name} (Admin), ${james.name} (Editor), ${priya.name} (Viewer)`);

  // ── Sites (14) ────────────────────────────────────────────────────────────

  const sheffield = await db.site.create({
    data: {
      companyId: meridian.id, name: "Sheffield Works",
      address: "Newhall Road, Sheffield, S9 2QL", city: "Sheffield",
      region: "Yorkshire", country: "United Kingdom",
      latitude: 53.3949, longitude: -1.4185, siteType: "manufacturing",
      grossFloorAreaM2: 18500, yearBuilt: 1978, siteManager: "James Whitmore",
    },
  });
  const manchester = await db.site.create({
    data: {
      companyId: meridian.id, name: "Manchester Distribution Centre",
      address: "Port Salford, Salford, M5 2XS", city: "Salford",
      region: "Greater Manchester", country: "United Kingdom",
      latitude: 53.4788, longitude: -2.301, siteType: "warehouse",
      grossFloorAreaM2: 12000, yearBuilt: 2005, siteManager: "James Whitmore",
    },
  });
  const bristol = await db.site.create({
    data: {
      companyId: meridian.id, name: "Bristol Assembly",
      address: "Aztec West Business Park, Bristol, BS32 4TD", city: "Bristol",
      region: "West of England", country: "United Kingdom",
      latitude: 51.5237, longitude: -2.5427, siteType: "manufacturing",
      grossFloorAreaM2: 8200, yearBuilt: 1998, siteManager: "James Whitmore",
    },
  });
  const birmingham = await db.site.create({
    data: {
      companyId: meridian.id, name: "Birmingham Corporate HQ",
      address: "One Brindleyplace, Birmingham, B1 2JB", city: "Birmingham",
      region: "West Midlands", country: "United Kingdom",
      latitude: 52.4814, longitude: -1.9112, siteType: "office",
      grossFloorAreaM2: 5500, yearBuilt: 2018, siteManager: "Sarah Chen",
    },
  });
  const chicago = await db.site.create({
    data: {
      companyId: meridian.id, name: "Chicago Manufacturing Hub",
      address: "2200 S Halsted St, Chicago, IL 60608", city: "Chicago",
      region: "Illinois", country: "United States",
      latitude: 41.8781, longitude: -87.6298, siteType: "manufacturing",
      grossFloorAreaM2: 14300, yearBuilt: 1992, siteManager: "Sarah Chen",
    },
  });
  const houston = await db.site.create({
    data: {
      companyId: meridian.id, name: "Houston Operations Centre",
      address: "8900 N Sam Houston Pkwy E, Houston, TX 77064", city: "Houston",
      region: "Texas", country: "United States",
      latitude: 29.7604, longitude: -95.3698, siteType: "manufacturing",
      grossFloorAreaM2: 9800, yearBuilt: 2001, siteManager: "Sarah Chen",
    },
  });
  const losAngeles = await db.site.create({
    data: {
      companyId: meridian.id, name: "Los Angeles Facility",
      address: "2401 E 8th St, Los Angeles, CA 90021", city: "Los Angeles",
      region: "California", country: "United States",
      latitude: 34.0537, longitude: -118.2427, siteType: "warehouse",
      grossFloorAreaM2: 7400, yearBuilt: 2008, siteManager: "Sarah Chen",
    },
  });
  const seattle = await db.site.create({
    data: {
      companyId: meridian.id, name: "Seattle Tech Centre",
      address: "4000 Aurora Ave N, Seattle, WA 98103", city: "Seattle",
      region: "Washington", country: "United States",
      latitude: 47.548, longitude: -122.3553, siteType: "office",
      grossFloorAreaM2: 3600, yearBuilt: 2015, siteManager: "Priya Patel",
    },
  });
  const atlanta = await db.site.create({
    data: {
      companyId: meridian.id, name: "Atlanta Distribution",
      address: "3200 Piedmont Rd NE, Atlanta, GA 30305", city: "Atlanta",
      region: "Georgia", country: "United States",
      latitude: 33.749, longitude: -84.388, siteType: "warehouse",
      grossFloorAreaM2: 11200, yearBuilt: 2003, siteManager: "James Whitmore",
    },
  });
  const denver = await db.site.create({
    data: {
      companyId: meridian.id, name: "Denver Regional Office",
      address: "1700 Lincoln St, Denver, CO 80203", city: "Denver",
      region: "Colorado", country: "United States",
      latitude: 39.7392, longitude: -104.9903, siteType: "office",
      grossFloorAreaM2: 2200, yearBuilt: 2012, siteManager: "Priya Patel",
    },
  });
  const toronto = await db.site.create({
    data: {
      companyId: meridian.id, name: "Toronto Assembly Plant",
      address: "1 Port Industrial Blvd, Toronto, ON M5A 1A4", city: "Toronto",
      region: "Ontario", country: "Canada",
      latitude: 43.6532, longitude: -79.3832, siteType: "manufacturing",
      grossFloorAreaM2: 16800, yearBuilt: 1985, siteManager: "Sarah Chen",
    },
  });
  const vancouver = await db.site.create({
    data: {
      companyId: meridian.id, name: "Vancouver Logistics",
      address: "1200 Terminal Ave, Vancouver, BC V6A 2R2", city: "Vancouver",
      region: "British Columbia", country: "Canada",
      latitude: 49.2827, longitude: -123.1207, siteType: "warehouse",
      grossFloorAreaM2: 8900, yearBuilt: 2010, siteManager: "James Whitmore",
    },
  });
  const calgary = await db.site.create({
    data: {
      companyId: meridian.id, name: "Calgary Processing Facility",
      address: "4500 52 Ave SE, Calgary, AB T2B 3R2", city: "Calgary",
      region: "Alberta", country: "Canada",
      latitude: 51.0447, longitude: -114.0719, siteType: "manufacturing",
      grossFloorAreaM2: 6500, yearBuilt: 1996, siteManager: "James Whitmore",
    },
  });
  const warsaw = await db.site.create({
    data: {
      companyId: meridian.id, name: "Warsaw European Hub",
      address: "ul. Puławska 182, 02-670 Warszawa", city: "Warsaw",
      region: "Masovian", country: "Poland",
      latitude: 52.2297, longitude: 21.0122, siteType: "manufacturing",
      grossFloorAreaM2: 10400, yearBuilt: 2007, siteManager: "James Whitmore",
    },
  });
  console.log(`✅  Sites: 14 total (4 UK, 6 US, 3 Canada, 1 Poland)`);

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

  // ── Baseline: 45,000 tCO₂e (2022) ────────────────────────────────────────
  const baseline = await db.baseline.create({
    data: {
      companyId: meridian.id,
      year: 2022,
      growthRatePct: 1.5,
      entries: {
        create: [
          // Scope 1 — 15,500 tCO₂e
          { scope: 1, category: "Natural Gas Combustion", emissionsTco2e: 6800 },
          { scope: 1, category: "Diesel Fleet & Plant", emissionsTco2e: 4500 },
          { scope: 1, category: "Fugitive Emissions (Refrigerants)", emissionsTco2e: 1800 },
          { scope: 1, category: "Process Emissions (Furnaces)", emissionsTco2e: 2400 },
          // Scope 2 — 12,500 tCO₂e
          { scope: 2, category: "Purchased Electricity", emissionsTco2e: 11200 },
          { scope: 2, category: "District Heating (Warsaw)", emissionsTco2e: 1300 },
          // Scope 3 — 17,000 tCO₂e
          { scope: 3, category: "Purchased Goods & Services", emissionsTco2e: 8200 },
          { scope: 3, category: "Employee Commuting", emissionsTco2e: 1400 },
          { scope: 3, category: "Business Travel", emissionsTco2e: 950 },
          { scope: 3, category: "Upstream Transport & Distribution", emissionsTco2e: 3200 },
          { scope: 3, category: "Downstream Transport", emissionsTco2e: 2100 },
          { scope: 3, category: "Waste Generated in Operations", emissionsTco2e: 750 },
          { scope: 3, category: "Capital Goods", emissionsTco2e: 400 },
        ],
      },
    },
  });
  await db.growthRate.createMany({
    data: [
      { baselineId: baseline.id, fromYear: 2023, toYear: 2028, ratePct: 1.5 },
      { baselineId: baseline.id, fromYear: 2029, toYear: 2038, ratePct: 0.8 },
      { baselineId: baseline.id, fromYear: 2039, toYear: 2050, ratePct: 0.0 },
    ],
  });
  console.log(`✅  Baseline: 2022, 45,000 tCO₂e (S1: 15,500 | S2: 12,500 | S3: 17,000)`);

  // ── Targets ───────────────────────────────────────────────────────────────
  await db.target.createMany({
    data: [
      {
        companyId: meridian.id,
        label: "SBTi Near-Term — 46.2% Scope 1+2 by 2030",
        scopeCombination: "1+2", targetYear: 2030, reductionPct: 46.2,
        isInterim: true, isSbtiAligned: true,
      },
      {
        companyId: meridian.id,
        label: "Interim — 72% Scope 1+2+3 by 2035",
        scopeCombination: "1+2+3", targetYear: 2035, reductionPct: 72,
        isInterim: true, isSbtiAligned: false,
      },
      {
        companyId: meridian.id,
        label: "Net Zero — 90% Scope 1+2+3 by 2050",
        scopeCombination: "1+2+3", targetYear: 2050, reductionPct: 90,
        isInterim: false, isSbtiAligned: true,
      },
    ],
  });
  console.log(`✅  Targets: SBTi near-term (2030) + Interim (2035) + Net Zero (2050)`);

  // ──────────────────────────────────────────────────────────────────────────
  // INTERVENTIONS — 15 (site-specific + company-wide)
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Rooftop Solar PV — Sheffield Works (COMPLETED)
  const solarSheffield = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: sheffield.id, businessUnitId: buManufacturing.id,
      name: "Rooftop Solar PV — Sheffield Works",
      description: "1.2 MWp rooftop PV array across forge building and warehouse roof. Sleeved PPA with zero upfront capex. Generating since Q2 2024.",
      category: "Renewable Energy", scopesAffected: "[2]",
      totalReductionTco2e: 19900,
      implementationStartYear: 2024, fullBenefitYear: 2025,
      status: "COMPLETED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2024, 2025, 750).map((r) => ({ interventionId: solarSheffield.id, ...r })),
  });

  // 2. LED Lighting Upgrade — Sheffield Works (COMPLETED)
  const ledSheffield = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: sheffield.id, businessUnitId: buManufacturing.id,
      name: "LED Lighting Upgrade — Sheffield Works",
      description: "Full LED retrofit across forge floor, warehouse aisles, and office block. ESOS audit-identified quick win with 14-month payback.",
      category: "Energy Efficiency", scopesAffected: "[2]",
      totalReductionTco2e: 13200,
      implementationStartYear: 2023, fullBenefitYear: 2024,
      status: "COMPLETED", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2023, 2024, 480).map((r) => ({ interventionId: ledSheffield.id, ...r })),
  });

  // 3. Industrial Heat Pump — Sheffield Works (IN_PROGRESS)
  const heatPumpSheffield = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: sheffield.id, businessUnitId: buManufacturing.id,
      name: "Industrial Heat Pump — Sheffield Works",
      description: "High-temperature industrial heat pump (2.5 MW thermal) to replace gas-fired boiler system. IETF Phase 2 grant awarded. Installation commenced Q4 2024.",
      category: "Process Decarbonisation", scopesAffected: "[1]",
      totalReductionTco2e: 70000,
      implementationStartYear: 2025, fullBenefitYear: 2027,
      status: "IN_PROGRESS", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 2800).map((r) => ({ interventionId: heatPumpSheffield.id, ...r })),
  });

  // 4. Fleet Electrification Programme (Manchester-based, company-wide)
  const fleetElec = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: manchester.id, businessUnitId: buLogistics.id,
      name: "Fleet Electrification Programme",
      description: "Phased replacement of 22 diesel HGVs and 14 light commercial vehicles across Manchester, Los Angeles, and Toronto with battery-electric equivalents. LEVI and CARB incentives applied.",
      category: "Transport Decarbonisation", scopesAffected: "[1]",
      totalReductionTco2e: 75200,
      implementationStartYear: 2026, fullBenefitYear: 2029,
      status: "PLANNED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2029, 3200).map((r) => ({ interventionId: fleetElec.id, ...r })),
  });

  // 5. Multi-site Building Insulation Programme
  const insulationMulti = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "Multi-site Building Insulation Programme",
      description: "Coordinated thermal envelope upgrades across Sheffield, Toronto, Calgary, and Warsaw. Roof insulation (300mm mineral wool), cavity wall insulation, and replacement of single-glazed roof lights.",
      category: "Energy Efficiency", scopesAffected: "[1,2]",
      totalReductionTco2e: 38400,
      implementationStartYear: 2026, fullBenefitYear: 2028,
      status: "PLANNED", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2028, 1600).map((r) => ({ interventionId: insulationMulti.id, ...r })),
  });

  // 6. Rooftop Solar PV — Bristol Assembly
  const solarBristol = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: bristol.id, businessUnitId: buManufacturing.id,
      name: "Rooftop Solar PV — Bristol Assembly",
      description: "480 kWp rooftop solar installation on the main assembly hall. Excess generation exported to grid under SEG tariff.",
      category: "Renewable Energy", scopesAffected: "[2]",
      totalReductionTco2e: 10300,
      implementationStartYear: 2026, fullBenefitYear: 2027,
      status: "PLANNED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 420).map((r) => ({ interventionId: solarBristol.id, ...r })),
  });

  // 7. Solar PV Array — Chicago Hub
  const solarChicago = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: chicago.id, businessUnitId: buManufacturing.id,
      name: "Solar PV Array — Chicago Hub",
      description: "1.0 MWp ground-mounted solar array on adjacent land. ITC tax credit (30%) reduces net cost significantly. ComEd net metering agreement in place.",
      category: "Renewable Energy", scopesAffected: "[2]",
      totalReductionTco2e: 16700,
      implementationStartYear: 2026, fullBenefitYear: 2027,
      status: "PLANNED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 680).map((r) => ({ interventionId: solarChicago.id, ...r })),
  });

  // 8. BMS Rollout — Warehouses
  const bmsRollout = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buLogistics.id,
      name: "BMS Rollout — Warehouses",
      description: "Smart building management systems at Manchester, Atlanta, Vancouver, and Los Angeles. Weather API integration, occupancy sensors, and automated HVAC scheduling.",
      category: "Energy Efficiency", scopesAffected: "[1,2]",
      totalReductionTco2e: 28100,
      implementationStartYear: 2025, fullBenefitYear: 2026,
      status: "IN_PROGRESS", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 1100).map((r) => ({ interventionId: bmsRollout.id, ...r })),
  });

  // 9. Heat Pump HVAC — Toronto Plant
  const heatPumpToronto = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: toronto.id, businessUnitId: buManufacturing.id,
      name: "Heat Pump HVAC — Toronto Plant",
      description: "Industrial air-source heat pump system (1.2 MW thermal) to replace ageing gas boiler. Canada Greener Homes Grant and Ontario IESO SaveOnEnergy incentive applied.",
      category: "Process Decarbonisation", scopesAffected: "[1]",
      totalReductionTco2e: 43700,
      implementationStartYear: 2027, fullBenefitYear: 2029,
      status: "PLANNED", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2027, 2029, 1900).map((r) => ({ interventionId: heatPumpToronto.id, ...r })),
  });

  // 10. Corporate Renewable PPA — UK Sites
  const ppaUK = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "Corporate Renewable PPA — UK Sites",
      description: "10-year sleeved PPA with Vattenfall for 8 GWh/yr of UK offshore wind. Eliminates remaining market-based Scope 2 across Sheffield, Manchester, Bristol, and Birmingham.",
      category: "Renewable Energy", scopesAffected: "[2]",
      totalReductionTco2e: 86700,
      implementationStartYear: 2025, fullBenefitYear: 2026,
      status: "IN_PROGRESS", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2026, 3400).map((r) => ({ interventionId: ppaUK.id, ...r })),
  });

  // 11. Corporate PPA — North America
  const ppaNorthAm = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "Corporate PPA — North America",
      description: "Virtual PPA for 10 GWh/yr of Canadian hydropower and US wind certificates covering all North American sites. 10-year term with price escalator.",
      category: "Renewable Energy", scopesAffected: "[2]",
      totalReductionTco2e: 68600,
      implementationStartYear: 2026, fullBenefitYear: 2027,
      status: "PLANNED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2027, 2800).map((r) => ({ interventionId: ppaNorthAm.id, ...r })),
  });

  // 12. Supply Chain Decarbonisation Programme
  const supplyChain = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "Supply Chain Decarbonisation Programme",
      description: "Engagement with top-25 suppliers representing 72% of Scope 3 Category 1. Includes supplier scorecards, joint reduction targets, transition finance facility, and annual CDP reporting.",
      category: "Supply Chain", scopesAffected: "[3]",
      totalReductionTco2e: 128800,
      implementationStartYear: 2026, fullBenefitYear: 2030,
      status: "PLANNED", owner: "Sarah Chen",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2030, 5600).map((r) => ({ interventionId: supplyChain.id, ...r })),
  });

  // 13. EV Charging Network — UK Sites
  const evCharging = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "EV Charging Network — UK Sites",
      description: "Installation of 80 AC (22 kW) and 8 DC rapid (150 kW) chargers across Sheffield, Manchester, Bristol, and Birmingham. Supports fleet transition and employee EV adoption.",
      category: "Transport Decarbonisation", scopesAffected: "[1,2]",
      totalReductionTco2e: 22800,
      implementationStartYear: 2026, fullBenefitYear: 2028,
      status: "PLANNED", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2026, 2028, 950).map((r) => ({ interventionId: evCharging.id, ...r })),
  });

  // 14. Refrigerant Transition Programme
  const refrigerant = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: null, businessUnitId: buCorporate.id,
      name: "Refrigerant Transition Programme",
      description: "Phase-out of R22 and R410A refrigerants across all cold stores and HVAC systems. Replacement with low-GWP alternatives (R290, R1234ze). F-Gas regulation compliance.",
      category: "Process Decarbonisation", scopesAffected: "[1]",
      totalReductionTco2e: 37500,
      implementationStartYear: 2025, fullBenefitYear: 2027,
      status: "IN_PROGRESS", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 1500).map((r) => ({ interventionId: refrigerant.id, ...r })),
  });

  // 15. Warsaw Thermal Envelope + LED Upgrade
  const warsawThermal = await db.intervention.create({
    data: {
      companyId: meridian.id, siteId: warsaw.id, businessUnitId: buManufacturing.id,
      name: "Warsaw Thermal Envelope + LED Upgrade",
      description: "Comprehensive package: external insulation (200mm EPS), triple-glazed windows, roof insulation, and full LED retrofit with DALI controls. Poland's high grid factor (0.773 kgCO₂e/kWh) makes savings especially impactful. EU Cohesion Fund grant covers 35%.",
      category: "Energy Efficiency", scopesAffected: "[1,2]",
      totalReductionTco2e: 45000,
      implementationStartYear: 2025, fullBenefitYear: 2027,
      status: "IN_PROGRESS", owner: "James Whitmore",
    },
  });
  await db.interventionAnnualReduction.createMany({
    data: ramp(2025, 2027, 1800).map((r) => ({ interventionId: warsawThermal.id, ...r })),
  });

  console.log(`✅  Interventions (15): 2 completed, 5 in progress, 8 planned`);

  // ──────────────────────────────────────────────────────────────────────────
  // SCENARIOS — 3 (Ambitious 2040 / Moderate 2045 / Conservative 2050)
  // ──────────────────────────────────────────────────────────────────────────

  const scenarioAmbitious = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Ambitious — Net Zero by 2040",
      description: "All major capital projects front-loaded. Higher capex 2025-2030 targets Scope 1+2 elimination by 2035 with supply chain programme delivering net zero by 2040. Assumes grant funding for heat pumps and 100% EV fleets by 2029.",
    },
  });
  const scenarioModerate = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Moderate — Net Zero by 2045",
      description: "Balanced approach with steady capital deployment. Capital-intensive projects deferred 1-2 years to align with natural asset replacement cycles. Moderate execution assumptions on fleet and supply chain reflecting realistic engagement timelines.",
    },
  });
  const scenarioConservative = await db.scenario.create({
    data: {
      companyId: meridian.id,
      name: "Conservative — Net Zero by 2050",
      description: "Risk-averse phased approach to manage technology risk and capital constraints. Capital-intensive projects deferred 3-4 years. Lower execution % on fleet and supply chain reflecting market and engagement risks. No grant funding assumed.",
    },
  });

  // ── Ambitious ScenarioInterventions ─────────────────────────────────────
  await db.scenarioIntervention.createMany({
    data: [
      {
        scenarioId: scenarioAmbitious.id, interventionId: solarSheffield.id,
        startYear: 2024, endYear: 2049, executionPct: 100,
        capex: 0, opex: 18000, financialLifetime: 20, technicalAssetLife: 25,
        notes: "Sleeved PPA — zero upfront capex. O&M included in annual opex.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: ledSheffield.id,
        startYear: 2023, endYear: 2038, executionPct: 100,
        capex: 285000, opex: 5000, externalFunding: 940000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Completed. Energy savings NPV factored as external funding.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: heatPumpSheffield.id,
        startYear: 2025, endYear: 2045, executionPct: 100, startQuarter: 1,
        capex: 3800000, opex: 95000, externalFunding: 760000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 120, personnelRatePerDay: 750,
        notes: "IETF Phase 2 grant (20% of capex) awarded. Installation underway.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: fleetElec.id,
        startYear: 2026, endYear: 2036, executionPct: 100, implementationPacePctPerYear: 25,
        capex: 2400000, opex: 65000, externalFunding: 420000, financialLifetime: 7, technicalAssetLife: 10,
        personnelTimeDays: 60, personnelRatePerDay: 600,
        notes: "LEVI + CARB HVIP + iZEV incentives. Charging infrastructure funded via EV Charging intervention.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: insulationMulti.id,
        startYear: 2026, endYear: 2056, executionPct: 100,
        capex: 1200000, opex: 15000, externalFunding: 480000, financialLifetime: 25, technicalAssetLife: 30,
        personnelTimeDays: 80, personnelRatePerDay: 650,
        notes: "Phased across 4 sites. Sheffield first (Q1 2026), Warsaw last (Q4 2027).",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: solarBristol.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 150000, opex: 4000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Planning permission obtained. Installation scheduled Q2 2026.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: solarChicago.id,
        startYear: 2026, endYear: 2051, executionPct: 100,
        capex: 280000, opex: 9000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "ITC 30% tax credit reduces net capex to $196k. ComEd net metering.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: bmsRollout.id,
        startYear: 2025, endYear: 2037, executionPct: 100,
        capex: 280000, opex: 12000, externalFunding: 650000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Energy savings NPV over 12yr factored in. Siemens Desigo CC platform.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: heatPumpToronto.id,
        startYear: 2027, endYear: 2047, executionPct: 100,
        capex: 1800000, opex: 45000, externalFunding: 270000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 90, personnelRatePerDay: 700,
        notes: "Greener Homes Grant + IESO SaveOnEnergy. Feasibility complete.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: ppaUK.id,
        startYear: 2025, endYear: 2035, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Sleeved PPA signed. Premium vs market rate £3.50/MWh.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: ppaNorthAm.id,
        startYear: 2026, endYear: 2036, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Virtual PPA at spot price parity. No balance sheet impact.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: supplyChain.id,
        startYear: 2026, endYear: 2050, executionPct: 90,
        capex: 0, opex: 120000, financialLifetime: 7, technicalAssetLife: null,
        personnelTimeDays: 200, personnelRatePerDay: 650,
        notes: "Internal sustainability team (3 FTE) + external consultant for supplier engagement.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: evCharging.id,
        startYear: 2026, endYear: 2038, executionPct: 100,
        capex: 480000, opex: 18000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Workplace Charging Scheme grant £350 per socket × 80 sockets = £28k.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: refrigerant.id,
        startYear: 2025, endYear: 2040, executionPct: 100,
        capex: 350000, opex: 8000, financialLifetime: 15, technicalAssetLife: 15,
        notes: "F-Gas regulation mandates phase-out by 2030. Proactive approach avoids penalties.",
      },
      {
        scenarioId: scenarioAmbitious.id, interventionId: warsawThermal.id,
        startYear: 2025, endYear: 2055, executionPct: 100,
        capex: 520000, opex: 8000, externalFunding: 182000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "EU Cohesion Fund grant (35% of capex). High Polish grid factor gives exceptional ROI.",
      },
    ],
  });

  // ── Moderate ScenarioInterventions ──────────────────────────────────────
  await db.scenarioIntervention.createMany({
    data: [
      {
        scenarioId: scenarioModerate.id, interventionId: solarSheffield.id,
        startYear: 2024, endYear: 2049, executionPct: 100,
        capex: 0, opex: 18000, financialLifetime: 20, technicalAssetLife: 25,
        notes: "Already committed — PPA in place.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: ledSheffield.id,
        startYear: 2023, endYear: 2038, executionPct: 100,
        capex: 285000, opex: 5000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Already completed — included for reporting.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: heatPumpSheffield.id,
        startYear: 2025, endYear: 2045, executionPct: 95,
        capex: 3800000, opex: 95000, externalFunding: 760000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 120, personnelRatePerDay: 750,
        notes: "In progress. 95% execution assumes minor commissioning delays.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: fleetElec.id,
        startYear: 2027, endYear: 2037, executionPct: 85, implementationPacePctPerYear: 20,
        capex: 2400000, opex: 65000, externalFunding: 300000, financialLifetime: 7, technicalAssetLife: 10,
        personnelTimeDays: 60, personnelRatePerDay: 600,
        notes: "1-year delay to align with HGV model availability. Reduced incentive assumptions.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: insulationMulti.id,
        startYear: 2027, endYear: 2057, executionPct: 95,
        capex: 1200000, opex: 15000, externalFunding: 360000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "1-year delay for contractor scheduling. Warsaw phase may slip to 2028.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: solarBristol.id,
        startYear: 2027, endYear: 2052, executionPct: 100,
        capex: 150000, opex: 4000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Deferred 1 year to sequence after Sheffield insulation work.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: solarChicago.id,
        startYear: 2027, endYear: 2052, executionPct: 100,
        capex: 280000, opex: 9000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Deferred 1 year for utility interconnection approval.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: bmsRollout.id,
        startYear: 2026, endYear: 2038, executionPct: 95,
        capex: 280000, opex: 12000, externalFunding: 520000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "1-year delay. Vancouver site may require additional commissioning.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: heatPumpToronto.id,
        startYear: 2028, endYear: 2048, executionPct: 90,
        capex: 1800000, opex: 45000, externalFunding: 180000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 90, personnelRatePerDay: 700,
        notes: "1-year delay for detailed engineering. Reduced grant assumptions.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: ppaUK.id,
        startYear: 2026, endYear: 2036, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred 1 year to align with existing electricity contract expiry.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: ppaNorthAm.id,
        startYear: 2027, endYear: 2037, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred to coincide with US site contract renewals.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: supplyChain.id,
        startYear: 2027, endYear: 2050, executionPct: 78,
        capex: 0, opex: 100000, financialLifetime: 7, technicalAssetLife: null,
        personnelTimeDays: 160, personnelRatePerDay: 650,
        notes: "Reduced execution reflecting supplier engagement challenges. 2 FTE internal team.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: evCharging.id,
        startYear: 2027, endYear: 2039, executionPct: 95,
        capex: 480000, opex: 18000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "1-year delay to co-schedule with fleet electrification phase.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: refrigerant.id,
        startYear: 2026, endYear: 2041, executionPct: 95,
        capex: 350000, opex: 8000, financialLifetime: 15, technicalAssetLife: 15,
        notes: "1-year delay. Regulatory deadline provides buffer.",
      },
      {
        scenarioId: scenarioModerate.id, interventionId: warsawThermal.id,
        startYear: 2026, endYear: 2056, executionPct: 95,
        capex: 520000, opex: 8000, externalFunding: 130000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "1-year delay pending EU grant confirmation (reduced to 25% assumption).",
      },
    ],
  });

  // ── Conservative ScenarioInterventions ──────────────────────────────────
  await db.scenarioIntervention.createMany({
    data: [
      {
        scenarioId: scenarioConservative.id, interventionId: solarSheffield.id,
        startYear: 2024, endYear: 2049, executionPct: 100,
        capex: 0, opex: 18000, financialLifetime: 20, technicalAssetLife: 25,
        notes: "Already committed — PPA in place.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: ledSheffield.id,
        startYear: 2023, endYear: 2038, executionPct: 100,
        capex: 285000, opex: 5000, financialLifetime: 10, technicalAssetLife: 15,
        notes: "Already completed — included for reporting.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: heatPumpSheffield.id,
        startYear: 2025, endYear: 2045, executionPct: 85,
        capex: 3800000, opex: 95000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 120, personnelRatePerDay: 750,
        notes: "In progress but 85% execution assumes partial commissioning issues and no grant top-up.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: fleetElec.id,
        startYear: 2029, endYear: 2039, executionPct: 70, implementationPacePctPerYear: 18,
        capex: 2400000, opex: 65000, financialLifetime: 7, technicalAssetLife: 10,
        personnelTimeDays: 60, personnelRatePerDay: 600,
        notes: "Deferred 3 years pending EV HGV market maturity. No grant funding assumed.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: insulationMulti.id,
        startYear: 2029, endYear: 2059, executionPct: 85,
        capex: 1200000, opex: 15000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "Deferred 3 years. Only Sheffield and Warsaw prioritised in first phase.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: solarBristol.id,
        startYear: 2029, endYear: 2054, executionPct: 100,
        capex: 150000, opex: 4000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Deferred 3 years. Low risk — solar proven technology.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: solarChicago.id,
        startYear: 2029, endYear: 2054, executionPct: 100,
        capex: 280000, opex: 9000, financialLifetime: 25, technicalAssetLife: 25,
        notes: "Deferred 3 years. ITC credit may decrease to 22% by then.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: bmsRollout.id,
        startYear: 2028, endYear: 2040, executionPct: 85,
        capex: 280000, opex: 12000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Deferred 3 years. Phased rollout — Manchester first, others follow.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: heatPumpToronto.id,
        startYear: 2031, endYear: 2051, executionPct: 80,
        capex: 1800000, opex: 45000, financialLifetime: 20, technicalAssetLife: 20,
        personnelTimeDays: 90, personnelRatePerDay: 700,
        notes: "Deferred to 2031 — aligned with boiler end-of-life. No grant funding assumed.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: ppaUK.id,
        startYear: 2028, endYear: 2038, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred 3 years. Current electricity contracts run until 2028.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: ppaNorthAm.id,
        startYear: 2029, endYear: 2039, executionPct: 100,
        capex: 0, opex: 0, financialLifetime: 10, technicalAssetLife: 10,
        notes: "Deferred 3 years pending US site contract renewals.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: supplyChain.id,
        startYear: 2030, endYear: 2050, executionPct: 60,
        capex: 0, opex: 80000, financialLifetime: 7, technicalAssetLife: null,
        personnelTimeDays: 100, personnelRatePerDay: 600,
        notes: "Deferred 4 years. 60% execution reflects significant supplier engagement challenges.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: evCharging.id,
        startYear: 2029, endYear: 2041, executionPct: 85,
        capex: 480000, opex: 18000, financialLifetime: 12, technicalAssetLife: 12,
        notes: "Deferred 3 years. AC-only in first phase; DC rapid added later.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: refrigerant.id,
        startYear: 2028, endYear: 2043, executionPct: 85,
        capex: 350000, opex: 8000, financialLifetime: 15, technicalAssetLife: 15,
        notes: "Deferred but must complete before 2030 F-Gas deadline. Some sites may use interim solutions.",
      },
      {
        scenarioId: scenarioConservative.id, interventionId: warsawThermal.id,
        startYear: 2028, endYear: 2058, executionPct: 85,
        capex: 520000, opex: 8000, financialLifetime: 25, technicalAssetLife: 30,
        notes: "Deferred 3 years. No EU grant assumed. LED phase only in first year.",
      },
    ],
  });

  console.log(`✅  Scenarios: "${scenarioAmbitious.name}" + "${scenarioModerate.name}" + "${scenarioConservative.name}"`);
  console.log(`    45 ScenarioIntervention records (15 per scenario) with technicalAssetLife`);

  // ──────────────────────────────────────────────────────────────────────────
  // ASSETS — 56 across all 14 sites
  // ──────────────────────────────────────────────────────────────────────────

  await db.asset.createMany({
    data: [
      // ── Sheffield Works (7 assets) ─────────────────────────────────────────
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Gas-Fired Boiler System (2× 2MW)",
        assetType: "Industrial Boiler", category: "HVAC",
        conditionRating: "RED",
        conditionNotes: "Primary heat exchanger showing corrosion. Efficiency dropped from 88% to 71% at last service (Oct 2024). IETF heat pump replacement underway.",
        installationYear: 2004, expectedUsefulLife: 20,
        currentEnergyKwh: 5200000, scope: 1,
        linkedInterventionId: heatPumpSheffield.id,
        alertThresholdYears: 5, replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Compressed Air System (160 kW Atlas Copco)",
        assetType: "Compressor", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "VSD retrofit completed on 3 of 4 compressors. Leak rate reduced from 28% to 14%. Final unit awaiting parts Q2 2025.",
        installationYear: 2013, expectedUsefulLife: 15,
        currentEnergyKwh: 1080000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Injection Moulding Machines (×6 Arburg 570S)",
        assetType: "Manufacturing Equipment", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "All 6 units operating within spec. Hydraulic seals replaced on units 3 and 5 in 2024. Predictive maintenance programme active.",
        installationYear: 2017, expectedUsefulLife: 15,
        currentEnergyKwh: 2180000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Overhead Crane System (10t Demag)",
        assetType: "Crane", category: "electrical",
        conditionRating: "AMBER",
        conditionNotes: "Hoist motor bearings showing wear at last inspection (Aug 2024). Scheduled replacement Q1 2025. Runway rails in good condition.",
        installationYear: 2008, expectedUsefulLife: 25,
        currentEnergyKwh: 45000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Rooftop Solar PV Array (1.2 MWp)",
        assetType: "Solar PV", category: "energy",
        conditionRating: "GREEN",
        conditionNotes: "Installed Q2 2024 under PPA. All 2,400 panels performing at rated output. Inverter efficiency 98.2%. First annual inspection due Q2 2025.",
        installationYear: 2024, expectedUsefulLife: 25,
        currentEnergyKwh: null, scope: 2,
        linkedInterventionId: solarSheffield.id,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Power Distribution Transformer (1.6 MVA)",
        assetType: "Transformer", category: "electrical",
        conditionRating: "AMBER",
        conditionNotes: "Oil analysis shows elevated dissolved gas levels (acetylene 12 ppm). Increased monitoring frequency to quarterly. Consider replacement by 2028.",
        installationYear: 2002, expectedUsefulLife: 30,
        currentEnergyKwh: null, scope: 2,
        alertThresholdYears: 4, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: sheffield.id,
        name: "Forklift Fleet (×4 Diesel Linde H30)",
        assetType: "Forklift", category: "fleet",
        conditionRating: "AMBER",
        conditionNotes: "Mixed condition. Units 1-2 (2017) due for replacement; units 3-4 (2020) in acceptable condition. Consider electric replacements.",
        installationYear: 2017, expectedUsefulLife: 8,
        currentEnergyKwh: 62000, scope: 1,
        alertThresholdYears: 2, replacementPriority: "HIGH",
      },

      // ── Manchester Distribution Centre (5 assets) ──────────────────────────
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Diesel HGV Fleet (14 vehicles)",
        assetType: "Heavy Goods Vehicles", category: "fleet",
        conditionRating: "AMBER",
        conditionNotes: "Mixed fleet: 6× Euro VI DAF XF (2019), 5× Volvo FH (2020), 3× Ford Transit (2021). Two DAF units due for PSVAR compliance upgrade.",
        installationYear: 2019, expectedUsefulLife: 7,
        currentEnergyKwh: null, scope: 1,
        linkedInterventionId: fleetElec.id,
        alertThresholdYears: 3, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Cold Store Chiller Units (×3 Carrier 30XA)",
        assetType: "Refrigeration", category: "HVAC",
        conditionRating: "RED",
        conditionNotes: "R22 refrigerant — phase-out mandated by F-Gas regulation. Unit 1 compressor failure Nov 2024. R22 refill no longer legal — urgent replacement required.",
        installationYear: 2006, expectedUsefulLife: 15,
        currentEnergyKwh: 620000, scope: 2,
        linkedInterventionId: refrigerant.id,
        alertThresholdYears: 5, replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Automated Sortation System (Beumer BG Line)",
        assetType: "Sortation System", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Installed 2020. Annual throughput 1.2M parcels. All conveyors and diverters within tolerance. Software upgraded to v4.2 in 2024.",
        installationYear: 2020, expectedUsefulLife: 15,
        currentEnergyKwh: 340000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Dock Levellers & Loading Bays (×8 Hörmann)",
        assetType: "Dock Equipment", category: "other",
        conditionRating: "AMBER",
        conditionNotes: "Hydraulic rams on bays 3 and 7 showing slow return speed. Seals replaced on bay 3 (Sep 2024). Bay 7 scheduled for Q1 2025.",
        installationYear: 2005, expectedUsefulLife: 20,
        currentEnergyKwh: 8000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: manchester.id,
        name: "Warehouse LED High-Bay Lighting (200 fittings)",
        assetType: "LED Lighting", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Retrofitted 2022. All luminaires at >90% rated output. DALI control system with occupancy and daylight sensing operational.",
        installationYear: 2022, expectedUsefulLife: 15,
        currentEnergyKwh: 120000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },

      // ── Bristol Assembly (4 assets) ────────────────────────────────────────
      {
        companyId: meridian.id, siteId: bristol.id,
        name: "CNC Machining Centres (×3 Mazak Integrex i-400)",
        assetType: "CNC Machine", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Under extended warranty until 2027. Predictive maintenance programme shows all spindles within tolerance. Coolant system upgraded Q3 2024.",
        installationYear: 2021, expectedUsefulLife: 15,
        currentEnergyKwh: 980000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: bristol.id,
        name: "Gas Boiler (400 kW Viessmann Vitocrossal)",
        assetType: "Boiler", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Efficiency at 84% (rated 92%). Heat exchanger scaling detected at annual service (Nov 2024). Chemical flush scheduled Q1 2025.",
        installationYear: 2012, expectedUsefulLife: 20,
        currentEnergyKwh: 1400000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: bristol.id,
        name: "Paint Spray Booth with Extraction",
        assetType: "Paint Booth", category: "other",
        conditionRating: "AMBER",
        conditionNotes: "Extraction fans operating at 92% of rated flow. Filters replaced quarterly. Booth lighting upgraded to LED 2023. VOC monitoring compliant.",
        installationYear: 2010, expectedUsefulLife: 20,
        currentEnergyKwh: 210000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: bristol.id,
        name: "Screw Compressor (75 kW CompAir L75)",
        assetType: "Compressor", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "VSD equipped from factory. Air-end overhaul completed 2023 at 40,000 hours. Running at 65% average load — well within efficient range.",
        installationYear: 2016, expectedUsefulLife: 15,
        currentEnergyKwh: 380000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },

      // ── Birmingham Corporate HQ (3 assets) ────────────────────────────────
      {
        companyId: meridian.id, siteId: birmingham.id,
        name: "VRF HVAC System (Daikin VRV IV)",
        assetType: "VRF System", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "Installed at fit-out. R410A refrigerant — transition to R32 units planned at first major service (2028). All 12 indoor units operating within spec.",
        installationYear: 2018, expectedUsefulLife: 15,
        currentEnergyKwh: 380000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: birmingham.id,
        name: "Server Room UPS & Cooling (80 kVA Eaton)",
        assetType: "UPS", category: "IT",
        conditionRating: "AMBER",
        conditionNotes: "Battery bank showing 78% capacity at last test (Jun 2024). Runtime reduced from 15min to 11min. Battery replacement quote obtained — £18k.",
        installationYear: 2018, expectedUsefulLife: 10,
        currentEnergyKwh: 95000, scope: 2,
        alertThresholdYears: 2, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: birmingham.id,
        name: "Company Car Pool (×8 PHEV BMW 330e)",
        assetType: "Company Cars", category: "fleet",
        conditionRating: "AMBER",
        conditionNotes: "4-year lease expiring Q2 2026. Average 12,000 miles/yr per vehicle. 45% electric mode usage tracked via telematics. EV replacement planned at lease end.",
        installationYear: 2022, expectedUsefulLife: 4,
        currentEnergyKwh: null, scope: 1,
        alertThresholdYears: 1, replacementPriority: "MEDIUM",
      },

      // ── Chicago Manufacturing Hub (5 assets) ──────────────────────────────
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "CNC Line (×4 Haas VF-4SS)",
        assetType: "CNC Machine", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "All 4 units on preventive maintenance contract. Spindle hours: 18k-22k range. Next major service at 30k hours (~2027).",
        installationYear: 2020, expectedUsefulLife: 15,
        currentEnergyKwh: 1600000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Rooftop HVAC Package Units (×3 Trane)",
        assetType: "Rooftop Unit", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "R410A refrigerant. Unit 2 compressor showing elevated vibration at last inspection. Economiser dampers replaced on unit 1 (Oct 2024).",
        installationYear: 2012, expectedUsefulLife: 20,
        currentEnergyKwh: 880000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Air Compressor (90 kW Ingersoll Rand R90n)",
        assetType: "Compressor", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Fixed-speed unit — VSD retrofit under evaluation. Air-end at 35,000 hours (overhaul recommended at 40,000). Leak rate 18% — above target.",
        installationYear: 2014, expectedUsefulLife: 15,
        currentEnergyKwh: 520000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Electrical Switchgear (480V Square D)",
        assetType: "Switchgear", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Thermographic survey (Sep 2024) clear. All breakers within trip-test tolerance. Arc flash study updated 2023.",
        installationYear: 2015, expectedUsefulLife: 30,
        currentEnergyKwh: null, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: chicago.id,
        name: "Cooling Tower (200 kW BAC Series 3000)",
        assetType: "Cooling Tower", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Fill media showing biological fouling — chemical treatment regime increased. Fan motor bearings replaced Q2 2024. Basin liner needs assessment.",
        installationYear: 2010, expectedUsefulLife: 20,
        currentEnergyKwh: 260000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },

      // ── Houston Operations Centre (4 assets) ──────────────────────────────
      {
        companyId: meridian.id, siteId: houston.id,
        name: "Process Furnace (Natural Gas, 1.5 MW)",
        assetType: "Furnace", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Refractory lining repaired Q3 2024 (hot spot detected by IR survey). Burner efficiency at 83%. NOx emissions within TCEQ permit limits.",
        installationYear: 2008, expectedUsefulLife: 20,
        currentEnergyKwh: 3200000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: houston.id,
        name: "Central HVAC System (Carrier 30RB chiller + AHUs)",
        assetType: "HVAC System", category: "HVAC",
        conditionRating: "RED",
        conditionNotes: "Chiller COP dropped to 3.1 (rated 5.2). Condenser tubes fouled — chemical clean overdue. AHU-3 fan belt slipping. High cooling load in Houston summer makes failure critical.",
        installationYear: 2005, expectedUsefulLife: 20,
        currentEnergyKwh: 1100000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "CRITICAL",
      },
      {
        companyId: meridian.id, siteId: houston.id,
        name: "Cooling Water System (circulation pumps + tower)",
        assetType: "Cooling System", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Pump 1 vibration trending upward — bearing replacement scheduled. Water treatment chemical costs increasing due to high ambient temperatures.",
        installationYear: 2008, expectedUsefulLife: 20,
        currentEnergyKwh: 180000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: houston.id,
        name: "Emergency Generator (250 kVA Caterpillar)",
        assetType: "Generator", category: "energy",
        conditionRating: "GREEN",
        conditionNotes: "Monthly test runs satisfactory. Full load bank test (Dec 2024) — start time 8 sec, voltage regulation within 2%. Diesel tank inspected and compliant.",
        installationYear: 2015, expectedUsefulLife: 20,
        currentEnergyKwh: 5000, scope: 1,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },

      // ── Los Angeles Facility (3 assets) ────────────────────────────────────
      {
        companyId: meridian.id, siteId: losAngeles.id,
        name: "Delivery Van Fleet (×8 Diesel Ford Transit)",
        assetType: "Light Commercial Vehicles", category: "fleet",
        conditionRating: "AMBER",
        conditionNotes: "Average 28,000 miles/yr. Units 1-3 (2019) approaching end of life. CARB ZEV mandate requires EV replacements. Telematics installed on all vehicles.",
        installationYear: 2019, expectedUsefulLife: 6,
        currentEnergyKwh: null, scope: 1,
        linkedInterventionId: fleetElec.id,
        alertThresholdYears: 2, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: losAngeles.id,
        name: "Warehouse HVAC (×2 Mitsubishi Split Systems)",
        assetType: "Split System", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "Installed during 2021 warehouse expansion. R32 refrigerant — compliant with future regulations. Both units performing at rated SEER.",
        installationYear: 2021, expectedUsefulLife: 15,
        currentEnergyKwh: 280000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: losAngeles.id,
        name: "Dock Equipment & Powered Roller Conveyors",
        assetType: "Dock Equipment", category: "other",
        conditionRating: "AMBER",
        conditionNotes: "6 dock positions. Roller drives on positions 2 and 5 showing increased current draw. Seals on dock shelters 1, 3, 6 need replacement for energy efficiency.",
        installationYear: 2012, expectedUsefulLife: 15,
        currentEnergyKwh: 42000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },

      // ── Seattle Tech Centre (3 assets) ─────────────────────────────────────
      {
        companyId: meridian.id, siteId: seattle.id,
        name: "VRF Heat Pump System (Mitsubishi CITY MULTI)",
        assetType: "VRF System", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "Installed at construction. R410A refrigerant. All 8 indoor units performing well. Seattle's mild climate gives excellent COP (4.8 average). BMS integrated.",
        installationYear: 2015, expectedUsefulLife: 15,
        currentEnergyKwh: 240000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: seattle.id,
        name: "Server Room UPS (60 kVA APC Symmetra)",
        assetType: "UPS", category: "IT",
        conditionRating: "AMBER",
        conditionNotes: "Battery module 3 showing elevated temperature. Runtime at 82% of rated. Preventive battery replacement scheduled Q2 2025. Cooling system adequate.",
        installationYear: 2015, expectedUsefulLife: 10,
        currentEnergyKwh: 72000, scope: 2,
        alertThresholdYears: 2, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: seattle.id,
        name: "EV Charging Stations (×6 ChargePoint CT4000)",
        assetType: "EV Charger", category: "energy",
        conditionRating: "GREEN",
        conditionNotes: "Installed 2022 for employee EV adoption. Average utilisation 68%. All units operational — network connectivity 99.5% uptime. Level 2 (7.7 kW each).",
        installationYear: 2022, expectedUsefulLife: 10,
        currentEnergyKwh: 35000, scope: 2,
        alertThresholdYears: 2, replacementPriority: "LOW",
      },

      // ── Atlanta Distribution (4 assets) ────────────────────────────────────
      {
        companyId: meridian.id, siteId: atlanta.id,
        name: "Metal Halide High-Bay Lighting (180 fittings)",
        assetType: "High-Bay Lighting", category: "electrical",
        conditionRating: "RED",
        conditionNotes: "Original installation. 400W metal halide fittings — high energy use and poor lumen maintenance. 12 fittings failed in 2024. LED retrofit urgently needed.",
        installationYear: 2003, expectedUsefulLife: 15,
        currentEnergyKwh: 520000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: atlanta.id,
        name: "Rooftop HVAC Package Units (×4 Lennox)",
        assetType: "Rooftop Unit", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "R410A refrigerant. Units 1-2 approaching end of rated life (2003, 20-yr). Economisers on units 3-4 functioning well. Hot Georgia summers stress systems.",
        installationYear: 2008, expectedUsefulLife: 20,
        currentEnergyKwh: 720000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: atlanta.id,
        name: "Conveyor & Sortation System (Dematic)",
        assetType: "Conveyor System", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Installed 2019. Throughput 800k parcels/yr. Belt tracking and tension within spec. Drive VFDs upgraded to latest firmware Q3 2024.",
        installationYear: 2019, expectedUsefulLife: 15,
        currentEnergyKwh: 280000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: atlanta.id,
        name: "Dock Doors & Seals (×6 overhead sectional)",
        assetType: "Dock Equipment", category: "envelope",
        conditionRating: "AMBER",
        conditionNotes: "Spring mechanisms on doors 1, 4, 6 requiring increased maintenance. Rubber dock seals on positions 2, 3 are compressed and need replacement for thermal performance.",
        installationYear: 2003, expectedUsefulLife: 20,
        currentEnergyKwh: null, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },

      // ── Denver Regional Office (2 assets) ──────────────────────────────────
      {
        companyId: meridian.id, siteId: denver.id,
        name: "Gas Furnace HVAC System (Trane XR95)",
        assetType: "Furnace HVAC", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "95% AFUE rated but flame sensor issues causing intermittent shutdowns. Heat exchanger inspection due 2025. Denver altitude (5,280 ft) affects combustion efficiency.",
        installationYear: 2012, expectedUsefulLife: 18,
        currentEnergyKwh: 320000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: denver.id,
        name: "Office LED Lighting System (Philips)",
        assetType: "LED Lighting", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Installed during 2019 office refurbishment. Tunable white (3000-5000K) with occupancy sensing. All 120 panels operating — 3 drivers replaced under warranty.",
        installationYear: 2019, expectedUsefulLife: 15,
        currentEnergyKwh: 48000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },

      // ── Toronto Assembly Plant (5 assets) ──────────────────────────────────
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "Assembly Line Robots (×8 Fanuc M-20iD/25)",
        assetType: "Robotics", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "All 8 units on Fanuc ZDT predictive maintenance. Joint 2 reducer replaced on robot 5 (Q2 2024). Average cycle time within 0.3% of nominal.",
        installationYear: 2022, expectedUsefulLife: 12,
        currentEnergyKwh: 1200000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "Industrial Gas Boiler (1.2 MW Cleaver-Brooks)",
        assetType: "Industrial Boiler", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Efficiency at 79% (rated 86%). Firetube showing minor pitting at last TSSA inspection. Burner tuning completed Q4 2024. Heat pump replacement planned.",
        installationYear: 2007, expectedUsefulLife: 25,
        currentEnergyKwh: 4100000, scope: 1,
        linkedInterventionId: heatPumpToronto.id,
        alertThresholdYears: 4, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "Air Compressor (120 kW Kaeser CSD 122)",
        assetType: "Compressor", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Sigma frequency VSD controller showing intermittent faults. Running at fixed speed pending parts (ETA Q1 2025). Energy penalty estimated at 15%.",
        installationYear: 2015, expectedUsefulLife: 15,
        currentEnergyKwh: 680000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "Paint Line with Curing Oven (gas-fired)",
        assetType: "Paint Line", category: "other",
        conditionRating: "AMBER",
        conditionNotes: "Oven insulation thinning — surface temperature 15°C above expected. Conveyor chain stretch measured at 1.2% (replacement at 2%). VOC abatement system compliant.",
        installationYear: 2010, expectedUsefulLife: 20,
        currentEnergyKwh: 1800000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: toronto.id,
        name: "High-Voltage Transformer (2 MVA, 27.6kV/600V)",
        assetType: "Transformer", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Oil analysis (Oct 2024) all parameters within limits. Winding resistance balanced. Tap changer serviced Q3 2024. Outdoor installation in good condition.",
        installationYear: 2018, expectedUsefulLife: 35,
        currentEnergyKwh: null, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },

      // ── Vancouver Logistics (3 assets) ─────────────────────────────────────
      {
        companyId: meridian.id, siteId: vancouver.id,
        name: "Ground-Source Heat Pump (150 kW NIBE F1345)",
        assetType: "Heat Pump", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "Installed 2019 as primary heating/cooling. COP averaging 4.6 (heating) and 5.8 (cooling). Ground loop temperatures stable. BC Hydro monitoring confirms performance.",
        installationYear: 2019, expectedUsefulLife: 20,
        currentEnergyKwh: 420000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: vancouver.id,
        name: "Walk-in Refrigeration Unit (Hussman)",
        assetType: "Refrigeration", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "R404A refrigerant — high GWP (3,922). Compressor showing reduced capacity in summer months. Condensate drain heating element failed twice in 2024.",
        installationYear: 2012, expectedUsefulLife: 15,
        currentEnergyKwh: 185000, scope: 2,
        linkedInterventionId: refrigerant.id,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: vancouver.id,
        name: "Electric Forklift Fleet (×3 Toyota 8FBMT25)",
        assetType: "Electric Forklift", category: "fleet",
        conditionRating: "GREEN",
        conditionNotes: "Lithium-ion battery upgrade completed 2023 (replaced lead-acid). Fast-charge capable — full charge in 1.5 hours. All units within service intervals.",
        installationYear: 2018, expectedUsefulLife: 10,
        currentEnergyKwh: 28000, scope: 2,
        alertThresholdYears: 2, replacementPriority: "LOW",
      },

      // ── Calgary Processing Facility (4 assets) ─────────────────────────────
      {
        companyId: meridian.id, siteId: calgary.id,
        name: "Processing Furnace (Natural Gas, 800 kW)",
        assetType: "Furnace", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Operating at 81% thermal efficiency (rated 88%). Refractory inspection (Jul 2024) shows minor spalling in zones 2-3. Annual NOx testing compliant with AER limits.",
        installationYear: 2008, expectedUsefulLife: 22,
        currentEnergyKwh: 2100000, scope: 1,
        alertThresholdYears: 3, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: calgary.id,
        name: "Air Compressor (55 kW Atlas Copco GA55)",
        assetType: "Compressor", category: "HVAC",
        conditionRating: "GREEN",
        conditionNotes: "VSD equipped. Running at 55% average load. Air-end service completed at 20,000 hours (Q3 2024). Leak survey shows 11% loss rate — acceptable.",
        installationYear: 2018, expectedUsefulLife: 15,
        currentEnergyKwh: 290000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: calgary.id,
        name: "Overhead Bridge Crane (5t Konecranes CXT)",
        assetType: "Crane", category: "electrical",
        conditionRating: "AMBER",
        conditionNotes: "Wire rope showing surface corrosion — replacement scheduled Q1 2025. Hoist brake adjusted Q4 2024. Runway rails within alignment tolerance.",
        installationYear: 2010, expectedUsefulLife: 25,
        currentEnergyKwh: 22000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "MEDIUM",
      },
      {
        companyId: meridian.id, siteId: calgary.id,
        name: "Building Lighting (T8 Fluorescent, 120 fittings)",
        assetType: "Fluorescent Lighting", category: "electrical",
        conditionRating: "RED",
        conditionNotes: "Original T8 fittings. 18 ballasts failed in 2024. Lumen depreciation severe — measured at 55% of rated output. LED retrofit included in Warsaw Thermal package scope extension.",
        installationYear: 1996, expectedUsefulLife: 15,
        currentEnergyKwh: 185000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "HIGH",
      },

      // ── Warsaw European Hub (4 assets) ─────────────────────────────────────
      {
        companyId: meridian.id, siteId: warsaw.id,
        name: "Industrial Boiler (800 kW Viessmann Vitoplex)",
        assetType: "Industrial Boiler", category: "HVAC",
        conditionRating: "AMBER",
        conditionNotes: "Efficiency at 82% (rated 90%). Condensate return system partially blocked. Water treatment regime needs review. Replacement aligned with thermal envelope upgrade.",
        installationYear: 2010, expectedUsefulLife: 20,
        currentEnergyKwh: 2400000, scope: 1,
        linkedInterventionId: warsawThermal.id,
        alertThresholdYears: 4, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: warsaw.id,
        name: "CNC Machining Centres (×2 DMG MORI CLX 450)",
        assetType: "CNC Machine", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Installed 2020 with EU structural funds. Both units on DMG MORI WERKBLiQ digital maintenance platform. Spindle hours 14k and 16k respectively.",
        installationYear: 2020, expectedUsefulLife: 15,
        currentEnergyKwh: 680000, scope: 2,
        alertThresholdYears: 3, replacementPriority: "LOW",
      },
      {
        companyId: meridian.id, siteId: warsaw.id,
        name: "Industrial Lighting (High-Pressure Sodium, 150 fittings)",
        assetType: "HPS Lighting", category: "electrical",
        conditionRating: "RED",
        conditionNotes: "Original HPS fittings from 2007 build. Poor colour rendering (CRI 25) affects quality inspection. 22 fittings failed in 2024. LED retrofit critical — included in thermal upgrade.",
        installationYear: 2007, expectedUsefulLife: 12,
        currentEnergyKwh: 410000, scope: 2,
        alertThresholdYears: 5, replacementPriority: "HIGH",
      },
      {
        companyId: meridian.id, siteId: warsaw.id,
        name: "Step-Down Transformer (630 kVA, 15kV/400V)",
        assetType: "Transformer", category: "electrical",
        conditionRating: "GREEN",
        conditionNotes: "Oil-immersed dry-type. Thermographic survey (Nov 2024) clear. All bushings and connections within spec. Load factor averaging 62%.",
        installationYear: 2007, expectedUsefulLife: 30,
        currentEnergyKwh: null, scope: 2,
        alertThresholdYears: 5, replacementPriority: "LOW",
      },
    ],
  });
  console.log(`✅  Assets (56) created across 14 sites`);

  // ── Actual Emissions ──────────────────────────────────────────────────────
  await db.actualEmission.createMany({
    data: [
      { companyId: meridian.id, year: 2022, scope1: 15500, scope2: 12500, scope3: 17000, notes: "Baseline year — verified by EY (Limited Assurance). GHG Protocol Corporate Standard." },
      { companyId: meridian.id, year: 2023, scope1: 15100, scope2: 11700, scope3: 16700, notes: "LED upgrade at Sheffield complete mid-year. Natural gas reduction from BMS pilot." },
      { companyId: meridian.id, year: 2024, scope1: 14600, scope2: 10400, scope3: 16400, notes: "Solar PV at Sheffield online Q2. Compressed air savings delivering. Supply chain engagement pilot started." },
      { companyId: meridian.id, year: 2025, scope1: 14100, scope2: 9200, scope3: 16100, notes: "Heat pump installation progressing. UK PPA contracted. Warsaw thermal envelope Phase 1 underway." },
    ],
  });
  console.log(`✅  Actual emissions: 2022, 2023, 2024, 2025`);

  // ── Energy Readings (5 sites × 2024, Sheffield 2023+2024) ─────────────────
  const energyReadings: Array<{
    companyId: string; siteId: string; year: number; month: number;
    energyType: string; kWh: number; cost: number;
  }> = [];

  for (let month = 1; month <= 12; month++) {
    // Sheffield 2023 — Electricity + Gas
    energyReadings.push(
      { companyId: meridian.id, siteId: sheffield.id, year: 2023, month, energyType: "ELECTRICITY", kWh: 195000 + Math.round(Math.random() * 25000), cost: 40000 + Math.round(Math.random() * 6000) },
      { companyId: meridian.id, siteId: sheffield.id, year: 2023, month, energyType: "GAS", kWh: 450000 + Math.round(Math.random() * 50000), cost: 16500 + Math.round(Math.random() * 2500) },
    );
    // Sheffield 2024 — Electricity + Gas (lower post-solar)
    energyReadings.push(
      { companyId: meridian.id, siteId: sheffield.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 165000 + Math.round(Math.random() * 22000), cost: 34000 + Math.round(Math.random() * 5000) },
      { companyId: meridian.id, siteId: sheffield.id, year: 2024, month, energyType: "GAS", kWh: 410000 + Math.round(Math.random() * 40000), cost: 15000 + Math.round(Math.random() * 2000) },
    );
    // Manchester 2024 — Electricity + Diesel
    energyReadings.push(
      { companyId: meridian.id, siteId: manchester.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 98000 + Math.round(Math.random() * 16000), cost: 20000 + Math.round(Math.random() * 3500) },
      { companyId: meridian.id, siteId: manchester.id, year: 2024, month, energyType: "DIESEL", kWh: 88000 + Math.round(Math.random() * 12000), cost: 12500 + Math.round(Math.random() * 2000) },
    );
    // Chicago 2024 — Electricity + Gas
    energyReadings.push(
      { companyId: meridian.id, siteId: chicago.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 145000 + Math.round(Math.random() * 20000), cost: 17500 + Math.round(Math.random() * 2500) },
      { companyId: meridian.id, siteId: chicago.id, year: 2024, month, energyType: "GAS", kWh: 280000 + Math.round(Math.random() * 35000), cost: 8400 + Math.round(Math.random() * 1500) },
    );
    // Toronto 2024 — Electricity + Gas
    energyReadings.push(
      { companyId: meridian.id, siteId: toronto.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 160000 + Math.round(Math.random() * 22000), cost: 14500 + Math.round(Math.random() * 2000) },
      { companyId: meridian.id, siteId: toronto.id, year: 2024, month, energyType: "GAS", kWh: 340000 + Math.round(Math.random() * 45000), cost: 10200 + Math.round(Math.random() * 1800) },
    );
    // Warsaw 2024 — Electricity + District Heating
    energyReadings.push(
      { companyId: meridian.id, siteId: warsaw.id, year: 2024, month, energyType: "ELECTRICITY", kWh: 110000 + Math.round(Math.random() * 18000), cost: 11000 + Math.round(Math.random() * 2000) },
      { companyId: meridian.id, siteId: warsaw.id, year: 2024, month, energyType: "DISTRICT_HEAT", kWh: 180000 + Math.round(Math.random() * 30000), cost: 7200 + Math.round(Math.random() * 1200) },
    );
  }
  await db.energyReading.createMany({ data: energyReadings });
  console.log(`✅  Energy readings: Sheffield (2023-2024) + Manchester, Chicago, Toronto, Warsaw (2024)`);

  // ── Emission Factors ──────────────────────────────────────────────────────
  await db.companyEmissionFactor.createMany({
    data: [
      { companyId: meridian.id, region: "UK", fuelType: "Electricity", value: 0.207, source: "DEFRA 2022 Conversion Factors", year: 2022 },
      { companyId: meridian.id, region: "UK", fuelType: "Natural Gas", value: 0.184, source: "DEFRA 2022 Conversion Factors", year: 2022 },
      { companyId: meridian.id, region: "UK", fuelType: "Diesel", value: 2.556, source: "DEFRA 2022 Conversion Factors (per litre)", year: 2022 },
      { companyId: meridian.id, region: "US", fuelType: "Electricity", value: 0.386, source: "EPA eGRID 2022 (national average)", year: 2022 },
      { companyId: meridian.id, region: "Canada", fuelType: "Electricity", value: 0.120, source: "NIR 2022 (national average)", year: 2022 },
      { companyId: meridian.id, region: "Poland", fuelType: "Electricity", value: 0.773, source: "KOBiZE 2022", year: 2022 },
    ],
  });
  console.log(`✅  Emission factors: 6 (UK electricity/gas/diesel, US/Canada/Poland electricity)`);

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
    data: { companyId: apex.id, name: "Apex Composites — Coventry", address: "Middlemarch Business Park, Coventry, CV3 4FJ", city: "Coventry", region: "West Midlands", country: "United Kingdom", latitude: 52.3777, longitude: -1.4984, siteType: "manufacturing", grossFloorAreaM2: 4800, yearBuilt: 2002, siteManager: "David Walsh" },
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
Meridian Forge baseline: 45,000 tCO₂e (2022)
  Scope 1: 15,500 tCO₂e | Scope 2: 12,500 tCO₂e | Scope 3: 17,000 tCO₂e
Sites: 14 (4 UK, 6 US, 3 Canada, 1 Poland)
Interventions: 15 (across sites + company-wide)
Scenarios: 3 (Ambitious 2040 / Moderate 2045 / Conservative 2050)
  Each with 15 interventions; all ScenarioIntervention records have technicalAssetLife
Assets: 56 across all 14 sites
  Condition: 5× RED, 25× AMBER, 26× GREEN
  Priority: 3× CRITICAL, 10× HIGH, 23× MEDIUM, 20× LOW
Actual emissions: 2022–2025
Energy readings: 6 sites (Sheffield 2023-2024, Manchester/Chicago/Toronto/Warsaw 2024)
Emission factors: 6 (UK, US, Canada, Poland)
Growth rates: 1.5% (2023-2028), 0.8% (2029-2038), 0% (2039-2050)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
