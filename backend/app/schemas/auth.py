from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class GoogleAuthRequest(BaseModel):
    credential: str


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[HttpUrl] = None
    email_verified: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    issued_at: datetime
    user: AuthenticatedUser
