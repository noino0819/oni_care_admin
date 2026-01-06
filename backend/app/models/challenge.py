"""
파일: app/models/challenge.py
설명: 챌린지 관리 관련 Pydantic 모델
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ============================================
# Enum 정의
# ============================================

class ChallengeType(str, Enum):
    """챌린지 유형"""
    ATTENDANCE = "attendance"       # 출석체크
    STEPS = "steps"                 # 걸음수
    MEAL = "meal"                   # 식사기록
    SUPPLEMENT = "supplement"       # 영양제 기록
    NUTRITION_SURVEY = "nutrition_survey"  # 영양설문
    HEALTH_HABIT = "health_habit"   # 건강습관
    QUIZ = "quiz"                   # 퀴즈


class VerificationMethod(str, Enum):
    """인증 방식"""
    ROULETTE = "roulette"   # 룰렛
    AUTO = "auto"           # 자동체크
    MANUAL = "manual"       # 수기체크


class ChallengeStatus(str, Enum):
    """챌린지 상태"""
    DRAFT = "draft"                       # 임시저장
    RECRUITING = "recruiting"             # 모집중
    RECRUITMENT_CLOSED = "recruitment_closed"  # 모집완료
    IN_PROGRESS = "in_progress"           # 진행중
    SUSPENDED = "suspended"               # 중단
    COMPLETED = "completed"               # 진행완료
    ENDED = "ended"                       # 종료


class RankDisplayType(str, Enum):
    """등수 공개 방식"""
    LIVE = "live"       # 선공개 (진행중 공개)
    AFTER = "after"     # 후공개 (종료 후 공개)
    HIDDEN = "hidden"   # 미공개


class RewardType(str, Enum):
    """보상 유형"""
    POINT = "point"
    COUPON = "coupon"


class QuizType(str, Enum):
    """퀴즈 유형"""
    MULTIPLE_CHOICE = "multiple_choice"  # 다지선다
    OX = "ox"                             # O/X 퀴즈


# ============================================
# 일일 인증 설정
# ============================================

class DailyVerificationSetting(BaseModel):
    """일일 인증 설정"""
    slot: int = Field(ge=1, le=3, description="회차 (1~3)")
    enabled: bool = True
    start_time: str = Field(default="00:01", description="시작 시간 (HH:MM)")
    end_time: str = Field(default="24:00", description="종료 시간 (HH:MM)")
    push_enabled: bool = False
    push_message: Optional[str] = Field(None, max_length=100, description="푸시 알림 문구")


# ============================================
# 보상 설정
# ============================================

class RewardSetting(BaseModel):
    """보상 설정 (인증 1회/하루/전체 달성 시)"""
    enabled: bool = False
    reward_type: RewardType = RewardType.POINT
    amount: Optional[int] = Field(None, ge=0, description="포인트 금액")
    coupon_type: Optional[str] = Field(None, description="쿠폰 종류")
    max_quantity: Optional[int] = Field(None, ge=0, description="최대 수량")


class RewardSettings(BaseModel):
    """전체 보상 설정"""
    single_achievement: Optional[RewardSetting] = Field(None, description="인증 1회 달성 시")
    daily_achievement: Optional[RewardSetting] = Field(None, description="하루 인증 달성 시")
    total_achievement: Optional[RewardSetting] = Field(None, description="전체 인증 달성 시")


# ============================================
# 유형별 상세설정
# ============================================

class StepsSettings(BaseModel):
    """걸음수 챌린지 설정"""
    target_steps: int = Field(default=10000, ge=1, le=30000, description="목표 걸음수")


class RouletteSegment(BaseModel):
    """룰렛 세그먼트"""
    slot: int = Field(ge=1, le=8)
    is_active: bool = True
    reward_type: RewardType = RewardType.POINT
    reward_value: int = Field(default=0, ge=0)  # 포인트 금액 또는 쿠폰 ID
    display_text: str = Field(max_length=20, description="혜택 노출 문구")
    daily_max_quantity: Optional[int] = Field(None, ge=0)
    total_max_quantity: Optional[int] = Field(None, ge=0)
    probability: float = Field(default=0.01, ge=0, le=1)


class AttendanceSettings(BaseModel):
    """출석체크 챌린지 설정 (룰렛)"""
    roulette_guide_text: Optional[str] = Field(None, max_length=30, description="룰렛 안내문구")
    roulette_segments: List[RouletteSegment] = Field(default_factory=list, min_length=6, max_length=8)


class HealthHabitSettings(BaseModel):
    """건강습관 챌린지 설정"""
    verification_button_text: Optional[str] = Field(None, max_length=15, description="인증버튼 문구")
    popup_text: Optional[str] = Field(None, max_length=30, description="팝업 문구")
    left_button_text: Optional[str] = Field(None, max_length=5, description="왼쪽 버튼")
    right_button_text: Optional[str] = Field(None, max_length=10, description="오른쪽 버튼")


# ============================================
# 이미지 설정
# ============================================

class ChallengeImages(BaseModel):
    """챌린지 이미지 설정"""
    thumbnail: Optional[str] = Field(None, description="썸네일 아이콘")
    total_achievement_success: Optional[str] = Field(None, description="전체 달성현황 성공")
    total_achievement_bg: Optional[str] = Field(None, description="전체 달성현황 배경")
    verification_header: Optional[str] = Field(None, description="인증화면 상단 이미지")
    today_achievement_bg: Optional[str] = Field(None, description="오늘의 달성현황 배경")
    today_achievement_success: Optional[str] = Field(None, description="오늘의 달성현황 성공")
    detail_pages: List[str] = Field(default_factory=list, max_length=10, description="상세페이지 이미지들")


# ============================================
# 챌린지 생성/수정 요청
# ============================================

class ChallengeCreateRequest(BaseModel):
    """챌린지 생성 요청"""
    # 기본 정보
    challenge_type: ChallengeType
    verification_method: VerificationMethod
    title: str = Field(max_length=20, description="챌린지명")
    subtitle: Optional[str] = Field(None, max_length=8, description="부제")
    description: Optional[str] = None
    
    # 모집 설정
    max_participants: Optional[int] = Field(None, ge=1, description="최대 모집인원")
    challenge_duration_days: int = Field(default=7, ge=1, le=30, description="챌린지 기간")
    display_order: int = Field(default=999, ge=1, description="노출순서")
    
    # 기간 설정
    recruitment_start_date: Optional[date] = None
    recruitment_end_date: Optional[date] = None
    operation_start_date: Optional[date] = None
    operation_end_date: Optional[date] = None
    display_start_date: Optional[date] = None
    display_end_date: Optional[date] = None
    
    # 공개범위 설정
    visibility_scope: List[str] = Field(default=["all"], description="공개범위")
    company_codes: List[str] = Field(default_factory=list, max_length=20, description="기업코드")
    store_visible: bool = False
    
    # 등수 공개 방식
    rank_display_type: RankDisplayType = RankDisplayType.HIDDEN
    
    # 인증 설정
    daily_verification_count: int = Field(default=1, ge=1, le=3)
    daily_verification_settings: List[DailyVerificationSetting] = Field(default_factory=list)
    daily_achievement_count: int = Field(default=1, ge=1, le=3)
    total_achievement_days: Optional[int] = Field(None, ge=1)
    
    # 보상 설정
    reward_settings: Optional[RewardSettings] = None
    
    # 유형별 상세설정
    steps_settings: Optional[StepsSettings] = None
    attendance_settings: Optional[AttendanceSettings] = None
    health_habit_settings: Optional[HealthHabitSettings] = None
    
    # 이미지 설정
    images: Optional[ChallengeImages] = None


class ChallengeUpdateRequest(BaseModel):
    """챌린지 수정 요청"""
    # 기본 정보 (유형은 변경 불가)
    title: Optional[str] = Field(None, max_length=20)
    subtitle: Optional[str] = Field(None, max_length=8)
    description: Optional[str] = None
    
    # 모집 설정
    max_participants: Optional[int] = Field(None, ge=1)
    challenge_duration_days: Optional[int] = Field(None, ge=1, le=30)
    display_order: Optional[int] = Field(None, ge=1)
    
    # 기간 설정
    recruitment_start_date: Optional[date] = None
    recruitment_end_date: Optional[date] = None
    operation_start_date: Optional[date] = None
    operation_end_date: Optional[date] = None
    display_start_date: Optional[date] = None
    display_end_date: Optional[date] = None
    
    # 공개범위 설정
    visibility_scope: Optional[List[str]] = None
    company_codes: Optional[List[str]] = None
    store_visible: Optional[bool] = None
    
    # 등수 공개 방식
    rank_display_type: Optional[RankDisplayType] = None
    
    # 중단 설정
    is_suspended: Optional[bool] = None
    
    # 인증 설정
    daily_verification_count: Optional[int] = Field(None, ge=1, le=3)
    daily_verification_settings: Optional[List[DailyVerificationSetting]] = None
    daily_achievement_count: Optional[int] = Field(None, ge=1, le=3)
    total_achievement_days: Optional[int] = Field(None, ge=1)
    
    # 보상 설정
    reward_settings: Optional[RewardSettings] = None
    
    # 유형별 상세설정
    steps_settings: Optional[StepsSettings] = None
    attendance_settings: Optional[AttendanceSettings] = None
    health_habit_settings: Optional[HealthHabitSettings] = None
    
    # 이미지 설정
    images: Optional[ChallengeImages] = None


# ============================================
# 챌린지 응답
# ============================================

class ChallengeListItem(BaseModel):
    """챌린지 목록 아이템"""
    id: str
    title: str
    challenge_type: str
    verification_method: str
    visibility_scope: List[str]
    company_codes: List[str]
    status: str
    operation_start_date: Optional[datetime]
    operation_end_date: Optional[datetime]
    recruitment_start_date: Optional[datetime]
    recruitment_end_date: Optional[datetime]
    display_start_date: Optional[datetime]
    display_end_date: Optional[datetime]
    max_participants: Optional[int]
    current_participants: int
    created_at: datetime
    updated_at: datetime


class ChallengeDetailResponse(BaseModel):
    """챌린지 상세 응답"""
    id: str
    challenge_type: str
    verification_method: str
    title: str
    subtitle: Optional[str]
    description: Optional[str]
    
    # 모집 설정
    max_participants: Optional[int]
    current_participants: int
    challenge_duration_days: int
    display_order: int
    
    # 기간 설정
    recruitment_start_date: Optional[datetime]
    recruitment_end_date: Optional[datetime]
    operation_start_date: Optional[datetime]
    operation_end_date: Optional[datetime]
    display_start_date: Optional[datetime]
    display_end_date: Optional[datetime]
    
    # 공개범위 설정
    visibility_scope: List[str]
    company_codes: List[str]
    store_visible: bool
    
    # 등수 공개 방식
    rank_display_type: str
    
    # 상태
    status: str
    is_suspended: bool
    
    # 인증 설정
    daily_verification_count: int
    daily_verification_settings: List[dict]
    daily_achievement_count: int
    total_achievement_days: Optional[int]
    
    # 보상 설정
    reward_settings: dict
    
    # 유형별 상세설정
    type_settings: dict
    
    # 이미지 설정
    images: dict
    
    # 감사 필드
    created_by: Optional[str]
    updated_by: Optional[str]
    created_at: datetime
    updated_at: datetime


# ============================================
# 퀴즈 관련 모델
# ============================================

class QuizOption(BaseModel):
    """퀴즈 선지"""
    text: str = Field(max_length=50, description="선지 텍스트")


class QuizCreateRequest(BaseModel):
    """퀴즈 생성 요청"""
    quiz_name: str = Field(max_length=100, description="퀴즈명 (20자 이내 권장)")
    quiz_type: QuizType
    question: str = Field(max_length=200, description="문제 (30자 이내 권장)")
    options: List[str] = Field(description="선지 배열")
    correct_answers: List[int] = Field(description="정답 인덱스 배열")
    hint: Optional[str] = Field(None, max_length=300, description="힌트 (50자 이내 권장)")


class QuizUpdateRequest(BaseModel):
    """퀴즈 수정 요청"""
    quiz_name: Optional[str] = Field(None, max_length=100)
    question: Optional[str] = Field(None, max_length=200)
    options: Optional[List[str]] = None
    correct_answers: Optional[List[int]] = None
    hint: Optional[str] = Field(None, max_length=300)


class QuizListItem(BaseModel):
    """퀴즈 목록 아이템"""
    id: str
    quiz_name: str
    quiz_type: str
    question: str
    hint: Optional[str]
    is_active: bool
    created_at: datetime


class QuizDetailResponse(BaseModel):
    """퀴즈 상세 응답"""
    id: str
    quiz_name: str
    quiz_type: str
    question: str
    options: List[str]
    correct_answers: List[int]
    hint: Optional[str]
    is_active: bool
    created_by: Optional[str]
    updated_by: Optional[str]
    created_at: datetime
    updated_at: datetime


# ============================================
# 검색 필터
# ============================================

class ChallengeSearchFilters(BaseModel):
    """챌린지 검색 필터"""
    title: Optional[str] = None
    challenge_type: Optional[ChallengeType] = None
    verification_method: Optional[VerificationMethod] = None
    visibility_scope: Optional[List[str]] = None
    status: Optional[List[str]] = None
    operation_from: Optional[date] = None
    operation_to: Optional[date] = None
    recruitment_from: Optional[date] = None
    recruitment_to: Optional[date] = None
    display_from: Optional[date] = None
    display_to: Optional[date] = None


class QuizSearchFilters(BaseModel):
    """퀴즈 검색 필터"""
    quiz_name: Optional[str] = None
    quiz_type: Optional[QuizType] = None

