-- ============================================
-- 인증 관련 SQL
-- ============================================

-- query_name: get_user_by_email
-- 이메일로 사용자 조회
SELECT id, email, password_hash, name, role, status
FROM admin_users
WHERE email = %(email)s;

-- query_name: get_user_by_id
-- ID로 사용자 조회
SELECT id, email, name, role
FROM admin_users
WHERE id = %(user_id)s AND status = 1;

-- query_name: update_last_login
-- 마지막 로그인 시간 업데이트
UPDATE admin_users
SET last_login = NOW()
WHERE id = %(user_id)s;

-- query_name: insert_login_log
-- 로그인 로그 기록
INSERT INTO admin_login_logs (admin_id, admin_email, ip_address, user_agent)
VALUES (%(admin_id)s, %(email)s, %(ip)s, %(user_agent)s);


