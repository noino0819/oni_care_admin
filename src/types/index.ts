// ============================================
// 공통 타입 정의
// ============================================

// API 응답 형식
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: PaginationInfo;
}

// 페이지네이션 정보
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 정렬 설정
export interface SortConfig {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

// 테이블 컬럼 정의
export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

// 조회조건 타입
export interface SearchCondition {
  field: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'checkbox' | 'multiSelect';
  label: string;
  required?: boolean;
  options?: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
}

// 메뉴 아이템
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: SubMenuItem[];
}

export interface SubMenuItem {
  id: string;
  label: string;
  path: string;
}

// 최근 사용 메뉴
export interface RecentMenu {
  id: string;
  label: string;
  path: string;
  visitedAt: Date;
}

// 검색 결과
export interface SearchResult {
  menuId: string;
  menuLabel: string;
  parentLabel?: string;
  path: string;
  matchScore: number;
}

// 세션 타이머
export interface SessionTimer {
  remainingSeconds: number;
  isExpired: boolean;
  formattedTime: string;
}

// Breadcrumb
export interface BreadcrumbItem {
  label: string;
  path?: string;
}

// 권한
export interface Permission {
  menuId: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// 어드민 사용자
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  organization?: string;
}

// 회원 정보 (리스트용)
export interface MemberListItem {
  id: string;
  email: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  member_type: string;
  business_code: string | null;
  phone: string | null;
  created_at: string;
}

// 회원 정보 (상세)
export interface MemberDetail extends MemberListItem {
  is_fs_member: boolean;
  is_active: boolean;
  height: number | null;
  weight: number | null;
  diseases: string[];
  interests: string[];
  marketing_push_agreed: boolean;
  marketing_sms_agreed: boolean;
  last_login: string | null;
  total_points: number;
}

// 회원 검색 필터
export interface MemberSearchFilters {
  name?: string;
  id?: string;
  birth_year?: string;
  birth_month?: string;
  birth_day?: string;
  gender?: string;
  member_types?: string[];
  phone?: string;
  business_code?: string;
  created_from?: string;
  created_to?: string;
}

// 리스트 요청
export interface ListRequest {
  filters: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
}

