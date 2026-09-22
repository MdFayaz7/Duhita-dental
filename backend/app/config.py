from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "duhita_dental"

    admin_username: str = "DuhitaAdmin"
    admin_password: str = "change-this-password"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720

    cors_origins: str = "http://localhost:5180,http://localhost:5173"
    # Optional: also allow Vercel preview URLs, e.g. https://duhita-dental-git-xyz.vercel.app
    cors_origin_regex: str = ""
    public_base_url: str = "http://localhost:8000"
    upload_dir: str = "uploads"
    max_upload_mb: int = 15
    max_video_mb: int = 100
    # Without Cloudinary, clips are streamed by this server itself — keep them small.
    max_local_video_mb: int = 20
    # Optional video CDN (cloudinary://<key>:<secret>@<cloud>). Clips then load fast
    # everywhere and are compressed automatically; without it they are kept in MongoDB.
    cloudinary_url: str = ""

    @property
    def origins(self) -> list[str]:
        # Forgive the usual copy-paste slips: spaces, quotes and a trailing slash.
        return [o.strip().strip('"\'').rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
