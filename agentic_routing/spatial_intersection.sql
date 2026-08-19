-- ==============================================================================
-- BRICS-AETHER: Agentic Spatial Intersection & Primary Owner Election Engine
-- File: agentic_routing/spatial_intersection.sql
-- Engine: Google Cloud BigQuery GIS (Standard SQL)
-- 
-- Description:
--   1. Spatial Intersection (ST_INTERSECTS) between predicted atmospheric plume
--      polygons (from PINN / Sentinel-5P H3 Res 8) and administrative boundaries (FAO GAUL L0-L2).
--   2. Primary Owner Election using maximum spatial impact:
--        Primary Jurisdiction = argmax( ST_AREA(ST_INTERSECTION(plume_geom, gaul_l2_geom)) * pop_density )
--   3. RACI Hierarchy & Sovereign Level Determination (Level 1 to Level 5 BEDC).
--   4. Immutable Evidence Bundle Generation (SHA-256 string at T0).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Step 1: Materialized View of Plume Geometries with Meteorological Vectors
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `brics-aether.mart.plume_spatial_features` AS
SELECT
  p.plume_id,
  p.h3_res8,
  p.lat,
  p.lon,
  p.sample_time,
  p.no2_column,
  p.pm25,
  p.pm10,
  p.cams_no2,
  p.u10,
  p.v10,
  p.pblh,
  -- Reconstruct precise plume polygon from H3 cell boundary or 400m buffer
  COALESCE(
    p.plume_polygon,
    ST_BUFFER(ST_GEOGPOINT(p.lon, p.lat), 450)
  ) AS plume_geom,
  -- Wind dispersion vector magnitude and bearing
  SQRT(POW(COALESCE(p.u10, 0), 2) + POW(COALESCE(p.v10, 0), 2)) AS wind_speed_ms,
  MOD(ATAN2(COALESCE(p.u10, 0), COALESCE(p.v10, 0)) * 180 / 3.141592653589793 + 360, 360) AS wind_direction_deg
FROM `brics-aether.mart.plumes` p
WHERE p.sample_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
  AND (p.pm25 >= 60 OR p.no2_column >= 2.0e15);

-- ------------------------------------------------------------------------------
-- Step 2: GAUL Boundary Spatial Intersection & Impact Area Computation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `brics-aether.mart.plume_gaul_intersections` AS
SELECT
  p.plume_id,
  p.h3_res8,
  p.sample_time AS t0_timestamp,
  p.pm25,
  p.no2_column,
  p.wind_speed_ms,
  p.wind_direction_deg,
  p.u10, p.v10, p.pblh,
  -- Administrative identification (FAO GAUL Level 0, 1, 2)
  g.ADM0_CODE AS gaul_l0_code,
  g.ADM0_NAME AS country_name,
  g.ADM1_CODE AS gaul_l1_code,
  g.ADM1_NAME AS state_province_name,
  g.ADM2_CODE AS gaul_l2_code,
  g.ADM2_NAME AS district_municipality_name,
  
  -- Spatial metrics (in square meters)
  ST_AREA(p.plume_geom) AS plume_total_area_sqm,
  ST_AREA(g.geom) AS district_total_area_sqm,
  ST_AREA(ST_INTERSECTION(p.plume_geom, g.geom)) AS intersection_area_sqm,
  
  -- Population density lookup from gridded population dataset (fallback: 850 people/km² = 0.00085/m²)
  COALESCE(pop.pop_density_per_sqm, 0.00085) AS pop_density_sqm,
  
  -- Core Impact Metric: Area × Population Density
  ST_AREA(ST_INTERSECTION(p.plume_geom, g.geom)) * COALESCE(pop.pop_density_per_sqm, 0.00085) AS impact_score,
  
  -- Sovereign Geometries
  ST_INTERSECTION(p.plume_geom, g.geom) AS intersected_polygon,
  p.plume_geom AS full_plume_polygon,
  g.geom AS gaul_district_boundary
FROM `brics-aether.mart.plume_spatial_features` p
JOIN `bigquery-public-data.fao_gaul.gaul_2015_level2` g
  ON ST_INTERSECTS(p.plume_geom, g.geom)
LEFT JOIN `brics-aether.raw.pop_density_h3` pop
  ON pop.h3_res8 = p.h3_res8;

