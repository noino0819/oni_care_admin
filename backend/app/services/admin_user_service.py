# ============================================
# 관리자 회원 서비스
# ============================================
# 관리자 회원 CRUD

from typing import Optional, List, Dict, Any
import hashlib

from app.config.database import query, query_one, execute_returning, execute
from app.core.exceptions import ValidationError, NotFoundError, DuplicateKeyError
from app.core.logger import logger
from app.models.admin_user import AdminUserCreate, AdminUserUpdate


class AdminUserService:
    """관리자 회원 서비스 클래스"""
    
    @staticmethod
    def hash_password_sha256(password: str) -> str:
        """SHA256 비밀번호 해싱 (기존 호환용)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @classmethod
    async def get_list(
        cls,
        company_id: Optional[int] = None,
        company_name: Optional[str] = None,
        department_name: Optional[str] = None,
        employee_name: Optional[str] = None,
        login_id: Optional[str] = None,
        page: int = 1,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        관리자 회원 목록 조회
        
        Returns:
            data: 회원 목록
            pagination: 페이지네이션 정보
        """
        # 조건절 생성
        conditions = []
        params = {}
        
        if company_id:
            conditions.append("au.company_id = %(company_id)s")
            params["company_id"] = company_id
        
        if company_name:
            conditions.append("c.company_name ILIKE %(company_name)s")
            params["company_name"] = f"%{company_name}%"
        
        if department_name:
            conditions.append("d.department_name ILIKE %(department_name)s")
            params["department_name"] = f"%{department_name}%"
        
        if employee_name:
            conditions.append("(au.employee_name ILIKE %(employee_name)s OR au.name ILIKE %(employee_name)s)")
            params["employee_name"] = f"%{employee_name}%"
        
        if login_id:
            conditions.append("(au.login_id ILIKE %(login_id)s OR au.email ILIKE %(login_id)s)")
            params["login_id"] = f"%{login_id}%"
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # 전체 개수 조회
        count_sql = f"""
            SELECT COUNT(*) as count
            FROM public.admin_users au
            LEFT JOIN public.companies c ON au.company_id = c.id
            LEFT JOIN public.departments d ON au.department_id = d.id
            {where_clause}
        """
        count_result = await query_one(count_sql, params)
        total = int(count_result.get("count", 0)) if count_result else 0
        
        # 데이터 조회
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset
        
        data_sql = f"""
            SELECT 
                au.id, au.email,
                COALESCE(au.login_id, au.email) as login_id,
                COALESCE(au.employee_name, au.name) as employee_name,
                au.name, au.role,
                au.department_id, d.department_name,
                au.company_id, c.company_name,
                au.phone,
                COALESCE(au.is_active, au.status = 1) as is_active,
                au.status, au.last_login,
                au.created_by, au.created_at,
                au.updated_by, au.updated_at
            FROM public.admin_users au
            LEFT JOIN public.companies c ON au.company_id = c.id
            LEFT JOIN public.departments d ON au.department_id = d.id
            {where_clause}
            ORDER BY au.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """
        
        data = await query(data_sql, params)
        
        return {
            "data": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    
    @classmethod
    async def get_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        """
        ID로 관리자 회원 조회
        
        Args:
            user_id: 회원 ID
        
        Returns:
            회원 정보 또는 None
        """
        sql = """
            SELECT 
                au.id, au.email,
                COALESCE(au.login_id, au.email) as login_id,
                COALESCE(au.employee_name, au.name) as employee_name,
                au.name, au.role,
                au.department_id, d.department_name,
                au.company_id, c.company_name,
                au.phone,
                COALESCE(au.is_active, au.status = 1) as is_active,
                au.status, au.last_login,
                au.created_by, au.created_at,
                au.updated_by, au.updated_at
            FROM public.admin_users au
            LEFT JOIN public.companies c ON au.company_id = c.id
            LEFT JOIN public.departments d ON au.department_id = d.id
            WHERE au.id = %(user_id)s
        """
        return await query_one(sql, {"user_id": user_id})
    
    @classmethod
    async def create(cls, data: AdminUserCreate, created_by: str = "admin") -> Dict[str, Any]:
        """
        관리자 회원 생성
        
        Args:
            data: 생성 데이터
            created_by: 생성자
        
        Returns:
            생성된 회원 정보
        
        Raises:
            DuplicateKeyError: 중복 사번
        """
        # 기본 비밀번호 설정 (입력값 없으면 login_id + "1234")
        password = data.password or f"{data.login_id}1234"
        password_hash = cls.hash_password_sha256(password)
        
        # email은 login_id 기반으로 생성
        email = f"{data.login_id}@admin.local"
        
        try:
            result = await execute_returning(
                """
                INSERT INTO public.admin_users 
                    (email, login_id, password_hash, name, employee_name, 
                     department_id, company_id, phone, is_active, status, created_by)
                VALUES 
                    (%(email)s, %(login_id)s, %(password_hash)s, %(name)s, %(employee_name)s,
                     %(department_id)s, %(company_id)s, %(phone)s, %(is_active)s, %(status)s, %(created_by)s)
                RETURNING id, email, login_id, name, employee_name, department_id, company_id, 
                          phone, is_active, status, created_by, created_at
                """,
                {
                    "email": email,
                    "login_id": data.login_id,
                    "password_hash": password_hash,
                    "name": data.employee_name,
                    "employee_name": data.employee_name,
                    "department_id": data.department_id,
                    "company_id": data.company_id,
                    "phone": data.phone,
                    "is_active": data.is_active,
                    "status": 1 if data.is_active else 0,
                    "created_by": created_by,
                }
            )
            
            logger.info(f"관리자 회원 생성: {data.login_id}")
            return result
            
        except Exception as e:
            if "unique constraint" in str(e).lower() or "duplicate" in str(e).lower():
                raise DuplicateKeyError("이미 존재하는 사번입니다.")
            raise
    
    @classmethod
    async def update(cls, user_id: int, data: AdminUserUpdate, updated_by: str = "admin") -> Optional[Dict[str, Any]]:
        """
        관리자 회원 수정
        
        Args:
            user_id: 회원 ID
            data: 수정 데이터
            updated_by: 수정자
        
        Returns:
            수정된 회원 정보
        
        Raises:
            NotFoundError: 회원을 찾을 수 없음
        """
        # 기존 데이터 확인
        existing = await cls.get_by_id(user_id)
        if not existing:
            raise NotFoundError("관리자 회원을 찾을 수 없습니다.")
        
        # 수정할 필드 구성
        update_fields = []
        params = {"user_id": user_id, "updated_by": updated_by}
        
        if data.employee_name is not None:
            update_fields.append("employee_name = %(employee_name)s")
            update_fields.append("name = %(employee_name)s")
            params["employee_name"] = data.employee_name
        
        if data.department_id is not None:
            update_fields.append("department_id = %(department_id)s")
            params["department_id"] = data.department_id
        
        if data.company_id is not None:
            update_fields.append("company_id = %(company_id)s")
            params["company_id"] = data.company_id
        
        if data.phone is not None:
            update_fields.append("phone = %(phone)s")
            params["phone"] = data.phone
        
        if data.is_active is not None:
            update_fields.append("is_active = %(is_active)s")
            update_fields.append("status = %(status)s")
            params["is_active"] = data.is_active
            params["status"] = 1 if data.is_active else 0
        
        if not update_fields:
            return existing
        
        update_fields.append("updated_by = %(updated_by)s")
        update_fields.append("updated_at = NOW()")
        
        sql = f"""
            UPDATE public.admin_users
            SET {', '.join(update_fields)}
            WHERE id = %(user_id)s
            RETURNING id, email, login_id, name, employee_name, department_id, company_id,
                      phone, is_active, status, created_by, created_at, updated_by, updated_at
        """
        
        result = await execute_returning(sql, params)
        logger.info(f"관리자 회원 수정: id={user_id}")
        return result
    
    @classmethod
    async def delete(cls, user_id: int) -> bool:
        """
        관리자 회원 삭제
        
        Args:
            user_id: 회원 ID
        
        Returns:
            삭제 성공 여부
        """
        affected = await execute(
            "DELETE FROM public.admin_users WHERE id = %(user_id)s",
            {"user_id": user_id}
        )
        
        if affected > 0:
            logger.info(f"관리자 회원 삭제: id={user_id}")
            return True
        return False
    
    @classmethod
    async def reset_password(
        cls, 
        user_id: int, 
        new_password: Optional[str] = None
    ) -> bool:
        """
        비밀번호 초기화
        
        Args:
            user_id: 회원 ID
            new_password: 새 비밀번호 (미입력 시 login_id + "1234")
        
        Returns:
            성공 여부
        """
        # 사용자 조회
        user = await cls.get_by_id(user_id)
        if not user:
            raise NotFoundError("관리자 회원을 찾을 수 없습니다.")
        
        # 기본 비밀번호 설정
        login_id = user.get("login_id") or user.get("email", "").split("@")[0]
        password = new_password or f"{login_id}1234"
        password_hash = cls.hash_password_sha256(password)
        
        affected = await execute(
            """
            UPDATE public.admin_users
            SET password_hash = %(password_hash)s, updated_at = NOW()
            WHERE id = %(user_id)s
            """,
            {"user_id": user_id, "password_hash": password_hash}
        )
        
        if affected > 0:
            logger.info(f"비밀번호 초기화: id={user_id}")
            return True
        return False


