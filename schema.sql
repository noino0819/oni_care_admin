-- ============================================
-- GreatingCare Admin Database Schema
-- ============================================

-- 1. 시스템 환경설정 테이블
CREATE TABLE IF NOT EXISTS public.system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_name VARCHAR(200) NOT NULL,
  setting_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX idx_system_settings_is_active ON public.system_settings(is_active);

COMMENT ON TABLE public.system_settings IS '시스템 환경설정';
COMMENT ON COLUMN public.system_settings.setting_key IS '환경변수 키';
COMMENT ON COLUMN public.system_settings.setting_name IS '환경변수 명칭';
COMMENT ON COLUMN public.system_settings.setting_value IS '환경변수 값';
COMMENT ON COLUMN public.system_settings.description IS '설명';
COMMENT ON COLUMN public.system_settings.is_active IS '사용여부';

-- 2. 공통 코드 마스터 테이블
CREATE TABLE IF NOT EXISTS public.common_code_master (
  id SERIAL PRIMARY KEY,
  code_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_common_code_master_code_name ON public.common_code_master(code_name);
CREATE INDEX idx_common_code_master_is_active ON public.common_code_master(is_active);

COMMENT ON TABLE public.common_code_master IS '공통 코드 마스터';
COMMENT ON COLUMN public.common_code_master.code_name IS '마스터 코드명';
COMMENT ON COLUMN public.common_code_master.description IS '코드 설명';
COMMENT ON COLUMN public.common_code_master.is_active IS '사용여부';

-- 3. 공통 코드 테이블
CREATE TABLE IF NOT EXISTS public.common_codes (
  id SERIAL PRIMARY KEY,
  master_id INTEGER NOT NULL REFERENCES public.common_code_master(id) ON DELETE CASCADE,
  code_value VARCHAR(50) NOT NULL,
  code_name VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  extra_field1 VARCHAR(500),
  extra_field2 VARCHAR(500),
  extra_field3 VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(master_id, code_value)
);

CREATE INDEX idx_common_codes_master_id ON public.common_codes(master_id);
CREATE INDEX idx_common_codes_is_active ON public.common_codes(is_active);
CREATE INDEX idx_common_codes_sort_order ON public.common_codes(sort_order);

COMMENT ON TABLE public.common_codes IS '공통 코드';
COMMENT ON COLUMN public.common_codes.master_id IS '마스터 코드 ID (FK)';
COMMENT ON COLUMN public.common_codes.code_value IS '코드 값';
COMMENT ON COLUMN public.common_codes.code_name IS '코드명';
COMMENT ON COLUMN public.common_codes.description IS '코드 설명';
COMMENT ON COLUMN public.common_codes.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.common_codes.extra_field1 IS '추가 필드 1';
COMMENT ON COLUMN public.common_codes.extra_field2 IS '추가 필드 2';
COMMENT ON COLUMN public.common_codes.extra_field3 IS '추가 필드 3';
COMMENT ON COLUMN public.common_codes.is_active IS '사용여부';

-- 4. 관리자 접속 로그 테이블
CREATE TABLE IF NOT EXISTS public.admin_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  device_type VARCHAR(50),
  os VARCHAR(50),
  browser VARCHAR(100),
  ip_address VARCHAR(45),
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_access_logs_user_id ON public.admin_access_logs(user_id);
CREATE INDEX idx_admin_access_logs_login_at ON public.admin_access_logs(login_at);
CREATE INDEX idx_admin_access_logs_device_type ON public.admin_access_logs(device_type);

COMMENT ON TABLE public.admin_access_logs IS '관리자 접속 로그';
COMMENT ON COLUMN public.admin_access_logs.user_id IS '사용자 ID';
COMMENT ON COLUMN public.admin_access_logs.user_name IS '사용자 이름';
COMMENT ON COLUMN public.admin_access_logs.device_type IS '디바이스 타입';
COMMENT ON COLUMN public.admin_access_logs.os IS '운영체제';
COMMENT ON COLUMN public.admin_access_logs.browser IS '브라우저';
COMMENT ON COLUMN public.admin_access_logs.ip_address IS 'IP 주소';
COMMENT ON COLUMN public.admin_access_logs.login_at IS '로그인 시간';
COMMENT ON COLUMN public.admin_access_logs.logout_at IS '로그아웃 시간';

-- 5. 개인정보 접근 로그 테이블
CREATE TABLE IF NOT EXISTS public.personal_info_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(50),
  user_name VARCHAR(100),
  business_code VARCHAR(50),
  survey_id VARCHAR(50),
  device_type VARCHAR(50),
  os VARCHAR(50),
  browser VARCHAR(100),
  ip_address VARCHAR(45),
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_personal_info_logs_user_id ON public.personal_info_access_logs(user_id);
CREATE INDEX idx_personal_info_logs_business_code ON public.personal_info_access_logs(business_code);
CREATE INDEX idx_personal_info_logs_survey_id ON public.personal_info_access_logs(survey_id);
CREATE INDEX idx_personal_info_logs_login_at ON public.personal_info_access_logs(login_at);

COMMENT ON TABLE public.personal_info_access_logs IS '개인정보 접근 로그';
COMMENT ON COLUMN public.personal_info_access_logs.user_id IS '사용자 ID';
COMMENT ON COLUMN public.personal_info_access_logs.user_name IS '사용자 이름';
COMMENT ON COLUMN public.personal_info_access_logs.business_code IS '사업장 코드';
COMMENT ON COLUMN public.personal_info_access_logs.survey_id IS '설문 ID';
COMMENT ON COLUMN public.personal_info_access_logs.device_type IS '디바이스 타입';
COMMENT ON COLUMN public.personal_info_access_logs.os IS '운영체제';
COMMENT ON COLUMN public.personal_info_access_logs.browser IS '브라우저';
COMMENT ON COLUMN public.personal_info_access_logs.ip_address IS 'IP 주소';
COMMENT ON COLUMN public.personal_info_access_logs.login_at IS '로그인 시간';
COMMENT ON COLUMN public.personal_info_access_logs.logout_at IS '로그아웃 시간';

-- 6. 회사 테이블
CREATE TABLE IF NOT EXISTS public.companies (
  id SERIAL PRIMARY KEY,
  company_code VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_company_code ON public.companies(company_code);
CREATE INDEX idx_companies_company_name ON public.companies(company_name);
CREATE INDEX idx_companies_is_active ON public.companies(is_active);

COMMENT ON TABLE public.companies IS '회사';
COMMENT ON COLUMN public.companies.company_code IS '회사 코드';
COMMENT ON COLUMN public.companies.company_name IS '회사명';
COMMENT ON COLUMN public.companies.note IS '비고';
COMMENT ON COLUMN public.companies.is_active IS '사용여부';

-- 7. 부서/조직 테이블
CREATE TABLE IF NOT EXISTS public.departments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_code VARCHAR(50) NOT NULL,
  department_name VARCHAR(200) NOT NULL,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, department_code)
);

