from jose import jwt
from datetime import datetime, timedelta, timezone
from typing import Union, Any
import bcrypt

from app.core.config import settings

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 암호화된 해시 비밀번호를 비교하여 일치 여부를 반환합니다.
    """
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    평문 비밀번호를 안전한 단방향 해시 비밀번호로 암호화하여 반환합니다.
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    로그인 성공 시 클라이언트에게 지급할 서명된 Access Token(JWT)을 발급합니다.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject)  # 통상적으로 사용자 PK 또는 phone_number 등을 sub로 기록
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


