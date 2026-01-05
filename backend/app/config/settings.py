# ============================================
# 애플리케이션 설정
# ============================================
# 환경변수 기반 설정 관리

from pydantic_settings import BaseSettings
from typing import List
import os


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
    
    # App DB 설정 (oni_care)
    APP_DB_HOST: str = "localhost"
    APP_DB_PORT: int = 5432
    APP_DB_NAME: str = "oni_care"
    APP_DB_USER: str = "postgres"
    APP_DB_PASSWORD: str = ""
    APP_DB_MIN_CONN: int = 5
    APP_DB_MAX_CONN: int = 20
    
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
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
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
        return f"postgresql://{self.APP_DB_USER}:{self.APP_DB_PASSWORD}@{self.APP_DB_HOST}:{self.APP_DB_PORT}/{self.APP_DB_NAME}"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# 설정 싱글톤 인스턴스
settings = Settings()

