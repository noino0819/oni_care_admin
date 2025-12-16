// ============================================
// 유틸리티 함수
// ============================================

import { type ClassValue, clsx } from 'clsx';

// 클래스 병합 (tailwind-merge 없이 간단 구현)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 데이터 마스킹 함수들
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.slice(0, 3) + '***';
  return `${maskedLocal}@${domain}`;
}

export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export function maskBirthDate(birthDate: string): string {
  if (!birthDate) return '';
  // YYYY-MM-DD 형식에서 년도 마지막 2자리 + ** 로 표시
  const year = birthDate.slice(2, 4);
  return `${year}**`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  // 010-****-1234 형식
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 8) return phone;
  const last4 = cleaned.slice(-4);
  return `010-****-${last4}`;
}

export function maskId(id: string): string {
  if (!id) return '';
  // 앞 6자리 + ***
  if (id.length <= 6) return id;
  return id.slice(0, 6) + '***';
}

// 날짜 포맷팅
export function formatDate(dateString: string, format: 'YYYY.MM.DD' | 'YYYY-MM-DD' = 'YYYY.MM.DD'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (format === 'YYYY.MM.DD') {
    return `${year}.${month}.${day}`;
  }
  return `${year}-${month}-${day}`;
}

// 시간 포맷팅 (세션 타이머용)
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// 성별 라벨
export function getGenderLabel(gender: string | null): string {
  if (!gender) return '';
  switch (gender) {
    case 'male': return '남성';
    case 'female': return '여성';
    case 'other': return '기타';
    default: return gender;
  }
}

// 회원 구분 라벨
export function getMemberTypeLabel(isFsMember: boolean, businessCode?: string | null): string {
  if (isFsMember) return 'FS';
  if (businessCode) return '제휴사';
  return '일반';
}

// 년도 옵션 생성 (1925 ~ 2012)
export function generateYearOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let year = 2012; year >= 1925; year--) {
    options.push({ value: String(year), label: `${year}년` });
  }
  return options;
}

// 월 옵션 생성
export function generateMonthOptions(): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${i + 1}월`,
  }));
}

// 일 옵션 생성
export function generateDayOptions(): { value: string; label: string }[] {
  return Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${i + 1}일`,
  }));
}

// HTML 태그 제거 (XSS 방어)
export function sanitizeText(text: string): string {
  return String(text || '').replace(/<[^>]*>/g, '');
}

// 안전한 에러 메시지 반환
export function getSafeErrorMessage(status?: number): string {
  switch (status) {
    case 400:
      return '입력 정보를 확인해주세요.';
    case 401:
      return '인증에 실패했습니다.';
    case 403:
      return '접근 권한이 없습니다.';
    case 404:
      return '요청하신 정보를 찾을 수 없습니다.';
    default:
      return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

