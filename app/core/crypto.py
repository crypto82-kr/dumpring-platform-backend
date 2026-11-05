import os
import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet_key() -> bytes:
    """
    settings.SECRET_KEY를 기반으로 32바이트 urlsafe base64 키를 생성합니다.
    """
    secret = getattr(settings, "SECRET_KEY", "dumpring-secret-key-32bytes-long-padding!!")
    key_32 = hashlib.sha256(secret.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(key_32)

_cipher = Fernet(_get_fernet_key())

def encrypt_sensitive_data(plain_text: Optional[str]) -> Optional[str]:
    """
    민감 정보(계좌번호, 주민번호 대체 CI, 고유식별정보 등)를 AES-128-CBC/Fernet 방식으로 안전하게 대칭키 암호화합니다.
    """
    if not plain_text or not plain_text.strip():
        return plain_text
    try:
        encrypted_bytes = _cipher.encrypt(plain_text.strip().encode('utf-8'))
        return "ENC::" + encrypted_bytes.decode('utf-8')
    except Exception as e:
        return plain_text

def decrypt_sensitive_data(cipher_text: Optional[str]) -> Optional[str]:
    """
    암호화된 문자열을 복호화하여 평문으로 반환합니다. 만약 암호화되지 않은 기존 레코드인 경우 그대로 반환합니다.
    """
    if not cipher_text:
        return cipher_text
    if not cipher_text.startswith("ENC::"):
        return cipher_text
    try:
        raw_cipher = cipher_text[5:].encode('utf-8')
        decrypted_bytes = _cipher.decrypt(raw_cipher)
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        return cipher_text