CREATE INDEX idx_departments_company_id ON public.departments(company_id);
CREATE INDEX idx_departments_department_code ON public.departments(department_code);
CREATE INDEX idx_departments_is_active ON public.departments(is_active);

COMMENT ON TABLE public.departments IS '부서/조직';
COMMENT ON COLUMN public.departments.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN public.departments.department_code IS '부서 코드';
COMMENT ON COLUMN public.departments.department_name IS '부서명';
COMMENT ON COLUMN public.departments.note IS '비고';
COMMENT ON COLUMN public.departments.is_active IS '사용여부';

-- 8. 보안 그룹 테이블
CREATE TABLE IF NOT EXISTS public.security_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_groups_group_name ON public.security_groups(group_name);
CREATE INDEX idx_security_groups_is_active ON public.security_groups(is_active);

COMMENT ON TABLE public.security_groups IS '보안 그룹';
COMMENT ON COLUMN public.security_groups.group_name IS '보안그룹명';
COMMENT ON COLUMN public.security_groups.description IS '설명';
COMMENT ON COLUMN public.security_groups.is_active IS '사용여부';
COMMENT ON COLUMN public.security_groups.created_by IS '생성자';
COMMENT ON COLUMN public.security_groups.updated_by IS '변경자';

-- 9. 보안 그룹 항목 테이블
CREATE TABLE IF NOT EXISTS public.security_group_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.security_groups(id) ON DELETE CASCADE,
  entry_path VARCHAR(50),
  company_code VARCHAR(50),
  company_name VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_group_items_group_id ON public.security_group_items(group_id);
