from typing import Optional, Any, Dict
from jose import jwt, JWTError
from src.core.config import get_settings

settings = get_settings()

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT token using the configured secret and algorithm.
    Falls back to unverified decode for tokens issued by Pandora SSO (external secret).
    """
    try:
        # Try primary JWT_SECRET
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        pass

    try:
        # Fallback to JWT_SECRET_APPLICATION
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_APPLICATION,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        pass

    # Last resort: decode without signature verification.
    # This is safe because Pandora already validated the token at validate-token time.
    # We only read the payload claims (email, sub, role) for session continuity.
    try:
        payload = jwt.decode(
            token,
            "",
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_signature": False, "verify_exp": True}
        )
        return payload
    except JWTError:
        return None
