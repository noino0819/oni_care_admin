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
export interface TableColumn<T = object> {
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

// ============================================
// 설정 메뉴 타입 정의
// ============================================

// 시스템 환경설정
export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_name: string;
  setting_value: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface SystemSettingForm {
  setting_key: string;
  setting_name: string;
  setting_value: string;
  description: string;
  is_active: boolean;
}

export interface SystemSettingSearchFilters {
  setting_key?: string;
  setting_name?: string;
  is_active?: string;
}

// 공통 코드 마스터
export interface CommonCodeMaster {
  id: number;
  code_name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CommonCodeMasterForm {
  code_name: string;
  description: string;
  is_active: boolean;
}

export interface CommonCodeMasterSearchFilters {
  code_name?: string;
  is_active?: string;
}

// 공통 코드
export interface CommonCode {
  id: number;
  master_id: number;
  code_value: string;
  code_name: string;
  description: string | null;
  sort_order: number;
  extra_field1: string | null;
  extra_field2: string | null;
  extra_field3: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CommonCodeForm {
  master_id: number;
  code_value: string;
  code_name: string;
  description: string;
  sort_order: number;
  extra_field1: string;
  extra_field2: string;
  extra_field3: string;
  is_active: boolean;
}

// 접속로그
export interface AccessLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  ip_address: string | null;
  login_at: string;
  logout_at: string | null;
  created_at: string;
}

export interface AccessLogSearchFilters {
  user_id?: string;
  user_name?: string;
  device_type?: string;
  login_from?: string;
  login_to?: string;
}

// 개인정보 접속로그
export interface PersonalInfoAccessLog extends AccessLog {
  business_code: string | null;
  survey_id: string | null;
}

export interface PersonalInfoAccessLogSearchFilters extends AccessLogSearchFilters {
  business_code?: string;
  survey_id?: string;
}

// 회사
export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  note: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface CompanyForm {
  company_code: string;
  company_name: string;
  note: string;
  is_active: boolean;
}

export interface CompanySearchFilters {
  company_code?: string;
  company_name?: string;
  department_code?: string;
  department_name?: string;
}

// 부서
export interface Department {
  id: number;
  company_id: number;
  department_code: string;
  department_name: string;
  note: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface DepartmentForm {
  company_id: number;
  department_code: string;
  department_name: string;
  note: string;
  is_active: boolean;
}

// ============================================
// 권한 관리 타입 정의
// ============================================

// 보안 그룹
export interface SecurityGroup {
  id: string;
  group_name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface SecurityGroupForm {
  group_name: string;
  description: string;
  is_active: boolean;
}

export interface SecurityGroupSearchFilters {
  group_name?: string;
  group_id?: string;
}

// 보안 그룹 항목 (지점)
export interface SecurityGroupItem {
  id: string;
  group_id: string;
  entry_path: string | null;
  company_code: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SecurityGroupItemForm {
  group_id: string;
  entry_path: string;
  company_code: string;
  company_name: string;
  is_active: boolean;
}

// ============================================
// 계정 관리 타입 정의
// ============================================

// 관리자 회원
export interface AdminUserAccount {
  id: number;
  email: string;
  name: string | null;
  role: string | null;
  login_id: string | null;
  password_hash?: string;
  employee_name: string | null;
  department_id: number | null;
  department_name?: string;
  company_id: number | null;
  company_name?: string;
  phone: string | null;
  is_active: boolean;
  status: number;
  last_login: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface AdminUserAccountForm {
  email?: string;
  login_id: string;
  password?: string;
  employee_name: string;
  department_id: number | null;
  company_id: number | null;
  phone: string;
  is_active: boolean;
}

export interface AdminUserSearchFilters {
  company_id?: number;
  company_name?: string;
  department_name?: string;
  employee_name?: string;
  login_id?: string;
}

// 지점별 고객
export interface StoreCustomer {
  id: string;
  member_code: string;
  customer_name: string;
  phone: string | null;
  first_store_id: string | null;
  first_store_name?: string;
  authorized_stores: string[] | null;
  authorized_store_names?: string[];
  push_agreed: boolean;
  sms_agreed: boolean;
  registered_at: string | null;
  joined_at: string | null;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreCustomerForm {
  member_code?: string;
  customer_name: string;
  phone: string;
  first_store_id: string | null;
  authorized_stores: string[];
  push_agreed: boolean;
  sms_agreed: boolean;
  registered_at: string | null;
  joined_at: string | null;
}

export interface StoreCustomerSearchFilters {
  store_id?: string;
  customer_name?: string;
  member_code?: string;
  receive_agreed?: string;
  last_visit_from?: string;
  last_visit_to?: string;
  registered_from?: string;
  registered_to?: string;
}

// ============================================
// 역할 관리 타입 정의
// ============================================

// 역할
export interface Role {
  id: number;
  role_code: string;
  role_name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface RoleForm {
  role_code?: string;
  role_name: string;
  description: string;
  is_active: boolean;
}

export interface RoleSearchFilters {
  role_name?: string;
  is_active?: string;
}

// 어드민 메뉴
export interface AdminMenu {
  id: number;
  menu_name: string;
  menu_path: string | null;
  parent_id: number | null;
  depth: number;
  sort_order: number;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: AdminMenu[];
}

export interface AdminMenuForm {
  menu_name: string;
  menu_path: string;
  parent_id: number | null;
  depth: number;
  sort_order: number;
  icon: string;
  is_active: boolean;
}

// 역할별 메뉴 권한
export interface RoleMenuPermission {
  id: number;
  role_id: number;
  menu_id: number;
  menu_name?: string;
  menu_path?: string;
  parent_id?: number | null;
  depth?: number;
  can_read: boolean;
  can_write: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleMenuPermissionForm {
  role_id: number;
  menu_id: number;
  can_read: boolean;
  can_write: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  is_active: boolean;
}

// API 마스터
export interface AdminApi {
  id: number;
  api_name: string;
  api_path: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminApiForm {
  api_name: string;
  api_path: string;
  description: string;
  is_active: boolean;
}

// 역할별 API 권한
export interface RoleApiPermission {
  id: number;
  role_id: number;
  api_id: number;
  api_name?: string;
  api_path?: string;
  description?: string;
  is_permitted: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RoleApiPermissionForm {
  role_id: number;
  api_id: number;
  is_permitted: boolean;
  is_active: boolean;
}

// 어드민 회원-역할 매핑
export interface AdminUserRole {
  id: number;
  admin_user_id: number;
  role_id: number;
  role_name?: string;
  role_code?: string;
  created_at: string;
}

