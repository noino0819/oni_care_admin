"""
파일: app/services/challenge_service.py
설명: 챌린지 관리 비즈니스 로직
"""
import json
from typing import Optional, List, Dict, Any
from datetime import date

from app.core.decorators import auto_commit
from app.core.exceptions import ValidationError, NotFoundError
from app.utils.sql_loader import get_sql
from app.lib.app_db import app_db_manager


class ChallengeService:
    """챌린지 관리 서비스 (App DB 사용)"""

    def __init__(self):
        self.sql = get_sql("challenges")

    @auto_commit
    async def get_challenges(
        self,
        title: Optional[str] = None,
        challenge_type: Optional[str] = None,
        verification_method: Optional[str] = None,
        visibility_scope: Optional[List[str]] = None,
        status: Optional[List[str]] = None,
        operation_from: Optional[date] = None,
        operation_to: Optional[date] = None,
        recruitment_from: Optional[date] = None,
        recruitment_to: Optional[date] = None,
        display_from: Optional[date] = None,
        display_to: Optional[date] = None,
        page: int = 1,
        limit: int = 20,
        _conn=None
    ) -> Dict[str, Any]:
        """
        챌린지 목록 조회
        
        Args:
            title: 챌린지명 검색
            challenge_type: 챌린지 유형
            verification_method: 인증 방식
            visibility_scope: 공개범위 필터
            status: 상태 필터
            operation_from: 운영 시작일 필터
            operation_to: 운영 종료일 필터
            recruitment_from: 모집 시작일 필터
            recruitment_to: 모집 종료일 필터
            display_from: 노출 시작일 필터
            display_to: 노출 종료일 필터
            page: 페이지 번호
            limit: 페이지당 개수
            
        Returns:
            dict: 챌린지 목록 및 페이지네이션 정보
        """
        offset = (page - 1) * limit
        
        params = {
            "title": title,
            "challenge_type": challenge_type,
            "verification_method": verification_method,
            "operation_from": operation_from,
            "operation_to": operation_to,
            "recruitment_from": recruitment_from,
            "recruitment_to": recruitment_to,
            "display_from": display_from,
            "display_to": display_to,
            "limit": limit,
            "offset": offset
        }
        
        # App DB에서 조회
        async with app_db_manager.get_async_conn() as conn:
            # 전체 개수 조회
            count_query = self.sql.get("count_challenges")
            async with conn.cursor() as cur:
                await cur.execute(count_query, params)
                count_result = await cur.fetchone()
                total = count_result["total"] if count_result else 0
            
            # 목록 조회
            list_query = self.sql.get("get_challenges_list")
            async with conn.cursor() as cur:
                await cur.execute(list_query, params)
                challenges = await cur.fetchall()
        
        # 공개범위, 상태 필터 적용 (Python에서 처리)
        if visibility_scope:
            challenges = [
                c for c in challenges 
                if any(scope in (c.get("visibility_scope") or []) for scope in visibility_scope)
            ]
            total = len(challenges)
        
        if status:
            challenges = [
                c for c in challenges 
                if c.get("status") in status
            ]
            total = len(challenges)
        
        total_pages = (total + limit - 1) // limit
        
        return {
            "items": challenges,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }

    @auto_commit
    async def get_challenge_by_id(
        self,
        challenge_id: str,
        _conn=None
    ) -> Optional[Dict[str, Any]]:
        """
        챌린지 상세 조회
        
        Args:
            challenge_id: 챌린지 ID
            
        Returns:
            dict: 챌린지 상세 정보
        """
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("get_challenge_by_id")
            async with conn.cursor() as cur:
                await cur.execute(query, {"challenge_id": challenge_id})
                challenge = await cur.fetchone()
        
        if not challenge:
            raise NotFoundError(f"챌린지를 찾을 수 없습니다: {challenge_id}")
        
        return dict(challenge)

    @auto_commit
    async def create_challenge(
        self,
        data: Dict[str, Any],
        created_by: str,
        _conn=None
    ) -> Dict[str, Any]:
        """
        챌린지 생성
        
        Args:
            data: 챌린지 데이터
            created_by: 생성자
            
        Returns:
            dict: 생성된 챌린지 정보
        """
        # 유효성 검사
        self._validate_challenge_data(data)
        
        # 유형별 상세설정 구성
        type_settings = self._build_type_settings(data)
        
        params = {
            "challenge_type": data.get("challenge_type"),
            "verification_method": data.get("verification_method"),
            "title": data.get("title"),
            "subtitle": data.get("subtitle"),
            "description": data.get("description"),
            "max_participants": data.get("max_participants"),
            "challenge_duration_days": data.get("challenge_duration_days", 7),
            "display_order": data.get("display_order", 999),
            "recruitment_start_date": data.get("recruitment_start_date"),
            "recruitment_end_date": data.get("recruitment_end_date"),
            "operation_start_date": data.get("operation_start_date"),
            "operation_end_date": data.get("operation_end_date"),
            "display_start_date": data.get("display_start_date"),
            "display_end_date": data.get("display_end_date"),
            "visibility_scope": data.get("visibility_scope", ["all"]),
            "company_codes": data.get("company_codes", []),
            "store_visible": data.get("store_visible", False),
            "rank_display_type": data.get("rank_display_type", "hidden"),
            "daily_verification_count": data.get("daily_verification_count", 1),
            "daily_verification_settings": json.dumps(data.get("daily_verification_settings", [])),
            "daily_achievement_count": data.get("daily_achievement_count", 1),
            "total_achievement_days": data.get("total_achievement_days"),
            "reward_settings": json.dumps(data.get("reward_settings", {})),
            "type_settings": json.dumps(type_settings),
            "images": json.dumps(data.get("images", {})),
            "created_by": created_by
        }
        
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("insert_challenge")
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                result = await cur.fetchone()
            await conn.commit()
        
        return dict(result) if result else {}

    @auto_commit
    async def update_challenge(
        self,
        challenge_id: str,
        data: Dict[str, Any],
        updated_by: str,
        _conn=None
    ) -> Dict[str, Any]:
        """
        챌린지 수정
        
        Args:
            challenge_id: 챌린지 ID
            data: 수정할 데이터
            updated_by: 수정자
            
        Returns:
            dict: 수정된 챌린지 정보
        """
        # 기존 챌린지 조회
        existing = await self.get_challenge_by_id(challenge_id)
        if not existing:
            raise NotFoundError(f"챌린지를 찾을 수 없습니다: {challenge_id}")
        
        # 유효성 검사 (수정 시)
        self._validate_challenge_update(existing, data)
        
        # 유형별 상세설정 병합
        type_settings = None
        if any(key in data for key in ["steps_settings", "attendance_settings", "health_habit_settings"]):
            current_settings = existing.get("type_settings", {})
            if isinstance(current_settings, str):
                current_settings = json.loads(current_settings)
            new_settings = self._build_type_settings(data)
            type_settings = {**current_settings, **new_settings}
        
        params = {
            "challenge_id": challenge_id,
            "title": data.get("title"),
            "subtitle": data.get("subtitle"),
            "description": data.get("description"),
            "max_participants": data.get("max_participants"),
            "challenge_duration_days": data.get("challenge_duration_days"),
            "display_order": data.get("display_order"),
            "recruitment_start_date": data.get("recruitment_start_date"),
            "recruitment_end_date": data.get("recruitment_end_date"),
            "operation_start_date": data.get("operation_start_date"),
            "operation_end_date": data.get("operation_end_date"),
            "display_start_date": data.get("display_start_date"),
            "display_end_date": data.get("display_end_date"),
            "visibility_scope": data.get("visibility_scope"),
            "company_codes": data.get("company_codes"),
            "store_visible": data.get("store_visible"),
            "rank_display_type": data.get("rank_display_type"),
            "is_suspended": data.get("is_suspended"),
            "daily_verification_count": data.get("daily_verification_count"),
            "daily_verification_settings": json.dumps(data["daily_verification_settings"]) if "daily_verification_settings" in data else None,
            "daily_achievement_count": data.get("daily_achievement_count"),
            "total_achievement_days": data.get("total_achievement_days"),
            "reward_settings": json.dumps(data["reward_settings"]) if "reward_settings" in data else None,
            "type_settings": json.dumps(type_settings) if type_settings else None,
            "images": json.dumps(data["images"]) if "images" in data else None,
            "updated_by": updated_by
        }
        
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("update_challenge")
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                result = await cur.fetchone()
            await conn.commit()
        
        return dict(result) if result else {}

    @auto_commit
    async def delete_challenges(
        self,
        challenge_ids: List[str],
        deleted_by: str,
        _conn=None
    ) -> int:
        """
        챌린지 삭제 (소프트 삭제)
        
        Args:
            challenge_ids: 삭제할 챌린지 ID 목록
            deleted_by: 삭제자
            
        Returns:
            int: 삭제된 개수
        """
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("delete_challenges_batch")
            async with conn.cursor() as cur:
                await cur.execute(query, {
                    "challenge_ids": challenge_ids,
                    "updated_by": deleted_by
                })
                results = await cur.fetchall()
            await conn.commit()
        
        return len(results)

    def _validate_challenge_data(self, data: Dict[str, Any]) -> None:
        """챌린지 데이터 유효성 검사"""
        # 제목 길이 검사
        title = data.get("title", "")
        if len(title) > 20:
            raise ValidationError("챌린지명은 최대 20자까지 입력 가능합니다.")
        
        # 부제 길이 검사
        subtitle = data.get("subtitle")
        if subtitle and len(subtitle) > 8:
            raise ValidationError("챌린지 부제는 홈/챌린지 진행현황에 표시되는 명칭입니다. 8자 이내로 입력해 주세요.")
        
        # 챌린지 기간 검사
        duration = data.get("challenge_duration_days", 7)
        if duration > 30:
            raise ValidationError("챌린지 기간은 최대 30일까지 설정할 수 있습니다. 기간을 확인해주세요.")
        
        # 기간 검사
        recruitment_start = data.get("recruitment_start_date")
        recruitment_end = data.get("recruitment_end_date")
        operation_start = data.get("operation_start_date")
        operation_end = data.get("operation_end_date")
        
        if recruitment_start and recruitment_end and recruitment_start > recruitment_end:
            raise ValidationError("모집 기간을 확인해주세요.")
        
        if operation_start and operation_end and operation_start > operation_end:
            raise ValidationError("운영 기간을 확인해주세요.")
        
        # 등수 공개 방식 검사 (선공개 시 모집/운영 기간 겹침 불가)
        rank_display_type = data.get("rank_display_type")
        if rank_display_type == "live":
            if recruitment_end and operation_start and recruitment_end >= operation_start:
                raise ValidationError("모집기간 종료 후 운영이 시작되는 챌린지에서만 등수 선공개가 가능합니다.")
        
        # 일일 인증 설정 검사 (야간 푸시 불가)
        daily_settings = data.get("daily_verification_settings", [])
        for setting in daily_settings:
            if setting.get("push_enabled"):
                start_time = setting.get("start_time", "00:01")
                hour = int(start_time.split(":")[0])
                if hour >= 21 or hour < 8:
                    raise ValidationError("야간 푸시(밤 9시~익일 8시)는 설정할 수 없습니다. 시작 시간을 확인해주세요.")
        
        # 걸음수 챌린지 검사
        if data.get("challenge_type") == "steps":
            steps_settings = data.get("steps_settings")
            if not steps_settings or not steps_settings.get("target_steps"):
                raise ValidationError("목표 걸음수를 설정해주세요.")

    def _validate_challenge_update(self, existing: Dict[str, Any], data: Dict[str, Any]) -> None:
        """챌린지 수정 시 유효성 검사"""
        # 챌린지 유형 변경 불가
        if "challenge_type" in data and data["challenge_type"] != existing.get("challenge_type"):
            raise ValidationError("수정 시 챌린지 타입 변경은 불가능 합니다. 다른 유형의 챌린지는 신규로 생성해주세요.")
        
        # 기본 유효성 검사
        merged_data = {**existing, **{k: v for k, v in data.items() if v is not None}}
        
        # 제목 길이 검사
        if "title" in data:
            title = data.get("title", "")
            if len(title) > 20:
                raise ValidationError("챌린지명은 최대 20자까지 입력 가능합니다.")

    def _build_type_settings(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """유형별 상세설정 구성"""
        challenge_type = data.get("challenge_type")
        settings = {}
        
        if challenge_type == "steps" and "steps_settings" in data:
            settings = data["steps_settings"]
        elif challenge_type == "attendance" and "attendance_settings" in data:
            settings = data["attendance_settings"]
        elif challenge_type == "health_habit" and "health_habit_settings" in data:
            settings = data["health_habit_settings"]
        
        return settings


class QuizService:
    """퀴즈 관리 서비스 (App DB 사용)"""

    def __init__(self):
        self.sql = get_sql("challenges")

    @auto_commit
    async def get_quizzes(
        self,
        quiz_name: Optional[str] = None,
        quiz_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        _conn=None
    ) -> Dict[str, Any]:
        """퀴즈 목록 조회"""
        offset = (page - 1) * limit
        
        params = {
            "quiz_name": quiz_name,
            "quiz_type": quiz_type,
            "limit": limit,
            "offset": offset
        }
        
        async with app_db_manager.get_async_conn() as conn:
            # 전체 개수 조회
            count_query = self.sql.get("count_quizzes")
            async with conn.cursor() as cur:
                await cur.execute(count_query, params)
                count_result = await cur.fetchone()
                total = count_result["total"] if count_result else 0
            
            # 목록 조회
            list_query = self.sql.get("get_quizzes_list")
            async with conn.cursor() as cur:
                await cur.execute(list_query, params)
                quizzes = await cur.fetchall()
        
        total_pages = (total + limit - 1) // limit
        
        return {
            "items": quizzes,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }

    @auto_commit
    async def get_quiz_by_id(
        self,
        quiz_id: str,
        _conn=None
    ) -> Optional[Dict[str, Any]]:
        """퀴즈 상세 조회"""
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("get_quiz_by_id")
            async with conn.cursor() as cur:
                await cur.execute(query, {"quiz_id": quiz_id})
                quiz = await cur.fetchone()
        
        if not quiz:
            raise NotFoundError(f"퀴즈를 찾을 수 없습니다: {quiz_id}")
        
        return dict(quiz)

    @auto_commit
    async def create_quiz(
        self,
        data: Dict[str, Any],
        created_by: str,
        _conn=None
    ) -> Dict[str, Any]:
        """퀴즈 생성"""
        # 유효성 검사
        self._validate_quiz_data(data)
        
        params = {
            "quiz_name": data.get("quiz_name"),
            "quiz_type": data.get("quiz_type"),
            "question": data.get("question"),
            "options": json.dumps(data.get("options", [])),
            "correct_answers": json.dumps(data.get("correct_answers", [])),
            "hint": data.get("hint"),
            "created_by": created_by
        }
        
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("insert_quiz")
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                result = await cur.fetchone()
            await conn.commit()
        
        return dict(result) if result else {}

    @auto_commit
    async def update_quiz(
        self,
        quiz_id: str,
        data: Dict[str, Any],
        updated_by: str,
        _conn=None
    ) -> Dict[str, Any]:
        """퀴즈 수정"""
        params = {
            "quiz_id": quiz_id,
            "quiz_name": data.get("quiz_name"),
            "question": data.get("question"),
            "options": json.dumps(data["options"]) if "options" in data else None,
            "correct_answers": json.dumps(data["correct_answers"]) if "correct_answers" in data else None,
            "hint": data.get("hint"),
            "updated_by": updated_by
        }
        
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("update_quiz")
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                result = await cur.fetchone()
            await conn.commit()
        
        return dict(result) if result else {}

    @auto_commit
    async def delete_quizzes(
        self,
        quiz_ids: List[str],
        deleted_by: str,
        _conn=None
    ) -> int:
        """퀴즈 삭제"""
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("delete_quizzes_batch")
            async with conn.cursor() as cur:
                await cur.execute(query, {
                    "quiz_ids": quiz_ids,
                    "updated_by": deleted_by
                })
                results = await cur.fetchall()
            await conn.commit()
        
        return len(results)

    @auto_commit
    async def get_challenge_quizzes(
        self,
        challenge_id: str,
        _conn=None
    ) -> List[Dict[str, Any]]:
        """챌린지에 연결된 퀴즈 목록 조회"""
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("get_challenge_quizzes")
            async with conn.cursor() as cur:
                await cur.execute(query, {"challenge_id": challenge_id})
                quizzes = await cur.fetchall()
        
        return [dict(q) for q in quizzes]

    @auto_commit
    async def add_quiz_to_challenge(
        self,
        challenge_id: str,
        quiz_id: str,
        display_order: Optional[int] = None,
        _conn=None
    ) -> Dict[str, Any]:
        """챌린지에 퀴즈 추가"""
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("add_quiz_to_challenge")
            async with conn.cursor() as cur:
                await cur.execute(query, {
                    "challenge_id": challenge_id,
                    "quiz_id": quiz_id,
                    "display_order": display_order
                })
                result = await cur.fetchone()
            await conn.commit()
        
        return dict(result) if result else {}

    @auto_commit
    async def remove_quiz_from_challenge(
        self,
        challenge_id: str,
        quiz_id: str,
        _conn=None
    ) -> bool:
        """챌린지에서 퀴즈 제거"""
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("remove_quiz_from_challenge")
            async with conn.cursor() as cur:
                await cur.execute(query, {
                    "challenge_id": challenge_id,
                    "quiz_id": quiz_id
                })
                result = await cur.fetchone()
            await conn.commit()
        
        return result is not None

    @auto_commit
    async def get_quiz_challenges(
        self,
        title: Optional[str] = None,
        visibility_scope: Optional[List[str]] = None,
        status: Optional[List[str]] = None,
        operation_from: Optional[date] = None,
        operation_to: Optional[date] = None,
        recruitment_from: Optional[date] = None,
        recruitment_to: Optional[date] = None,
        display_from: Optional[date] = None,
        display_to: Optional[date] = None,
        _conn=None
    ) -> List[Dict[str, Any]]:
        """퀴즈 챌린지 목록 조회"""
        params = {
            "title": title,
            "operation_from": operation_from,
            "operation_to": operation_to,
            "recruitment_from": recruitment_from,
            "recruitment_to": recruitment_to,
            "display_from": display_from,
            "display_to": display_to
        }
        
        async with app_db_manager.get_async_conn() as conn:
            query = self.sql.get("get_quiz_challenges_list")
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                challenges = await cur.fetchall()
        
        # 공개범위, 상태 필터 적용
        result = [dict(c) for c in challenges]
        
        if visibility_scope:
            result = [
                c for c in result 
                if any(scope in (c.get("visibility_scope") or []) for scope in visibility_scope)
            ]
        
        if status:
            result = [
                c for c in result 
                if c.get("challenge_status") in status
            ]
        
        return result

    def _validate_quiz_data(self, data: Dict[str, Any]) -> None:
        """퀴즈 데이터 유효성 검사"""
        quiz_type = data.get("quiz_type")
        options = data.get("options", [])
        
        # 다지선다: 선지 5개
        if quiz_type == "multiple_choice":
            if len(options) != 5:
                raise ValidationError("다지선다 퀴즈는 선지 5개가 필요합니다.")
        
        # O/X 퀴즈: 선지 2개 (O, X)
        elif quiz_type == "ox":
            if len(options) != 2:
                raise ValidationError("O,X 퀴즈는 선지 2개가 필요합니다.")
        
        # 정답 검사
        correct_answers = data.get("correct_answers", [])
        if not correct_answers:
            raise ValidationError("정답을 선택해주세요.")
        
        for idx in correct_answers:
            if idx < 0 or idx >= len(options):
                raise ValidationError("올바른 정답을 선택해주세요.")

