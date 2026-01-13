// ============================================
// 메뉴 구조 정의
// ============================================

import type { MenuItem } from '@/types';

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: 'home',
    path: '/dashboard',
  },
  {
    id: 'greating-x',
    label: '그리팅-X 관리',
    icon: 'chart',
    children: [
      { id: 'greating-x-1', label: '그리팅-X 관리', path: '/greating-x/manage' },
      { id: 'greating-x-survey-permission', label: '설문 권한 관리', path: '/greating-x/permissions/survey' },
      { id: 'greating-x-admin-users', label: '관리자 회원 조회', path: '/greating-x/account/admin-users' },
      { id: 'greating-x-store-customers', label: '지점별 고객 조회', path: '/greating-x/account/store-customers' },
      { id: 'greating-x-access-logs', label: '접속로그', path: '/greating-x/access-logs' },
      { id: 'greating-x-personal-logs', label: '개인정보 접근로그', path: '/greating-x/personal-info-logs' },
    ],
  },
  {
    id: 'greating-care',
    label: '그리팅케어',
    icon: 'clipboard',
    children: [
      { id: 'care-members', label: '회원정보 관리', path: '/greating-care/members' },
      { id: 'care-contents', label: '컨텐츠 관리', path: '/greating-care/contents' },
      { id: 'care-categories', label: '컨텐츠 카테고리 관리', path: '/greating-care/categories' },
      { id: 'care-points', label: '포인트 관리', path: '/greating-care/points' },
      { id: 'care-notices', label: '공지사항 관리', path: '/greating-care/notices' },
      { id: 'care-challenges', label: '챌린지 관리', path: '/greating-care/challenges' },
      { id: 'care-challenge-quizzes', label: '챌린지 퀴즈 관리', path: '/greating-care/challenge-quizzes' },
      { id: 'care-supplements', label: '영양제 DB 관리', path: '/greating-care/supplements' },
      { id: 'care-supplement-corners', label: '영양제 코너 관리', path: '/greating-care/supplement-corners' },
      { id: 'care-meal-records', label: '식사기록 관리', path: '/greating-care/meal-records' },
      { id: 'care-coupons', label: '쿠폰 관리', path: '/greating-care/coupons' },
      { id: 'care-banners', label: '배너 관리', path: '/greating-care/banners' },
      { id: 'care-consents', label: '동의내용 관리', path: '/greating-care/consents' },
      { id: 'care-push-notifications', label: 'PUSH 관리', path: '/greating-care/push-notifications' },
      { id: 'care-health-goal-types', label: '건강목표 유형 관리', path: '/greating-care/health-goal-types' },
    ],
  },
  {
    id: 'admin',
    label: '어드민',
    icon: 'user',
    children: [
      { id: 'admin-users', label: '어드민 회원 조회', path: '/admin/admin-users' },
      { id: 'admin-roles', label: '역할 관리', path: '/admin/roles' },
      { id: 'admin-role-menu-permissions', label: '역할별 메뉴권한 관리', path: '/admin/role-menu-permissions' },
      { id: 'admin-api-permissions', label: 'API 권한 관리', path: '/admin/api-permissions' },
      { id: 'admin-menus', label: '어드민 메뉴 관리', path: '/admin/menus' },
    ],
  },
  {
    id: 'settings',
    label: '설정',
    icon: 'settings',
    children: [
      { id: 'settings-system', label: '환경설정', path: '/settings/system-settings' },
      { id: 'settings-code-master', label: '공통 코드 마스터', path: '/settings/common-codes/master' },
      { id: 'settings-code-detail', label: '공통 코드 상세', path: '/settings/common-codes/detail' },
      { id: 'settings-companies', label: '회사 및 조직 관리', path: '/settings/companies' },
    ],
  },
];

// 모든 서브메뉴 플랫 리스트 (검색용)
export function getAllSubMenus(): { menuId: string; menuLabel: string; parentLabel: string; path: string }[] {
  const result: { menuId: string; menuLabel: string; parentLabel: string; path: string }[] = [];
  
  for (const menu of menuItems) {
    if (menu.children) {
      for (const sub of menu.children) {
        result.push({
          menuId: sub.id,
          menuLabel: sub.label,
          parentLabel: menu.label,
          path: sub.path,
        });
      }
    } else if (menu.path) {
      result.push({
        menuId: menu.id,
        menuLabel: menu.label,
        parentLabel: '',
        path: menu.path,
      });
    }
  }
  
  return result;
}

// 메뉴 검색
export function searchMenus(query: string): { menuId: string; menuLabel: string; parentLabel: string; path: string }[] {
  if (!query.trim()) return [];
  
  const allMenus = getAllSubMenus();
  const lowerQuery = query.toLowerCase();
  
  return allMenus
    .filter((menu) => menu.menuLabel.toLowerCase().includes(lowerQuery))
    .slice(0, 5); // 최대 5개
}

