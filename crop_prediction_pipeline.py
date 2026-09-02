"""
Crop Prediction Pipeline
-------------------------
Takes a farmer's district (+ optional season) and produces a ranked crop
recommendation. This is the code behind "Fetch Required Data -> Data
Preprocessing -> Random Forest/Extra Trees Model -> Crop Prediction" in the
app workflow.

Data sources combined:
  1. district_feature_lookup.csv   - soil averages (N, P, K, pH) + overall
                                      weather averages, per district
  2. district_season_weather.csv   - season-specific avg temp & rainfall
  3. district_coordinates.csv      - lat/long per district, for the live
                                      weather API call
  4. Live weather API              - current humidity (+ optionally current
                                      temperature), fetched at request time
  5. best_crop_model.joblib +
     label_encoder.joblib          - the trained Extra Trees classifier

Usage:
    from crop_prediction_pipeline import recommend_crop

    result = recommend_crop(district="Mysuru", season="Monsoon", api_key=None)
    print(result)
"""

import pandas as pd
import numpy as np
import joblib
import requests

DATA_DIR = "."  # adjust if your CSVs/joblib files live elsewhere
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# District names that don't match exactly between Soil_data.csv and
# historical_weather.csv (older/newer official spellings).
DISTRICT_ALIASES = {
    "Bagalkote": "Bagalakote",
    "Bengaluru Rural": "Bangalore Rural",
    "Bengaluru Urban": "Bengaluru urban",
    "Bijapur": "Vijayapura",
    "Davangere": "Davanagere",
}


class CropPredictionPipeline:
    def __init__(self, data_dir: str = DATA_DIR):
        self.district_lookup = pd.read_csv(f"{data_dir}/district_feature_lookup.csv").set_index("district")
        self.season_weather = pd.read_csv(f"{data_dir}/district_season_weather.csv")
        self.coordinates = pd.read_csv(f"{data_dir}/district_coordinates.csv").set_index("district")
        self.model = joblib.load(f"{data_dir}/best_crop_model.joblib")
        self.label_encoder = joblib.load(f"{data_dir}/label_encoder.joblib")

    # ---------- Step 1: resolve district name ----------
    def _normalize_district(self, district: str) -> str:
        return DISTRICT_ALIASES.get(district, district)

    def is_supported(self, district: str) -> bool:
        return self._normalize_district(district) in self.district_lookup.index

    # ---------- Step 2: soil + historical weather lookup ----------
    def get_soil_and_climate(self, district: str, season: str = None) -> dict:
        d = self._normalize_district(district)
        if d not in self.district_lookup.index:
            raise ValueError(
                f"'{district}' is not currently supported (no matching soil+weather data). "
                f"Supported districts: {sorted(self.district_lookup.index)}"
            )

        row = self.district_lookup.loc[d]
        values = {"N": row["N"], "P": row["P"], "K": row["K"], "ph": row["ph"]}

        # Prefer season-specific rainfall/temperature if available, else fall back
        # to the district's overall average.
        if season is not None:
            season_row = self.season_weather[
                (self.season_weather["district"] == d) & (self.season_weather["season"] == season)
            ]
            if not season_row.empty:
                values["temperature"] = float(season_row["temperature"].iloc[0])
                values["rainfall"] = float(season_row["rainfall"].iloc[0])
                return values

        values["temperature"] = row["temperature"]
        values["rainfall"] = row["rainfall"] if not pd.isna(row["rainfall"]) else 0.0
        return values

    # ---------- Step 3: live weather API for humidity ----------
    def fetch_live_weather(self, district: str, api_key: str = None) -> dict:
        """
        Fetches current humidity (and temperature) from a live weather API.
        Uses OpenWeatherMap's current-weather endpoint as an example -- swap
        in whatever provider you choose.

        Falls back to the district's historical average if no api_key is
        given or the request fails, so the pipeline never breaks the app.
        """
        d = self._normalize_district(district)
        lat, lon = self.coordinates.loc[d, ["latitude", "longitude"]]

        if api_key:
            try:
                resp = requests.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
                    timeout=5,
                )
                resp.raise_for_status()
                data = resp.json()
                return {
                    "humidity": data["main"]["humidity"],
                    "temperature": data["main"]["temp"],
                    "source": "live_api",
                }
            except Exception as e:
                print(f"[warning] Live weather API call failed ({e}); falling back to historical average.")

        # Fallback: no humidity data exists historically, so use a reasonable
        # regional default. Replace this with a better estimate if you have one
        # (e.g. a regional humidity climatology table).
        fallback_temp = self.district_lookup.loc[d, "temperature"]
        return {"humidity": 65.0, "temperature": fallback_temp, "source": "fallback_default"}

    # ---------- Step 4: assemble the 7-feature vector ----------
    def build_feature_vector(self, district: str, season: str = None, api_key: str = None,
                              prefer_live_temperature: bool = True) -> dict:
        soil_climate = self.get_soil_and_climate(district, season)
        live = self.fetch_live_weather(district, api_key)

        features = {
            "N": soil_climate["N"],
            "P": soil_climate["P"],
            "K": soil_climate["K"],
            "ph": soil_climate["ph"],
            "rainfall": soil_climate["rainfall"],
            "humidity": live["humidity"],
            "temperature": live["temperature"] if prefer_live_temperature else soil_climate["temperature"],
        }
        return features

    # ---------- Step 5: model prediction ----------
    def predict_top_k(self, features: dict, k: int = 3) -> list:
        sample = pd.DataFrame([features])[FEATURES]
        proba = self.model.predict_proba(sample)[0]
        top_idx = np.argsort(proba)[::-1][:k]
        return [
            {"crop": self.label_encoder.inverse_transform([i])[0], "confidence": float(proba[i])}
            for i in top_idx
        ]

    # ---------- End-to-end ----------
    def recommend_crop(self, district: str, season: str = None, api_key: str = None, k: int = 3) -> dict:
        features = self.build_feature_vector(district, season, api_key)
        predictions = self.predict_top_k(features, k)
        return {
            "district": district,
            "season": season,
            "features_used": features,
            "best_crop": predictions[0],
            "alternative_crops": predictions[1:],
        }


# Convenience module-level function (loads pipeline once, reuse across calls
# in a real app via a singleton/cache instead of reloading every request)
_pipeline = None


def recommend_crop(district: str, season: str = None, api_key: str = None, k: int = 3, data_dir: str = DATA_DIR) -> dict:
    global _pipeline
    if _pipeline is None:
        _pipeline = CropPredictionPipeline(data_dir)
    return _pipeline.recommend_crop(district, season, api_key, k)


if __name__ == "__main__":
    # Demo run -- no api_key supplied, so humidity falls back to the default.
    result = recommend_crop(district="Mysuru", season="Monsoon")

    print(f"\nDistrict: {result['district']}  (season: {result['season']})")
    print(f"Feature vector used: {result['features_used']}")
    print(f"\nBest crop: {result['best_crop']['crop']} ({result['best_crop']['confidence']:.1%})")
    print("Alternative crops:")
    for alt in result['alternative_crops']:
        print(f"  - {alt['crop']} ({alt['confidence']:.1%})")

    # Example of an unsupported district
    try:
        recommend_crop(district="Ahmedabad")
    except ValueError as e:
        print(f"\n[expected error for unsupported district] {e}")
