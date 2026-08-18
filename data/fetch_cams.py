"""
Fetch CAMS Global Atmospheric Composition Forecasts from Copernicus ADS
Docs: https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts?tab=download
Requires: pip install cdsapi xarray netcdf4 google-cloud-bigquery
Setup: create ~/.cdsapirc with your ADS API key (see CDS website)
"""
import cdsapi, xarray as xr, pathlib

def fetch(bbox=(68,6,97,37), days="2026-08-10/2026-08-17"):
    c = cdsapi.Client()
    out = pathlib.Path("cams.nc")
    print("Requesting CAMS... this can queue 5-20 min on ADS")
    c.retrieve("cams-global-atmospheric-composition-forecasts", {
        "variable": ["particulate_matter_2.5um","particulate_matter_10um","nitrogen_dioxide","sulphur_dioxide","carbon_monoxide","ozone"],
        "date": days,
        "time": "00:00",
        "leadtime_hour": [str(i) for i in range(0, 121, 3)],
        "type": "forecast",
        "format": "netcdf",
        "area": [bbox[3], bbox[0], bbox[1], bbox[2]], # N,W,S,E
    }, str(out))
    ds = xr.open_dataset(out)
    print(ds)
    # quick to parquet for BigQuery
    df = ds.to_dataframe().reset_index().dropna()
    df.to_parquet("cams.parquet", index=False)
    print(f"Saved cams.parquet with {len(df)} rows. Load to BigQuery: bq load --source_format=PARQUET vayu.cams_forecast cams.parquet")

if __name__ == "__main__":
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument("--days", default="2026-08-10/2026-08-17")
    p.add_argument("--bbox", nargs=4, type=float, default=(68,6,97,37), help="W S E N")
    args=p.parse_args()
    fetch(bbox=args.bbox, days=args.days)
