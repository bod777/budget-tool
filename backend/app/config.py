from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: str = ""
    database_url: str = "sqlite:///./test.db"
    jwt_secret: str = "your-secret-key"

    class Config:
        env_file = ".env"

settings = Settings()