-- ------------------------------------------------------------------------------
-- Step 3: Primary Owner Election Algorithm
-- ------------------------------------------------------------------------------
-- Primary Owner = argmax( ST_AREA(ST_INTERSECTION) * pop_density )
-- Rank 1 = Primary Authority (Responsible / Actionable)
-- Rank > 1 = Affected Neighboring Jurisdictions (Consulted / Informed)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `brics-aether.mart.primary_owner_election` AS
WITH ranked_intersections AS (
  SELECT
    *,
    -- Attribution fraction of total plume footprint
    SAFE_DIVIDE(intersection_area_sqm, SUM(intersection_area_sqm) OVER (PARTITION BY plume_id)) AS attribution_fraction,
    -- Rank within plume footprint
    ROW_NUMBER() OVER (
      PARTITION BY plume_id 
      ORDER BY impact_score DESC, intersection_area_sqm DESC
    ) AS jurisdiction_rank,
    -- Total distinct jurisdictions intersected
    COUNT(1) OVER (PARTITION BY plume_id) AS total_intersected_districts,
    COUNT(DISTINCT gaul_l1_code) OVER (PARTITION BY plume_id) AS total_intersected_states,
    COUNT(DISTINCT gaul_l0_code) OVER (PARTITION BY plume_id) AS total_intersected_nations
  FROM `brics-aether.mart.plume_gaul_intersections`
)
SELECT
  plume_id,
  h3_res8,
  t0_timestamp,
  pm25,
  no2_column,
  wind_speed_ms,
  wind_direction_deg,
  u10, v10, pblh,
  gaul_l0_code, country_name,
  gaul_l1_code, state_province_name,
  gaul_l2_code, district_municipality_name,
  intersection_area_sqm,
  impact_score,
  attribution_fraction,
  jurisdiction_rank,
  IF(jurisdiction_rank = 1, TRUE, FALSE) AS is_primary_owner,
  
  -- Multi-Sovereignty Escalation Level (1 to 5):
  --   Level 1: Intra-district (Single district intersected)
  --   Level 2: Inter-district within same state
  --   Level 3: Inter-state within same country
  --   Level 4: Transboundary Bilateral (2 sovereign nations)
  --   Level 5: Transboundary Multilateral (>= 3 nations or complex transboundary)
  CASE
    WHEN total_intersected_nations >= 3 THEN 5
    WHEN total_intersected_nations = 2 THEN 4
    WHEN total_intersected_states > 1 THEN 3
    WHEN total_intersected_districts > 1 THEN 2
    ELSE 1
  END AS dispute_escalation_level,

  -- RACI Escalation Tier and Clock SLA
  CASE
    WHEN total_intersected_nations >= 3 THEN 'Level 5 (BEDC Council — 48h SLA)'
    WHEN total_intersected_nations = 2 THEN 'Level 4 (Bilateral Commission — 72h SLA)'
    WHEN total_intersected_states > 1 THEN 'Level 3 (Federal MoEFCC — 24h SLA)'
    WHEN total_intersected_districts > 1 THEN 'Level 2 (State Pollution Board — 24h SLA)'
    ELSE 'Level 1 (District Magistrate — 6h SLA)'
  END AS raci_tier_label,

  -- Standard SLA Hours
  CASE
    WHEN total_intersected_nations >= 3 THEN 48
    WHEN total_intersected_nations = 2 THEN 72
    WHEN total_intersected_states > 1 THEN 24
    WHEN total_intersected_districts > 1 THEN 24
    ELSE 6
  END AS sla_hours,

  intersected_polygon,
  full_plume_polygon
FROM ranked_intersections;

-- ------------------------------------------------------------------------------
-- Step 4: Immutable T0 Evidence Bundle for Cryptographic Anchoring
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW `brics-aether.mart.evidence_packages_t0` AS
SELECT
  p.plume_id,
  p.h3_res8,
  p.t0_timestamp,
  p.country_name,
  p.state_province_name,
  p.district_municipality_name AS primary_district,
  p.pm25,
  p.no2_column,
  p.wind_speed_ms,
  p.wind_direction_deg,
  p.dispute_escalation_level,
  p.raci_tier_label,
  p.sla_hours,
  TIMESTAMP_ADD(p.t0_timestamp, INTERVAL p.sla_hours HOUR) AS sla_deadline,
  
  -- Deterministic string package for SHA-256 hashing
  FORMAT(
    'AETHER_T0|PLUME:%s|H3:%s|TS:%s|PM25:%.1f|NO2:%.2e|WIND_SPD:%.1f|WIND_DEG:%.1f|PRIMARY:%s,%s,%s|LEVEL:%d|SLA_HRS:%d',
    p.plume_id,
    p.h3_res8,
    CAST(p.t0_timestamp AS STRING),
    p.pm25,
    p.no2_column,
    p.wind_speed_ms,
    p.wind_direction_deg,
    p.district_municipality_name,
    p.state_province_name,
    p.country_name,
    p.dispute_escalation_level,
    p.sla_hours
  ) AS evidence_bundle_string,

  -- BigQuery Native SHA-256 Hash
  TO_HEX(SHA256(
    FORMAT(
      'AETHER_T0|PLUME:%s|H3:%s|TS:%s|PM25:%.1f|NO2:%.2e|WIND_SPD:%.1f|WIND_DEG:%.1f|PRIMARY:%s,%s,%s|LEVEL:%d|SLA_HRS:%d',
      p.plume_id,
      p.h3_res8,
      CAST(p.t0_timestamp AS STRING),
      p.pm25,
      p.no2_column,
      p.wind_speed_ms,
      p.wind_direction_deg,
      p.district_municipality_name,
      p.state_province_name,
      p.country_name,
      p.dispute_escalation_level,
      p.sla_hours
    )
  )) AS evidence_sha256_hash,

  -- GeoJSON payload for downstream agents and TEE enclave audits
  ST_ASGEOJSON(p.full_plume_polygon) AS plume_geojson
FROM `brics-aether.mart.primary_owner_election` p
WHERE p.is_primary_owner = TRUE;
