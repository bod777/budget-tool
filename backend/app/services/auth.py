from datetime import datetime, timedelta
from typing import Any, Dict, Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from ..config import settings
from ..schemas.auth import AuthenticatedUser

_bearer_scheme = HTTPBearer(auto_error=False)


def _build_payload(
    claims: Dict[str, Any],
    expires_delta: timedelta,
    issued_at: datetime,
) -> Dict[str, Any]:
    payload = {
        **claims,
        "exp": issued_at + expires_delta,
        "iat": issued_at,
        "iss": "budget-api",
    }
    return payload


def create_access_token(
    claims: Dict[str, Any],
    expires_delta: timedelta | None = None,
) -> Tuple[str, datetime, datetime]:
    """Create a signed JWT for the provided claims."""
    expires_delta = expires_delta or timedelta(minutes=settings.jwt_exp_minutes)
    issued_at = datetime.utcnow()
    payload = _build_payload(claims, expires_delta, issued_at)

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    return token, issued_at, issued_at + expires_delta


def decode_access_token(token: str) -> AuthenticatedUser:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc

    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed access token.",
        )

    return AuthenticatedUser(
        id=subject,
        email=payload.get("email"),
        name=payload.get("name"),
        picture=payload.get("picture"),
        email_verified=payload.get("email_verified"),
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
        )

    return decode_access_token(credentials.credentials)
