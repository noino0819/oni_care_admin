'use client';

// ============================================
// 개인정보 접근로그 페이지 - 기획서 디자인 참고
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  DataTable,
  Pagination,
  AlertModal,
  SearchFilterPanel,
  SearchField,
  DateRangePicker,
} from '@/components/common';
import { RefreshCw } from 'lucide-react';
import type { PersonalInfoAccessLog, PersonalInfoAccessLogSearchFilters, TableColumn, PaginationInfo } from '@/types';
import { apiClient } from '@/lib/api-client';

// 마스킹 함수
function maskUserId(userId: string | null): string {
  if (!userId) return '-';
  if (userId.length <= 3) return userId;
  return userId.substring(0, 3) + '****';
}

function maskUserName(userName: string | null): string {
  if (!userName) return '-';
  if (userName.length <= 1) return userName;
  return userName.substring(0, 1) + '*' + userName.substring(userName.length - 1);
}

export default function PersonalInfoLogsPage() {
  // 조회 상태
  const [filters, setFilters] = useState<PersonalInfoAccessLogSearchFilters>({
    user_id: '',
    user_name: '',
    device_type: '',
    business_code: '',
    survey_id: '',
    login_from: '',
    login_to: '',
  });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [data, setData] = useState<PersonalInfoAccessLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 데이터 조회
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.user_id) params.set('user_id', filters.user_id);
      if (filters.user_name) params.set('user_name', filters.user_name);
      if (filters.device_type) params.set('device_type', filters.device_type);
      if (filters.business_code) params.set('business_code', filters.business_code);
      if (filters.survey_id) params.set('survey_id', filters.survey_id);
      if (startDate) params.set('login_from', startDate.toISOString().split('T')[0]);
      if (endDate) params.set('login_to', endDate.toISOString().split('T')[0]);
      params.set('page', page.toString());
      params.set('limit', '20');

      const result = await apiClient.get<PersonalInfoAccessLog[]>(`/admin/logs/personal-info?${params}`);

      if (result.success) {
        setData(result.data || []);
        setPagination(result.pagination || null);
      } else {
        setAlertMessage(result.error?.message || '조회 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, startDate, endDate, page]);

  // 조회 버튼 클릭
  const handleSearch = () => {
    setPage(1);
  };

  // 초기화 버튼 클릭
  const handleRefresh = () => {
    setFilters({
      user_id: '',
      user_name: '',
      device_type: '',
      business_code: '',
      survey_id: '',
      login_from: '',
      login_to: '',
    });
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  // 페이지 로드 및 조건 변경 시 데이터 조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 테이블 컬럼 정의
  const columns: TableColumn<PersonalInfoAccessLog>[] = [
    { 
      key: 'user_id', 
      label: '접속 ID', 
      width: 100,
      render: (value) => maskUserId(value as string),
    },
    { 
      key: 'user_name', 
      label: '접속자', 
      width: 80,
      render: (value) => maskUserName(value as string),
    },
    { 
      key: 'business_code', 
      label: '사업장 코드', 
      width: 100,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'survey_id', 
      label: '설문ID', 
      width: 120,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'device_type', 
      label: '디바이스', 
      width: 80,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'os', 
      label: 'OS', 
      width: 80,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'browser', 
      label: '브라우저', 
      width: 120,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'ip_address', 
      label: '접속 IP', 
      width: 120,
      render: (value) => (value as string) || '-',
    },
    { 
      key: 'login_at', 
      label: '로그인 시간', 
      width: 150,
      render: (value) => value ? new Date(value as string).toLocaleString('ko-KR') : '-',
    },
    { 
      key: 'logout_at', 
      label: '로그아웃 시간', 
      width: 150,
      render: (value) => value ? new Date(value as string).toLocaleString('ko-KR') : '-',
    },
  ];

  // 스타일
  const inputClass = "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">개인정보 접속로그</h1>
            <span className="text-[13px] text-[#888]">
              그리팅-X 관리 &gt; 시스템 로그 &gt; 개인정보 접근로그
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm">
              조회
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              size="sm"
              className="w-[32px] h-[28px] px-0 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 조회조건 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SearchField label="접속ID">
              <input
                type="text"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                className={`${inputClass} w-[120px]`}
              />
            </SearchField>
            <SearchField label="접속자">
              <input
                type="text"
                value={filters.user_name}
                onChange={(e) => setFilters({ ...filters, user_name: e.target.value })}
                className={`${inputClass} w-[120px]`}
              />
            </SearchField>
            <SearchField label="디바이스">
              <input
                type="text"
                value={filters.device_type}
                onChange={(e) => setFilters({ ...filters, device_type: e.target.value })}
                className={`${inputClass} w-[120px]`}
              />
            </SearchField>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <SearchField label="사업장 코드">
              <input
                type="text"
                value={filters.business_code}
                onChange={(e) => setFilters({ ...filters, business_code: e.target.value })}
                className={`${inputClass} w-[120px]`}
              />
            </SearchField>
            <SearchField label="설문 ID">
              <input
                type="text"
                value={filters.survey_id}
                onChange={(e) => setFilters({ ...filters, survey_id: e.target.value })}
                className={`${inputClass} w-[120px]`}
              />
            </SearchField>
            <SearchField label="접속일자">
              <div className="flex items-center gap-2">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            </SearchField>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={data}
          totalCount={pagination?.total}
          isLoading={isLoading}
          emptyMessage="조회 결과가 없습니다."
          getRowKey={(row) => row.id}
          title="영양설문 접속로그"
        />

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </AdminLayout>
  );
}

