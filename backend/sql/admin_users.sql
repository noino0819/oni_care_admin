-- ============================================
-- 관리자 회원 관련 SQL
-- ============================================

-- query_name: count_admin_users
-- 관리자 회원 수 조회
SELECT COUNT(*) as count
FROM public.admin_users au
LEFT JOIN public.companies c ON au.company_id = c.id
LEFT JOIN public.departments d ON au.department_id = d.id
{where_clause};

-- query_name: list_admin_users
-- 관리자 회원 목록 조회
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
LIMIT %(limit)s OFFSET %(offset)s;

-- query_name: get_admin_user_by_id
-- ID로 관리자 회원 조회
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
WHERE au.id = %(user_id)s;

-- query_name: insert_admin_user
-- 관리자 회원 등록
INSERT INTO public.admin_users 
    (email, login_id, password_hash, name, employee_name, 
     department_id, company_id, phone, is_active, status, created_by)
VALUES 
    (%(email)s, %(login_id)s, %(password_hash)s, %(name)s, %(employee_name)s,
     %(department_id)s, %(company_id)s, %(phone)s, %(is_active)s, %(status)s, %(created_by)s)
RETURNING id, email, login_id, name, employee_name, department_id, company_id, 
          phone, is_active, status, created_by, created_at;

-- query_name: delete_admin_user
-- 관리자 회원 삭제
DELETE FROM public.admin_users WHERE id = %(user_id)s;

-- query_name: reset_password
-- 비밀번호 초기화
UPDATE public.admin_users
SET password_hash = %(password_hash)s, updated_at = NOW()
WHERE id = %(user_id)s;


