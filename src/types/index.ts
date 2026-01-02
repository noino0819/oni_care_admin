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
  linked_accounts?: {
    greating_id: string | null;
    greating_linked_at: string | null;
    cafeteria_id: string | null;
    cafeteria_linked_at: string | null;
    greating_x_code: string | null;
    greating_x_linked_at: string | null;
  };
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

// ============================================
// 그리팅 케어 관련 타입 정의
// ============================================

// 회원 수정 폼
export interface MemberUpdateForm {
  name: string;
  birth_date: string;
  gender: string;
  member_type: string;
  business_code: string;
  phone: string;
  is_active: boolean;
  marketing_sms_agreed: boolean;
  marketing_push_agreed: boolean;
  diseases: string[];
  interests: string[];
}

// 회원 연동 정보
export interface MemberLinkedAccounts {
  greating_id: string | null;
  greating_linked_at: string | null;
  cafeteria_id: string | null;
  cafeteria_linked_at: string | null;
  greating_x_code: string | null;
  greating_x_linked_at: string | null;
}

// 컨텐츠 리스트 아이템
export interface ContentListItem {
  id: string;
  title: string;
  category_names: string[];
  tags: string[];
  visibility_scope: string[];
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
  updated_by: string | null;
  has_quote: boolean;
}

// 컨텐츠 상세
export interface ContentDetail extends ContentListItem {
  content: string;
  thumbnail_url: string | null;
  category_ids: number[];
  company_codes: string[];
  is_store_visible: boolean;
  quote_content: string | null;
  quote_source: string | null;
  images: ContentImage[];
  detail_images: string[];
  category_id: number | null;
  subcategory_id: number | null;
}

// 컨텐츠 이미지
export interface ContentImage {
  id: string;
  media_url: string;
  display_order: number;
}

// 컨텐츠 등록/수정 폼
export interface ContentForm {
  title: string;
  content: string;
  thumbnail_url?: string | null;
  category_ids?: number[];
  tags?: string[];
  visibility_scope?: string[];
  company_codes?: string[];
  is_store_visible?: boolean;
  start_date?: string;
  end_date?: string;
  has_quote?: boolean;
  quote_content?: string;
  quote_source?: string;
  images?: string[];
  detail_images?: string[];
}

// 컨텐츠 검색 필터
export interface ContentSearchFilters {
  title?: string;
  category_id?: number;
  tag?: string;
  visibility_scope?: string[];
  company_code?: string;
  updated_from?: string;
  updated_to?: string;
  start_from?: string;
  start_to?: string;
  has_quote?: string;
}

// 대분류 카테고리
export interface ContentCategory {
  id: number;
  category_type: string;
  category_name: string;
  subcategory_types: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategory_count?: number;
}

// 중분류 카테고리
export interface ContentSubcategory {
  id: number;
  category_id: number;
  category_name?: string;
  subcategory_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 대분류 등록/수정 폼
export interface CategoryForm {
  category_type: string;
  category_name: string;
  subcategory_types: string;
  display_order: number;
  is_active?: boolean;
}

// 중분류 등록/수정 폼
export interface SubcategoryForm {
  category_id: number;
  subcategory_name: string;
  display_order: number;
  is_active?: boolean;
}

// 카테고리 검색 필터
export interface CategorySearchFilters {
  category_name?: string;
  subcategory_name?: string;
  is_active?: string;
}

// 포인트 현황 아이템
export interface PointSummary {
  user_id: string;
  email: string;
  name: string;
  member_type: string;
  business_code: string | null;
  total_points: number;
}

// 포인트 내역 아이템
export interface PointHistoryItem {
  id: string;
  user_id: string;
  email: string;
  transaction_type: 'earn' | 'use' | 'transfer' | 'expire';
  source: string;
  source_detail: string | null;
  points: number;
  balance_after: number;
  created_at: string;
  is_revoked: boolean;
}

// 포인트 검색 필터
export interface PointSearchFilters {
  name?: string;
  id?: string;
  member_types?: string[];
  business_code?: string;
  min_points?: number;
  max_points?: number;
  transaction_type?: string;
  created_from?: string;
  created_to?: string;
}

// 공지사항 리스트 아이템
export interface NoticeListItem {
  id: string;
  title: string;
  visibility_scope: string[];
  company_codes: string[];
  start_date: string | null;
  end_date: string | null;
  status: 'before' | 'active' | 'ended';
  created_at: string;
}

// 공지사항 상세
export interface NoticeDetail extends NoticeListItem {
  content: string;
  image_url: string | null;
  store_visible: boolean;
}

// 공지사항 등록/수정 폼
export interface NoticeForm {
  title: string;
  content: string;
  image_url: string | null;
  visibility_scope: string[];
  company_codes: string[];
  store_visible: boolean;
  start_date: string;
  end_date: string;
}

// 공지사항 검색 필터
export interface NoticeSearchFilters {
  title?: string;
  status?: string[];
  visibility_scope?: string[];
  company_code?: string;
  created_from?: string;
  created_to?: string;
}

// ============================================
// 그리팅-X 관리자 회원
// ============================================

export interface GreatingXAdminUser {
  id: number;
  login_id: string;
  password_hash?: string;
  employee_name: string;
  department_name: string | null;
  company_id: number | null;
  company_name?: string;
  phone: string | null;
  is_active: boolean;
  status: number;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface GreatingXAdminUserForm {
  login_id: string;
  password?: string;
  employee_name: string;
  department_name: string;
  company_id: number | null;
  phone: string;
  is_active: boolean;
}

export interface GreatingXAdminUserSearchFilters {
  login_id?: string;
  employee_name?: string;
  department_name?: string;
  company_name?: string;
}