CREATE INDEX idx_security_group_items_company_code ON public.security_group_items(company_code);
CREATE INDEX idx_security_group_items_is_active ON public.security_group_items(is_active);

COMMENT ON TABLE public.security_group_items IS '보안 그룹 항목 (지점)';
COMMENT ON COLUMN public.security_group_items.group_id IS '보안그룹 ID (FK)';
COMMENT ON COLUMN public.security_group_items.entry_path IS '진입경로 코드';
COMMENT ON COLUMN public.security_group_items.company_code IS '회사 코드';
COMMENT ON COLUMN public.security_group_items.company_name IS '회사/지점명';
COMMENT ON COLUMN public.security_group_items.is_active IS '사용여부';

-- 10. 관리자 회원 테이블
-- 기존 테이블 구조 (이미 존재하는 경우 ALTER로 컬럼 추가)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'admin',
  status INTEGER DEFAULT 1,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 추가 컬럼 (기획서 요구사항)
  login_id VARCHAR(100),
  employee_name VARCHAR(100),
  department_id INTEGER REFERENCES public.departments(id),
  company_id INTEGER REFERENCES public.companies(id),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_login_id ON public.admin_users(login_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_employee_name ON public.admin_users(employee_name);
CREATE INDEX IF NOT EXISTS idx_admin_users_company_id ON public.admin_users(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_department_id ON public.admin_users(department_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

COMMENT ON TABLE public.admin_users IS '관리자 회원';
COMMENT ON COLUMN public.admin_users.email IS '이메일 (로그인용)';
COMMENT ON COLUMN public.admin_users.login_id IS '로그인 ID (사번)';
COMMENT ON COLUMN public.admin_users.password_hash IS '비밀번호 해시';
COMMENT ON COLUMN public.admin_users.name IS '이름 (기존)';
COMMENT ON COLUMN public.admin_users.employee_name IS '직원명';
COMMENT ON COLUMN public.admin_users.department_id IS '부서 ID (FK)';
COMMENT ON COLUMN public.admin_users.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN public.admin_users.phone IS '핸드폰 번호';
COMMENT ON COLUMN public.admin_users.is_active IS '사용여부';
COMMENT ON COLUMN public.admin_users.status IS '회원상태 (1=활성, 0=비활성)';
COMMENT ON COLUMN public.admin_users.created_by IS '생성자';
COMMENT ON COLUMN public.admin_users.updated_by IS '변경자';

-- 11. 지점별 고객 테이블
CREATE TABLE IF NOT EXISTS public.store_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_code VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  first_store_id UUID,
  authorized_stores UUID[],
  push_agreed BOOLEAN DEFAULT false,
  sms_agreed BOOLEAN DEFAULT false,
  registered_at DATE,
  joined_at DATE,
  last_visit_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_store_customers_member_code ON public.store_customers(member_code);
CREATE INDEX idx_store_customers_customer_name ON public.store_customers(customer_name);
CREATE INDEX idx_store_customers_phone ON public.store_customers(phone);
CREATE INDEX idx_store_customers_first_store_id ON public.store_customers(first_store_id);
CREATE INDEX idx_store_customers_last_visit_at ON public.store_customers(last_visit_at);
CREATE INDEX idx_store_customers_registered_at ON public.store_customers(registered_at);

COMMENT ON TABLE public.store_customers IS '지점별 고객';
COMMENT ON COLUMN public.store_customers.member_code IS '회원코드';
COMMENT ON COLUMN public.store_customers.customer_name IS '고객명';
COMMENT ON COLUMN public.store_customers.phone IS '휴대폰번호';
COMMENT ON COLUMN public.store_customers.first_store_id IS '최초등록지점 ID';
COMMENT ON COLUMN public.store_customers.authorized_stores IS '권한지점 목록';
COMMENT ON COLUMN public.store_customers.push_agreed IS '푸시 수신 동의';
COMMENT ON COLUMN public.store_customers.sms_agreed IS 'SMS 수신 동의';
COMMENT ON COLUMN public.store_customers.registered_at IS '등록일';
COMMENT ON COLUMN public.store_customers.joined_at IS '가입일';
COMMENT ON COLUMN public.store_customers.last_visit_at IS '최근방문일';

-- ============================================
-- 12. 역할 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(20) NOT NULL UNIQUE,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roles_role_code ON public.roles(role_code);
CREATE INDEX idx_roles_role_name ON public.roles(role_name);
CREATE INDEX idx_roles_is_active ON public.roles(is_active);

COMMENT ON TABLE public.roles IS '역할';
COMMENT ON COLUMN public.roles.role_code IS '역할 코드';
COMMENT ON COLUMN public.roles.role_name IS '역할명';
COMMENT ON COLUMN public.roles.description IS '설명';
COMMENT ON COLUMN public.roles.is_active IS '사용여부';
COMMENT ON COLUMN public.roles.created_by IS '생성자';
COMMENT ON COLUMN public.roles.updated_by IS '변경자';

-- ============================================
-- 13. 어드민 메뉴 테이블 (계층 구조)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_menus (
  id SERIAL PRIMARY KEY,
  menu_name VARCHAR(100) NOT NULL,
  menu_path VARCHAR(200),
  parent_id INTEGER REFERENCES public.admin_menus(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_menus_parent_id ON public.admin_menus(parent_id);
CREATE INDEX idx_admin_menus_depth ON public.admin_menus(depth);
CREATE INDEX idx_admin_menus_sort_order ON public.admin_menus(sort_order);
CREATE INDEX idx_admin_menus_is_active ON public.admin_menus(is_active);

COMMENT ON TABLE public.admin_menus IS '어드민 메뉴';
COMMENT ON COLUMN public.admin_menus.menu_name IS '메뉴명';
COMMENT ON COLUMN public.admin_menus.menu_path IS '메뉴 경로';
COMMENT ON COLUMN public.admin_menus.parent_id IS '상위 메뉴 ID';
COMMENT ON COLUMN public.admin_menus.depth IS '메뉴 깊이 (1, 2, 3)';
COMMENT ON COLUMN public.admin_menus.sort_order IS '정렬 순서';
COMMENT ON COLUMN public.admin_menus.icon IS '아이콘';
COMMENT ON COLUMN public.admin_menus.is_active IS '사용여부';

-- ============================================
-- 14. 역할별 메뉴 권한 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  menu_id INTEGER NOT NULL REFERENCES public.admin_menus(id) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, menu_id)
);

CREATE INDEX idx_role_menu_permissions_role_id ON public.role_menu_permissions(role_id);
CREATE INDEX idx_role_menu_permissions_menu_id ON public.role_menu_permissions(menu_id);
CREATE INDEX idx_role_menu_permissions_is_active ON public.role_menu_permissions(is_active);

COMMENT ON TABLE public.role_menu_permissions IS '역할별 메뉴 권한';
COMMENT ON COLUMN public.role_menu_permissions.role_id IS '역할 ID';
COMMENT ON COLUMN public.role_menu_permissions.menu_id IS '메뉴 ID';
COMMENT ON COLUMN public.role_menu_permissions.can_read IS '읽기 권한';
COMMENT ON COLUMN public.role_menu_permissions.can_write IS '쓰기 권한';
COMMENT ON COLUMN public.role_menu_permissions.can_update IS '수정 권한';
COMMENT ON COLUMN public.role_menu_permissions.can_delete IS '삭제 권한';
COMMENT ON COLUMN public.role_menu_permissions.can_export IS '엑셀 권한';
COMMENT ON COLUMN public.role_menu_permissions.is_active IS '사용여부';

-- ============================================
-- 15. API 마스터 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_apis (
  id SERIAL PRIMARY KEY,
  api_name VARCHAR(100) NOT NULL,
  api_path VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_apis_api_name ON public.admin_apis(api_name);
CREATE INDEX idx_admin_apis_api_path ON public.admin_apis(api_path);
CREATE INDEX idx_admin_apis_is_active ON public.admin_apis(is_active);

COMMENT ON TABLE public.admin_apis IS 'API 마스터';
COMMENT ON COLUMN public.admin_apis.api_name IS 'API명';
COMMENT ON COLUMN public.admin_apis.api_path IS 'API 경로';
COMMENT ON COLUMN public.admin_apis.description IS '설명';
COMMENT ON COLUMN public.admin_apis.is_active IS '사용여부';

-- ============================================
-- 16. 역할별 API 권한 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_api_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  api_id INTEGER NOT NULL REFERENCES public.admin_apis(id) ON DELETE CASCADE,
  is_permitted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, api_id)
);

CREATE INDEX idx_role_api_permissions_role_id ON public.role_api_permissions(role_id);
CREATE INDEX idx_role_api_permissions_api_id ON public.role_api_permissions(api_id);
CREATE INDEX idx_role_api_permissions_is_active ON public.role_api_permissions(is_active);

COMMENT ON TABLE public.role_api_permissions IS '역할별 API 권한';
COMMENT ON COLUMN public.role_api_permissions.role_id IS '역할 ID';
COMMENT ON COLUMN public.role_api_permissions.api_id IS 'API ID';
COMMENT ON COLUMN public.role_api_permissions.is_permitted IS '허가 여부';
COMMENT ON COLUMN public.role_api_permissions.is_active IS '사용여부';

-- ============================================
-- 17. 어드민 회원-역할 매핑 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_user_id, role_id)
);

