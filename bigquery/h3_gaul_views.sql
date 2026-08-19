-- BRICS-AETHER — BigQuery GIS: H3 Res 8 + GAUL L2 Dispatch
-- Run in BigQuery console (project: brics-aether) after ingestion
-- Creates materialized views and the core ST_INTERSECTS dispatch query

-- 1. Ensure H3 functions (BigQuery native H3 via `H3` UDF or via `h3` library in Python; here we store h3_res8 from ingestion)
-- No DDL needed for H3 if ingested as STRING (see ingestion scripts). For native:
-- CREATE FUNCTION `brics-aether.raw.h3_from_geog`(geo GEOGRAPHY, res INT64) AS ( ... );

-- 2. Plumes materialized view (from raw.s5p + raw.cams + citizen)
-- This is the core plume polygon table that the map and dispatch query use
CREATE OR REPLACE MATERIALIZED VIEW `brics-aether.mart.plumes` AS
SELECT
  FORMAT('%s_%s', CAST(s.sample_time AS STRING), s.h3_res8) AS plume_id,
  s.h3_res8,
  s.lat, s.lon,
  s.no2_column,
  c.pm25, c.pm10, c.no2 AS cams_no2,
  e.u10, e.v10, e.pblh,
  s.sample_time AS forecast_timestamp,
  -- Predicted plume polygon: H3 cell → GEOGRAPHY polygon
  -- Requires h3_to_geog UDF or precomputed via Python; here we use ST_GEOGFROMTEXT on H3 boundary if available
  -- For demo, buffer point by 400m (≈ H3 Res 8)
  ST_BUFFER(ST_GEOGPOINT(s.lon, s.lat), 400) AS plume_polygon,
  -- Simple anomaly: z-score vs 30-day rolling (update via scheduled query)
  (s.no2_column - AVG(s.no2_column) OVER (PARTITION BY s.h3_res8 ORDER BY s.sample_time ROWS BETWEEN 30 PRECEDING AND CURRENT ROW))
    / NULLIF(STDDEV(s.no2_column) OVER (PARTITION BY s.h3_res8 ORDER BY s.sample_time ROWS BETWEEN 30 PRECEDING AND CURRENT ROW), 0) AS no2_z,
  s.sample_time AS valid_time
FROM `brics-aether.raw.s5p` s
LEFT JOIN `brics-aether.raw.cams` c
  ON c.h3_res8 = s.h3_res8 AND c.forecast_time = s.sample_time
LEFT JOIN `brics-aether.raw.era5` e
  ON e.h3_res8 = s.h3_res8 AND e.time = s.sample_time
WHERE s.qa_value >= 0.75;

-- 3. H3 Res 8 materialized view (for dashboard: one row per H3, latest)
CREATE OR REPLACE MATERIALIZED VIEW `brics-aether.mart.h3_latest` AS
SELECT
  h3_res8,
  ST_CENTROID_AGG(ST_GEOGPOINT(lon, lat)) AS centroid,
  ANY_VALUE(plume_polygon) AS plume_polygon,
  MAX(sample_time) AS last_seen,
  AVG(no2_column) AS avg_no2,
  MAX(pm25) AS max_pm25
FROM `brics-aether.mart.plumes`
GROUP BY h3_res8;

-- 4. CORE DISPATCH QUERY — ST_INTERSECTS plume polygon with FAO GAUL L2
-- This is what Cloud Function calls at T0 to elect Primary Owner and Tier 1/2/3
-- Uses BigQuery public GAUL (update to your pinned copy: `brics-aether.raw.gaul_2015_level2`)
CREATE OR REPLACE VIEW `brics-aether.mart.dispatch_candidates` AS
SELECT
  g.ADM0_NAME AS target_country,
  g.ADM1_NAME AS target_state_province,
  g.ADM2_NAME AS target_district_municipality,
  g.ADM0_CODE, g.ADM1_CODE, g.ADM2_CODE,
  p.plume_id,
  p.h3_res8,
  p.max_pm25 AS predicted_pm25_max,
  p.avg_no2 AS predicted_no2_max,
  -- Simple trajectory vector from ERA5 u/v (for dossier)
  STRUCT(e.u10 AS u, e.v10 AS v) AS trajectory_vector,
  -- Intersection area × pop density for Primary Owner election
  ST_AREA(ST_INTERSECTION(p.plume_polygon, g.geom)) AS intersect_area,
  -- GAUL geom is in `bigquery-public-data.fao_gaul.gaul_2015_level2` (GEOGRAPHY)
  p.forecast_timestamp,
  p.plume_polygon,
  g.geom
