# ============================================
# FastAPI 메인 애플리케이션
# ============================================
# OniCare Admin Backend

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.config.settings import settings
from app.config.database import create_db_pool, create_app_db_pool, close_db_pool
from app.config.redis import create_redis_client, close_redis_client
from app.core.exceptions import AppException
from app.core.logger import logger
from app.lib.app_db import app_db_manager

# 라우터 임포트
from app.routers import (
    auth_router, 
    admin_users_router, 
    contents_router,
    roles_router,
    menus_router,
    companies_router,
    security_groups_router,
    logs_router,
    content_categories_router,
    content_subcategories_router,
    common_codes_router,
    system_settings_router,
    notices_router,
    store_customers_router,
    members_router,
    greating_x_router,
    upload_router,
    departments_router,
    apis_router,
    dashboard_router,
    points_router,
    challenges_router,
    supplements_router,
    functional_ingredients_router,
    functionality_contents_router,
    units_router,
    consents_router,
    push_notifications_router,
    health_goal_types_router,
    supplement_corners_router,
    meal_records_router,
    coupons_router,
    coupon_master_router,
    cafe_menus_router,
    inquiries_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 라이프사이클 관리"""
    # 시작 시 실행
    logger.info(f"🚀 {settings.APP_NAME} 서버 시작 중...")
    
    # DB 커넥션 풀 생성
    await create_db_pool()
    await create_app_db_pool()
    
    # App DB Manager 초기화 (별도 싱글톤)
    await app_db_manager.init_async_pool()
    
    # Redis 연결
    try:
        await create_redis_client()
    except Exception as e:
        logger.warning(f"Redis 연결 실패 (계속 진행): {str(e)}")
    
    logger.info(f"✅ 서버 준비 완료: http://{settings.HOST}:{settings.PORT}")
    
    yield
    
    # 종료 시 실행
    logger.info("🛑 서버 종료 중...")
    await close_db_pool()
    await app_db_manager.close()
    await close_redis_client()
    logger.info("👋 서버 종료 완료")


# FastAPI 앱 생성
# 프로덕션: openapi.json 비활성화 (정보 노출 취약점 대응)
app = FastAPI(
    title=settings.APP_NAME,
    description="OniCare Admin Backend API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)


# Security Headers 미들웨어
# NOTE: Server 헤더는 uvicorn protocol layer에서 추가되므로 미들웨어로 제거 불가.
#       따라서 uvicorn 실행 시 --no-server-header / server_header=False 옵션 사용.
#       이 미들웨어는 그 외 보안 헤더를 추가하고, 안전망으로 server 헤더 제거를 시도.
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Server 헤더 제거 (안전망 - 실제 차단은 uvicorn server_header=False)
        if "server" in response.headers:
            del response.headers["server"]
        # 보안 헤더 추가
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 전역 예외 핸들러
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """애플리케이션 커스텀 예외 핸들러"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.to_dict()}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 검증 에러 핸들러"""
    errors = exc.errors()
    detail = []
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"][1:]) if len(error["loc"]) > 1 else error["loc"][0]
        detail.append({
            "field": field,
            "message": error["msg"],
        })
    
    # 디버그용 로그 추가
    logger.warning(f"Validation error: {detail}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "error": "VALIDATION_ERROR",
                "message": "입력값 검증에 실패했습니다.",
                "detail": detail,
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """전역 예외 핸들러"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "error": "INTERNAL_ERROR",
                "message": "서버 오류가 발생했습니다." if not settings.DEBUG else str(exc),
            }
        }
    )


# 헬스체크
@app.get("/", tags=["Health"])
async def root():
    """루트 경로 - ALB 헬스체크용"""
    return {"status": "ok"}


@app.get("/health", tags=["Health"])
async def health_check():
    """서버 상태 확인"""
    return {"status": "healthy", "service": settings.APP_NAME}


# 라우터 등록
app.include_router(auth_router)
app.include_router(admin_users_router)
app.include_router(contents_router)
app.include_router(roles_router)
app.include_router(menus_router)
app.include_router(companies_router)
app.include_router(security_groups_router)
app.include_router(logs_router)
app.include_router(content_categories_router)
app.include_router(content_subcategories_router)
app.include_router(common_codes_router)
app.include_router(system_settings_router)
app.include_router(notices_router)
app.include_router(store_customers_router)
app.include_router(members_router)
app.include_router(greating_x_router)
app.include_router(upload_router)
app.include_router(departments_router)
app.include_router(apis_router)
app.include_router(dashboard_router)
app.include_router(points_router)
app.include_router(challenges_router)
app.include_router(supplements_router)
app.include_router(functional_ingredients_router)
app.include_router(functionality_contents_router)
app.include_router(units_router)
app.include_router(consents_router)
app.include_router(push_notifications_router)
app.include_router(health_goal_types_router)
app.include_router(supplement_corners_router)
app.include_router(meal_records_router)
app.include_router(coupons_router)
app.include_router(coupon_master_router)
app.include_router(cafe_menus_router)
app.include_router(inquiries_router)

# 정적 파일 서빙 (업로드된 이미지)
uploads_dir = Path(__file__).parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# 개발용 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        server_header=False,  # Server: uvicorn 헤더 제거 (정보 노출 취약점 대응)
    )