CREATE INDEX idx_admin_user_roles_admin_user_id ON public.admin_user_roles(admin_user_id);
CREATE INDEX idx_admin_user_roles_role_id ON public.admin_user_roles(role_id);

COMMENT ON TABLE public.admin_user_roles IS '어드민 회원-역할 매핑';
COMMENT ON COLUMN public.admin_user_roles.admin_user_id IS '어드민 회원 ID';
COMMENT ON COLUMN public.admin_user_roles.role_id IS '역할 ID';

-- ============================================
-- 18. 그리팅-X 관리자 회원 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.greating_x_admin_users (
  id SERIAL PRIMARY KEY,
  login_id VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  department_name VARCHAR(100),
  company_id INTEGER REFERENCES public.companies(id),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  status INTEGER DEFAULT 1,
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_greating_x_admin_users_login_id ON public.greating_x_admin_users(login_id);
CREATE INDEX idx_greating_x_admin_users_employee_name ON public.greating_x_admin_users(employee_name);
CREATE INDEX idx_greating_x_admin_users_company_id ON public.greating_x_admin_users(company_id);
CREATE INDEX idx_greating_x_admin_users_is_active ON public.greating_x_admin_users(is_active);

COMMENT ON TABLE public.greating_x_admin_users IS '그리팅-X 관리자 회원';
COMMENT ON COLUMN public.greating_x_admin_users.login_id IS '로그인 ID (사번)';
COMMENT ON COLUMN public.greating_x_admin_users.password_hash IS '비밀번호 해시';
COMMENT ON COLUMN public.greating_x_admin_users.employee_name IS '직원명';
COMMENT ON COLUMN public.greating_x_admin_users.department_name IS '부서명';
COMMENT ON COLUMN public.greating_x_admin_users.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN public.greating_x_admin_users.phone IS '핸드폰 번호';
COMMENT ON COLUMN public.greating_x_admin_users.is_active IS '사용여부';
COMMENT ON COLUMN public.greating_x_admin_users.status IS '회원상태 (1=활성, 0=비활성)';
COMMENT ON COLUMN public.greating_x_admin_users.created_by IS '생성자';
COMMENT ON COLUMN public.greating_x_admin_users.updated_by IS '변경자';

-- ============================================
-- 19. 컨텐츠 카테고리 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_categories (
  id SERIAL PRIMARY KEY,
  category_type VARCHAR(50) NOT NULL DEFAULT 'interest',  -- 'interest', 'disease', 'exercise'
  category_name VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES public.content_categories(id) ON DELETE CASCADE,  -- NULL이면 대분류, 있으면 중분류
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_categories_category_type ON public.content_categories(category_type);
CREATE INDEX idx_content_categories_parent_id ON public.content_categories(parent_id);
CREATE INDEX idx_content_categories_display_order ON public.content_categories(display_order);
CREATE INDEX idx_content_categories_is_active ON public.content_categories(is_active);

COMMENT ON TABLE public.content_categories IS '컨텐츠 카테고리';
COMMENT ON COLUMN public.content_categories.category_type IS '카테고리 유형 (관심사, 질병, 운동)';
COMMENT ON COLUMN public.content_categories.category_name IS '카테고리명';
COMMENT ON COLUMN public.content_categories.subcategory_types IS '중분류 유형';
COMMENT ON COLUMN public.content_categories.description IS '설명';
COMMENT ON COLUMN public.content_categories.display_order IS '정렬순서';
COMMENT ON COLUMN public.content_categories.is_active IS '사용여부';

-- ============================================
-- 20. 컨텐츠 중분류 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  subcategory_name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_subcategories_category_id ON public.content_subcategories(category_id);
CREATE INDEX idx_content_subcategories_display_order ON public.content_subcategories(display_order);
CREATE INDEX idx_content_subcategories_is_active ON public.content_subcategories(is_active);

COMMENT ON TABLE public.content_subcategories IS '컨텐츠 중분류';
COMMENT ON COLUMN public.content_subcategories.category_id IS '대분류 ID (FK)';
COMMENT ON COLUMN public.content_subcategories.subcategory_name IS '중분류명';
COMMENT ON COLUMN public.content_subcategories.display_order IS '정렬순서';
COMMENT ON COLUMN public.content_subcategories.is_active IS '사용여부';

-- ============================================
-- 21. 컨텐츠 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER REFERENCES public.content_categories(id),
  subcategory_id INTEGER REFERENCES public.content_subcategories(id),
  title VARCHAR(500) NOT NULL,
  content TEXT,
  thumbnail_url TEXT,
  detail_images TEXT[] DEFAULT '{}',
  background_color VARCHAR(20),
  card_style VARCHAR(20) DEFAULT 'A',
  -- 추가 필드 (2026-01-02)
  tags TEXT[] DEFAULT '{}',
  visibility_scope TEXT[] DEFAULT '{all}',
  company_codes TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  store_visible BOOLEAN DEFAULT false,
  quote_content TEXT,
  quote_source TEXT,
  has_quote BOOLEAN DEFAULT false,
  -- 상태 필드
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  -- 감사 필드
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contents_category_id ON public.contents(category_id);
CREATE INDEX idx_contents_subcategory_id ON public.contents(subcategory_id);
CREATE INDEX idx_contents_is_published ON public.contents(is_published);
CREATE INDEX idx_contents_start_date ON public.contents(start_date);
CREATE INDEX idx_contents_end_date ON public.contents(end_date);
CREATE INDEX idx_contents_visibility_scope ON public.contents USING GIN(visibility_scope);
CREATE INDEX idx_contents_tags ON public.contents USING GIN(tags);
CREATE INDEX idx_contents_updated_at ON public.contents(updated_at);

COMMENT ON TABLE public.contents IS '컨텐츠';
COMMENT ON COLUMN public.contents.category_id IS '대분류 ID (FK)';
COMMENT ON COLUMN public.contents.subcategory_id IS '중분류 ID (FK)';
COMMENT ON COLUMN public.contents.title IS '컨텐츠 제목';
COMMENT ON COLUMN public.contents.content IS '컨텐츠 본문';
COMMENT ON COLUMN public.contents.thumbnail_url IS '썸네일 URL';
COMMENT ON COLUMN public.contents.tags IS '태그 배열';
COMMENT ON COLUMN public.contents.visibility_scope IS '공개범위 (all, normal, affiliate, fs)';
COMMENT ON COLUMN public.contents.company_codes IS '기업/사업장 코드 배열';
COMMENT ON COLUMN public.contents.start_date IS '게시 시작일';
COMMENT ON COLUMN public.contents.end_date IS '게시 종료일';
COMMENT ON COLUMN public.contents.store_visible IS '스토어 노출 여부';
COMMENT ON COLUMN public.contents.quote_content IS '명언 내용';
COMMENT ON COLUMN public.contents.quote_source IS '명언 출처';
COMMENT ON COLUMN public.contents.has_quote IS '명언 포함 여부';
COMMENT ON COLUMN public.contents.is_published IS '게시 여부';
COMMENT ON COLUMN public.contents.created_by IS '생성자';
COMMENT ON COLUMN public.contents.updated_by IS '수정자';

-- ============================================
-- 22. 컨텐츠-카테고리 다대다 매핑 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_category_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, category_id)
);

