from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cors_origins: str = "https://budget-tool-virid.vercel.app,https://budget-tool-1bb9pe6x6-brid-odonnells-projects.vercel.app/"
    database_url: str = "sqlite:///./test.db"
    jwt_secret: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60
    google_client_id: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
