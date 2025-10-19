from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from ...config import settings
from ...schemas.auth import (
    AuthenticatedUser,
    GoogleAuthRequest,
    TokenResponse,
)
from ...services.auth import create_access_token

router = APIRouter()


@router.post("/google", response_model=TokenResponse)
async def authenticate_with_google(payload: GoogleAuthRequest) -> TokenResponse:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth client not configured.",
        )

    try:
        id_info = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential.",
        ) from exc

    if id_info.get("aud") != settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential has unexpected audience.",
        )

    expires_delta = timedelta(minutes=settings.jwt_exp_minutes)
    token, issued_at, expires_at = create_access_token(
        {
            "sub": id_info["sub"],
            "email": id_info.get("email"),
            "name": id_info.get("name"),
            "picture": id_info.get("picture"),
            "email_verified": id_info.get("email_verified"),
        },
        expires_delta=expires_delta,
    )

    user = AuthenticatedUser(
        id=id_info["sub"],
        email=id_info.get("email"),
        name=id_info.get("name"),
        picture=id_info.get("picture"),
        email_verified=id_info.get("email_verified"),
    )

    return TokenResponse(
        access_token=token,
        expires_in=int((expires_at - issued_at).total_seconds()),
        issued_at=issued_at,
        user=user,
    )
