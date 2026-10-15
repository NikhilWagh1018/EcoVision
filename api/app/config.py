from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://ecovision:ecovision@localhost:5432/ecovision"
    storage_dir: str = "./storage"
    model_dir: str = "./weights"
    spot_merge_radius_m: float = 15
    verify_max_distance_m: float = 25
    verify_max_time_gap_s: float = 600
    verify_phash_min_distance: int = 6
    verify_phash_own_spot_min_distance: int = 2
    verify_min_orb_inliers: int = 15
    confidence_threshold: float = 0.60
    clean_coverage_pct: float = 5


settings = Settings()