FROM `brics-aether.mart.plumes` p
JOIN `bigquery-public-data.fao_gaul.gaul_2015_level2` g
  ON ST_INTERSECTS(p.plume_polygon, g.geom)
LEFT JOIN `brics-aether.raw.era5` e
  ON e.h3_res8 = p.h3_res8 AND e.time = p.forecast_timestamp
WHERE p.forecast_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 HOUR)
  AND p.max_pm25 > 75;  -- threshold for dispatch

-- 5. Primary Owner election (one row per plume)
CREATE OR REPLACE VIEW `brics-aether.mart.primary_owner` AS
SELECT * EXCEPT(rn) FROM (
  SELECT
    plume_id,
    target_country, target_state_province, target_district_municipality,
    ADM0_CODE, ADM1_CODE, ADM2_CODE,
    predicted_pm25_max,
    trajectory_vector,
    -- Pop density join (add your pop table: `brics-aether.raw.pop_density_h3`)
    intersect_area * COALESCE(pop.pop_density, 1000) AS area_x_pop,
    ROW_NUMBER() OVER (PARTITION BY plume_id ORDER BY intersect_area * COALESCE(pop.pop_density, 1000) DESC) AS rn
  FROM `brics-aether.mart.dispatch_candidates`
  LEFT JOIN `brics-aether.raw.pop_density_h3` pop USING (h3_res8)
)
WHERE rn = 1;

-- 6. Full dispatch with RACI (join to your jurisdictions table)
-- `brics-aether.raw.jurisdictions` is your 220-row RACI (nation, state, district, geofence POLYGON, office, tier2, tier3, sla_minutes, lang)
CREATE OR REPLACE VIEW `brics-aether.mart.dispatch` AS
SELECT
  p.plume_id,
  p.h3_res8,
  p.plume_polygon,
  p.predicted_pm25_max,
  p.target_country, p.target_state_province, p.target_district_municipality,
  j.office AS tier1_office,
  j.tier2_email, j.tier3_email,
  j.sla_minutes,
  j.lang,
  -- Primary vs CC
  CASE WHEN j.district = po.target_district_municipality THEN 'PRIMARY' ELSE 'CC' END AS role,
  p.forecast_timestamp
FROM `brics-aether.mart.dispatch_candidates` p
JOIN `brics-aether.raw.jurisdictions` j
  ON j.district = p.target_district_municipality
  AND j.state = p.target_state_province
JOIN `brics-aether.mart.primary_owner` po
  ON po.plume_id = p.plume_id;

-- 7. Example: Cloud Function can now
-- SELECT tier1_office, tier2_email, tier3_email, sla_minutes, lang
-- FROM `brics-aether.mart.dispatch`
-- WHERE plume_id = @plume_id;

-- 8. Scheduled refresh (every 15 min) for materialized views
-- BigQuery → Scheduled queries → Create:
-- CALL BQ.REFRESH_MATERIALIZED_VIEW('brics-aether.mart.plumes');
-- CALL BQ.REFRESH_MATERIALIZED_VIEW('brics-aether.mart.h3_latest');

-- 9. H3 Res 8 note: ingestion scripts already compute h3_res8 as STRING via h3-py.
-- If you prefer native BigQuery H3, use: H3.H3_FROMGEOGPOINT(ST_GEOGPOINT(lon, lat), 8)