CREATE INDEX idx_content_category_mapping_content_id ON public.content_category_mapping(content_id);
CREATE INDEX idx_content_category_mapping_category_id ON public.content_category_mapping(category_id);

COMMENT ON TABLE public.content_category_mapping IS '컨텐츠-카테고리 매핑';
COMMENT ON COLUMN public.content_category_mapping.content_id IS '컨텐츠 ID (FK)';
COMMENT ON COLUMN public.content_category_mapping.category_id IS '카테고리 ID (FK)';

-- ============================================
-- 23. 컨텐츠 미디어 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.content_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'thumbnail')),
  media_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  alt_text VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_media_content_id ON public.content_media(content_id);
CREATE INDEX idx_content_media_display_order ON public.content_media(display_order);

COMMENT ON TABLE public.content_media IS '컨텐츠 미디어';
COMMENT ON COLUMN public.content_media.content_id IS '컨텐츠 ID (FK)';
COMMENT ON COLUMN public.content_media.media_type IS '미디어 타입 (image, video, thumbnail)';
COMMENT ON COLUMN public.content_media.media_url IS '미디어 URL';
COMMENT ON COLUMN public.content_media.display_order IS '표시 순서';
COMMENT ON COLUMN public.content_media.alt_text IS '대체 텍스트';

