# ============================================
# 인증 서비스
# ============================================
# 로그인, 토큰 발급, 토큰 검증

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config.settings import settings
from app.config.database import query_one, execute
from app.core.exceptions import AuthenticationError, ValidationError
from app.core.logger import logger
from app.core.token_store import TokenStore
from app.models.auth import TokenPayload


# 비밀번호 해싱 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 알고리즘
ALGORITHM = "HS256"


class AuthService:
    """인증 서비스 클래스"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """비밀번호 해싱"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """액세스 토큰 생성"""
        to_encode = data.copy()
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
        })
        return jwt.encode(to_encode, settings.TOKEN_SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """리프레시 토큰 생성"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
        })
        return jwt.encode(to_encode, settings.TOKEN_SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[TokenPayload]:
        """토큰 검증 및 페이로드 반환"""
        try:
            payload = jwt.decode(
                token, 
                settings.TOKEN_SECRET_KEY, 
                algorithms=[ALGORITHM]
            )
            return TokenPayload(**payload)
        except JWTError as e:
            logger.debug(f"토큰 검증 실패: {str(e)}")
            return None
    
    @classmethod
    async def login(
        cls,
        email: str,
        password: str,
        ip_address: str = "unknown",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        """
        로그인 처리
        
        Args:
            email: 이메일
            password: 비밀번호
            ip_address: 클라이언트 IP
            user_agent: User-Agent
        
        Returns:
            사용자 정보 및 토큰
        
        Raises:
            AuthenticationError: 인증 실패
        """
        # 사용자 조회
        user = await query_one(
            """
            SELECT id, email, password_hash, name, role, status
            FROM admin_users
            WHERE email = %(email)s
            """,
            {"email": email}
        )
        
        if not user:
            logger.warning(f"로그인 실패 - 사용자 없음: {email}")
            raise AuthenticationError("이메일 또는 비밀번호가 올바르지 않습니다.")
        
        # 계정 상태 확인
        if user.get("status") != 1:
            logger.warning(f"로그인 실패 - 비활성 계정: {email}")
            raise AuthenticationError("비활성화된 계정입니다.")
        
        # 비밀번호 검증
        if not cls.verify_password(password, user["password_hash"]):
            logger.warning(f"로그인 실패 - 비밀번호 불일치: {email}")
            raise AuthenticationError("이메일 또는 비밀번호가 올바르지 않습니다.")
        
        # 마지막 로그인 시간 업데이트
        await execute(
            "UPDATE admin_users SET last_login = NOW() WHERE id = %(user_id)s",
            {"user_id": user["id"]}
        )
        
        # 로그인 로그 기록 (테이블이 있는 경우)
        try:
            await execute(
                """
                INSERT INTO admin_login_logs (admin_id, admin_email, ip_address, user_agent)
                VALUES (%(admin_id)s, %(email)s, %(ip)s, %(user_agent)s)
                """,
                {
                    "admin_id": user["id"],
                    "email": user["email"],
                    "ip": ip_address,
                    "user_agent": user_agent
                }
            )
        except Exception as e:
            # 로그 테이블이 없어도 로그인은 진행
            logger.debug(f"로그인 로그 기록 실패 (무시): {str(e)}")
        
        # 토큰 생성
        token_data = {
            "sub": str(user["id"]),
            "email": user["email"],
            "name": user.get("name") or "관리자",
            "role": user.get("role") or "admin",
            "organization": "현대그린푸드 본사",
        }
        
        access_token = cls.create_access_token(token_data)
        refresh_token = cls.create_refresh_token({"sub": str(user["id"])})
        
        # 리프레시 토큰 저장
        await TokenStore.store_refresh_token(str(user["id"]), refresh_token)
        
        logger.info(f"로그인 성공: {email}")
        
        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user.get("name") or "관리자",
                "role": user.get("role") or "admin",
                "organization": "현대그린푸드 본사",
            },
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            }
        }
    
    @classmethod
    async def refresh_access_token(cls, refresh_token: str) -> Dict[str, Any]:
        """
        액세스 토큰 갱신
        
        Args:
            refresh_token: 리프레시 토큰
        
        Returns:
            새로운 토큰
        
        Raises:
            AuthenticationError: 토큰 검증 실패
        """
        # 토큰 검증
        try:
            payload = jwt.decode(
                refresh_token,
                settings.TOKEN_SECRET_KEY,
                algorithms=[ALGORITHM]
            )
        except JWTError:
            raise AuthenticationError("유효하지 않은 리프레시 토큰입니다.")
        
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("유효하지 않은 리프레시 토큰입니다.")
        
        # 저장된 리프레시 토큰 확인
        stored_token = await TokenStore.get_refresh_token(user_id)
        if stored_token != refresh_token:
            raise AuthenticationError("리프레시 토큰이 만료되었습니다.")
        
        # 사용자 조회
        user = await query_one(
            "SELECT id, email, name, role FROM admin_users WHERE id = %(user_id)s AND status = 1",
            {"user_id": int(user_id)}
        )
        
        if not user:
            raise AuthenticationError("사용자를 찾을 수 없습니다.")
        
        # 새 토큰 발급
        token_data = {
            "sub": str(user["id"]),
            "email": user["email"],
            "name": user.get("name") or "관리자",
            "role": user.get("role") or "admin",
            "organization": "현대그린푸드 본사",
        }
        
        new_access_token = cls.create_access_token(token_data)
        new_refresh_token = cls.create_refresh_token({"sub": str(user["id"])})
        
        # 새 리프레시 토큰 저장
        await TokenStore.store_refresh_token(str(user["id"]), new_refresh_token)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
    
    @classmethod
    async def logout(cls, user_id: str, access_token: str) -> bool:
        """
        로그아웃 처리
        
        Args:
            user_id: 사용자 ID
            access_token: 액세스 토큰 (블랙리스트 추가용)
        
        Returns:
            성공 여부
        """
        # 리프레시 토큰 삭제
        await TokenStore.delete_refresh_token(user_id)
        
        # 액세스 토큰 블랙리스트 추가
        await TokenStore.add_to_blacklist(access_token)
        
        logger.info(f"로그아웃: user_id={user_id}")
        return True


