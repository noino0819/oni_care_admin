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