-- ============================================
-- 24. 공지사항 테이블 (App DB - oni_care_app)
-- ============================================
-- 참고: 이 테이블은 App DB에 이미 존재함
-- 아래는 현재 실제 구조를 문서화한 것
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  visibility_scope TEXT[] DEFAULT ARRAY['all'],
  company_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  store_visible BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_title ON public.notices(title);
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON public.notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON public.notices(created_at);
CREATE INDEX IF NOT EXISTS idx_notices_start_date ON public.notices(start_date);
CREATE INDEX IF NOT EXISTS idx_notices_end_date ON public.notices(end_date);

COMMENT ON TABLE public.notices IS '공지사항';
COMMENT ON COLUMN public.notices.title IS '공지 제목';
COMMENT ON COLUMN public.notices.content IS '공지 내용';
COMMENT ON COLUMN public.notices.image_url IS '이미지 URL';
COMMENT ON COLUMN public.notices.visibility_scope IS '노출 범위 (all, normal, affiliate, fs)';
COMMENT ON COLUMN public.notices.company_codes IS '기업/사업장 코드 목록';
COMMENT ON COLUMN public.notices.store_visible IS '스토어 공개 여부';
COMMENT ON COLUMN public.notices.start_date IS '공지 시작일';
COMMENT ON COLUMN public.notices.end_date IS '공지 종료일';
COMMENT ON COLUMN public.notices.is_active IS '활성화 여부';

