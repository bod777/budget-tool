from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
