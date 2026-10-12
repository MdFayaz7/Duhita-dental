from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/duhita_dental"
    db_pool_size: int = 10
    db_max_overflow: int = 10

    admin_username: str = "DuhitaAdmin"
    admin_password: str = "change-this-password"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720

    cors_origins: str = "http://localhost:5180,http://localhost:5173"
    # Optional: a regex to allow additional origins beyond the exact list above.
    cors_origin_regex: str = ""
    public_base_url: str = "http://localhost:8000"
    upload_dir: str = "uploads"
    max_upload_mb: int = 15
    max_video_mb: int = 100
    # Without Cloudinary, clips are streamed by this server itself — keep them small.
    max_local_video_mb: int = 20
    # Optional video CDN (cloudinary://<key>:<secret>@<cloud>). Clips then load fast
    # everywhere and are compressed automatically; without it they are kept in Postgres.
    cloudinary_url: str = ""

    # WhatsApp Cloud API (Meta). Leave the token empty to log messages instead of sending them.
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_admin_numbers: str = ""
    whatsapp_api_version: str = "v23.0"
    whatsapp_language: str = "en"
    whatsapp_template_admin: str = "appointment_request"
    whatsapp_template_patient: str = "appointment_confirmed"
    whatsapp_country_code: str = "91"

    @property
    def origins(self) -> list[str]:
        # Forgive the usual copy-paste slips: spaces, quotes and a trailing slash.
        return [o.strip().strip('"\'').rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def async_database_url(self) -> str:
        """Hosts hand out postgres:// URLs; SQLAlchemy needs the asyncpg driver named, and asyncpg spells sslmode `ssl`."""
        url = self.database_url.strip()
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                url = "postgresql+asyncpg://" + url.removeprefix(prefix)
        return url.replace("sslmode=", "ssl=")

    @property
    def admin_whatsapp_numbers(self) -> set[str]:
        from .whatsapp import normalize_number

        return {n for n in (normalize_number(x) for x in self.whatsapp_admin_numbers.split(",")) if n}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
