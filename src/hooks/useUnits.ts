// ============================================
// 단위 마스터 Hook
// ============================================
// FastAPI 백엔드 연동

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';

// 단위 타입
export interface UnitCode {
  id: number;
  category: string;
  unit_name: string;
  display_order: number;
  is_active: boolean;
}

// 단위 카테고리별 그룹
export type UnitsByCategory = Record<string, UnitCode[]>;

interface UnitsResponse {
  success: boolean;
  data: UnitCode[];
  grouped: UnitsByCategory;
}

interface UnitsByCategoryResponse {
  success: boolean;
  data: UnitCode[];
  grouped: UnitsByCategory;
}

// 전체 단위 조회 (카테고리별 그룹화)
export function useUnits() {
  const { data, error, isLoading } = useSWR<UnitsResponse>(
    '/admin/units',
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    units: data?.grouped || {},
    allUnits: data?.data || [],
    isLoading,
    error,
  };
}

// 특정 카테고리의 단위 조회
export function useUnitsByCategory(category: string) {
  const { data, error, isLoading } = useSWR<UnitsByCategoryResponse>(
    category ? `/admin/units?category=${encodeURIComponent(category)}` : null,
    swrFetcher,
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
