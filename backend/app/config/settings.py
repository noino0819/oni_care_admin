# ============================================
# 애플리케이션 설정
# ============================================
# 환경변수 기반 설정 관리

from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

# 프로젝트 루트 디렉토리 (backend의 상위)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
# oni_care 앱 백엔드 디렉토리 (Redis 등 공유 설정)
ONI_CARE_BACKEND = Path(__file__).parent.parent.parent.parent.parent / "oni_care" / "backend"


class Settings(BaseSettings):
    """애플리케이션 설정 클래스"""
    
    # 앱 설정
    APP_NAME: str = "OniCare Admin Backend"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # 서버 설정
    HOST: str = "0.0.0.0"
    PORT: int = 8001  # Admin Backend (App Backend는 8000)
    
    # Admin DB 설정
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "oni_care_admin"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_MIN_CONN: int = 5
    DB_MAX_CONN: int = 20
    
    # App DB 설정 (기본: Admin DB와 동일)
    # APP_DB_* 가 없으면 DB_* 값을 사용
    APP_DB_HOST: str | None = None
    APP_DB_PORT: int | None = None
    APP_DB_NAME: str | None = None
    APP_DB_USER: str | None = None
    APP_DB_PASSWORD: str | None = None
    APP_DB_MIN_CONN: int = 5
    APP_DB_MAX_CONN: int = 20
    
    @property
    def app_db_host(self) -> str:
        return self.APP_DB_HOST or self.DB_HOST
    
    @property
    def app_db_port(self) -> int:
        return self.APP_DB_PORT or self.DB_PORT
    
    @property
    def app_db_name(self) -> str:
        return self.APP_DB_NAME or self.DB_NAME
    
    @property
    def app_db_user(self) -> str:
        return self.APP_DB_USER or self.DB_USER
    
    @property
    def app_db_password(self) -> str:
        return self.APP_DB_PASSWORD or self.DB_PASSWORD
    
    # Redis 설정
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    
    # JWT 설정
    TOKEN_SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS 설정
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """CORS 허용 도메인 리스트 반환"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def admin_db_dsn(self) -> str:
        """Admin DB 연결 문자열"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def app_db_dsn(self) -> str:
        """App DB 연결 문자열"""
        return f"postgresql://{self.app_db_user}:{self.app_db_password}@{self.app_db_host}:{self.app_db_port}/{self.app_db_name}"
    
    class Config:
        # 여러 .env 파일 읽기 (우선순위: 나중에 나온 것이 높음)
        # oni_care의 공유 설정(Redis 등)을 먼저 읽고, Admin 설정으로 덮어씀
        env_file = (
            str(ONI_CARE_BACKEND / ".env"),  # 공유 설정 (Redis, DB 등) - 낮은 우선순위
            ".env",
            str(PROJECT_ROOT / ".env"),
            str(PROJECT_ROOT / ".env.local"),  # Admin 전용 설정 - 높은 우선순위
        )
        env_file_encoding = "utf-8"
        extra = "ignore"


# 설정 싱글톤 인스턴스
settings = Settings()

