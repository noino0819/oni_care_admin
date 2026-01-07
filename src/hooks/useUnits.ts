// ============================================
// 단위 마스터 Hook
// ============================================

import useSWR from 'swr';

// 단위 타입
export interface UnitCode {
  id: number;
  master_id: number;
  unit_category_name: string;
  unit_value: string;
  unit_name: string;
  description: string | null;
  sort_order: number;
}

// 단위 카테고리별 그룹
export type UnitsByCategory = Record<string, UnitCode[]>;

interface UnitsResponse {
  success: boolean;
  data: UnitsByCategory;
}

interface UnitsByCategoryResponse {
  success: boolean;
  data: UnitCode[];
}

// Next.js API 라우트용 fetcher (내부 API) - 에러 시에도 안전하게 처리
const internalFetcher = async (url: string) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (!response.ok) {
      // 에러가 발생해도 기본값 반환 (단위 데이터가 없어도 페이지는 작동해야 함)
      console.warn(`[useUnits] API 에러: ${response.status}`);
      return { success: false, data: [] };
    }
    
    return response.json();
  } catch (error) {
    console.warn('[useUnits] 네트워크 에러:', error);
    return { success: false, data: [] };
  }
};

// 전체 단위 조회 (카테고리별 그룹화)
export function useUnits() {
  const { data, error, isLoading } = useSWR<UnitsResponse>(
    '/api/admin/units',
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    units: data?.data || {},
    isLoading,
    error,
  };
}

// 특정 카테고리의 단위 조회
export function useUnitsByCategory(category: string) {
  const { data, error, isLoading } = useSWR<UnitsByCategoryResponse>(
    category ? `/api/admin/units?category=${encodeURIComponent(category)}` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    units: data?.data || [],
    isLoading,
    error,
  };
}

// 제품형태 단위
export function useProductFormUnits() {
  return useUnitsByCategory('제품형태');
}

// 용량/섭취량 단위
export function useDosageUnits() {
  return useUnitsByCategory('용량/섭취량 단위');
}