-- ============================================
-- 25. 챌린지 관리 테이블 (어드민용 확장)
-- ============================================
-- 쿠폰 마스터 테이블 (챌린지 보상용)
CREATE TABLE IF NOT EXISTS public.coupon_master (
  id SERIAL PRIMARY KEY,
  coupon_code VARCHAR(50) NOT NULL UNIQUE,
  coupon_name VARCHAR(200) NOT NULL,
  coupon_type VARCHAR(50) DEFAULT 'discount',  -- discount, free_item, etc
  discount_value INTEGER DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'fixed',  -- fixed, percentage
  min_order_amount INTEGER DEFAULT 0,
  max_discount_amount INTEGER,
  valid_days INTEGER DEFAULT 30,  -- 발급 후 유효기간
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coupon_master_code ON public.coupon_master(coupon_code);
CREATE INDEX idx_coupon_master_is_active ON public.coupon_master(is_active);

COMMENT ON TABLE public.coupon_master IS '쿠폰 마스터 (챌린지 보상용)';
COMMENT ON COLUMN public.coupon_master.coupon_code IS '쿠폰 코드';
COMMENT ON COLUMN public.coupon_master.coupon_name IS '쿠폰명';
COMMENT ON COLUMN public.coupon_master.coupon_type IS '쿠폰 유형';
COMMENT ON COLUMN public.coupon_master.discount_value IS '할인 금액/율';
COMMENT ON COLUMN public.coupon_master.discount_type IS '할인 타입 (정액/정률)';

-- ============================================
-- 26. PUSH 알림 관리 테이블 (App DB 사용)
-- ============================================
-- ⚠️ 이 테이블은 oni_care(앱) DB에 위치합니다.
-- 어드민에서는 app_db_manager를 통해 접근합니다.
-- 테이블 정의: oni_care/backend/db/schema.sql 참조

-- ============================================
-- 27. 건강목표 유형 관리 테이블 (App DB 사용)
-- ============================================
-- ⚠️ 이 테이블은 oni_care(앱) DB에 위치합니다.
-- 어드민에서는 app_db_manager를 통해 접근합니다.
-- 테이블 정의: oni_care/backend/db/schema.sql 참조

