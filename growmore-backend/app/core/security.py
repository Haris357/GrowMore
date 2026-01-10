from typing import Optional, Dict, Any

from firebase_admin import auth
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError

from app.config.firebase import get_firebase_app
from app.core.exceptions import AuthenticationError


async def verify_firebase_token(token: str) -> Dict[str, Any]:
    get_firebase_app()

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except ExpiredIdTokenError:
        raise AuthenticationError("Token has expired")
    except RevokedIdTokenError:
        raise AuthenticationError("Token has been revoked")
    except InvalidIdTokenError:
        raise AuthenticationError("Invalid token")
    except Exception as e:
        raise AuthenticationError(f"Token verification failed: {str(e)}")


async def get_current_user_from_token(token: str) -> Dict[str, Any]:
    decoded_token = await verify_firebase_token(token)

    return {
        "firebase_uid": decoded_token.get("uid"),
        "email": decoded_token.get("email"),
        "email_verified": decoded_token.get("email_verified", False),
        "display_name": decoded_token.get("name"),
        "photo_url": decoded_token.get("picture"),
        "auth_provider": _get_auth_provider(decoded_token),
    }


def _get_auth_provider(decoded_token: Dict[str, Any]) -> str:
    firebase_info = decoded_token.get("firebase", {})
    sign_in_provider = firebase_info.get("sign_in_provider", "")

    if sign_in_provider == "google.com":
        return "google"
    elif sign_in_provider == "password":
        return "email"
    else:
        return sign_in_provider or "unknown"


def extract_token_from_header(authorization: Optional[str]) -> str:
    if not authorization:
        raise AuthenticationError("Authorization header missing")

    parts = authorization.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthenticationError("Invalid authorization header format")

    return parts[1]
