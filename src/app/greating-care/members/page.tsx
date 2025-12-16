'use client';

// ============================================
// 회원정보 관리 페이지
// ============================================

import { useState, useCallback } from 'react';
import { AdminLayout, Breadcrumb } from '@/components/layout';
import {
  Button,
  Input,
  Select,
  CheckboxGroup,
  DataTable,
  Pagination,
  DateRangePicker,
  AlertModal,
} from '@/components/common';
import { MemberDetailModal } from './MemberDetailModal';
import { useMembers } from '@/hooks/useMembers';
import {
  maskEmail,
  maskName,
  maskBirthDate,
  maskPhone,
  formatDate,
  generateYearOptions,
  generateMonthOptions,
  generateDayOptions,
  getGenderLabel,
} from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import type { MemberSearchFilters, SortConfig, TableColumn, MemberListItem } from '@/types';

const MEMBER_TYPE_OPTIONS = [
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

const GENDER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

export default function MembersPage() {
  // 검색 필터 상태
  const [filters, setFilters] = useState<MemberSearchFilters>({
    name: '',
    id: '',
    birth_year: '',
    birth_month: '',
    birth_day: '',
    gender: '',
    member_types: [],
    phone: '',
    business_code: '',
    created_from: '',
    created_to: '',
  });

  // 조회 트리거 (조회 버튼 클릭 시 true)
  const [searchTriggered, setSearchTriggered] = useState(false);
  
  // 정렬 상태
  const [sort, setSort] = useState<SortConfig>({ field: 'created_at', direction: 'desc' });
  
  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  
  // 모달 상태
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 날짜 범위 상태
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // 데이터 조회
  const { members, pagination, isLoading, refetch } = useMembers(
    filters,
    sort,
    page,
    20,
    searchTriggered
  );

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof MemberSearchFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 조회 버튼 클릭
  const handleSearch = () => {
    // 조회조건 검증 (최소 1개 이상 필수)
    const hasFilter = Object.entries(filters).some(([key, value]) => {
      if (key === 'member_types') return Array.isArray(value) && value.length > 0;
      return value !== '' && value !== undefined;
    });

    if (!hasFilter) {
      setAlertMessage('조회조건 중 1개 이상 입력해주세요.');
      return;
    }

    setPage(1);
    setSearchTriggered(true);
    refetch();
  };

  // 새로고침 버튼 클릭
  const handleRefresh = () => {
    setFilters({
      name: '',
      id: '',
      birth_year: '',
      birth_month: '',
      birth_day: '',
      gender: '',
      member_types: [],
      phone: '',
      business_code: '',
      created_from: '',
      created_to: '',
    });
    setStartDate(null);
    setEndDate(null);
    setSort({ field: 'created_at', direction: 'desc' });
    setPage(1);
    setSearchTriggered(false);
  };

  // 정렬 변경
  const handleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  }, []);

  // 날짜 선택 핸들러
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date) {
      handleFilterChange('created_from', date.toISOString().split('T')[0]);
    } else {
      handleFilterChange('created_from', '');
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    if (date) {
      handleFilterChange('created_to', date.toISOString().split('T')[0]);
    } else {
      handleFilterChange('created_to', '');
    }
  };

  // 테이블 컬럼 정의
  const columns: TableColumn<MemberListItem>[] = [
    {
      key: 'email',
      label: 'ID',
      sortable: true,
      render: (value) => maskEmail(value as string),
    },
    {
      key: 'name',
      label: '고객명',
      sortable: true,
      render: (value) => maskName(value as string),
    },
    {
      key: 'birth_date',
      label: '생년월일',
      sortable: true,
      render: (value) => value ? maskBirthDate(value as string) : '-',
    },
    {
      key: 'gender',
      label: '성별',
      sortable: true,
      render: (value) => getGenderLabel(value as string),
    },
    {
      key: 'member_type',
      label: '회원구분',
      sortable: false,
    },
    {
      key: 'business_code',
      label: '기업/사업자 코드',
      sortable: true,
      render: (value) => (value as string) || '-',
    },
    {
      key: 'phone',
      label: '휴대폰 번호',
      sortable: true,
      render: (value) => value ? maskPhone(value as string) : '-',
    },
    {
      key: 'created_at',
      label: '가입일',
      sortable: true,
      render: (value) => formatDate(value as string),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">회원정보 관리</h1>
            <Breadcrumb
              items={[
                { label: '시스템 관리' },
                { label: '그리팅 케어' },
                { label: '회원정보 관리' },
              ]}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>조회</Button>
            <Button variant="secondary" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 조회조건 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 고객명 */}
            <Input
              label="고객명"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              placeholder="고객명 입력"
            />

            {/* ID */}
            <Input
              label="ID"
              value={filters.id}
              onChange={(e) => handleFilterChange('id', e.target.value)}
              placeholder="ID 입력"
            />

            {/* 생년월일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
              <div className="flex gap-2">
                <Select
                  options={[{ value: '', label: '년' }, ...generateYearOptions()]}
                  value={filters.birth_year}
                  onChange={(value) => handleFilterChange('birth_year', value)}
                />
                <Select
                  options={[{ value: '', label: '월' }, ...generateMonthOptions()]}
                  value={filters.birth_month}
                  onChange={(value) => handleFilterChange('birth_month', value)}
                />
                <Select
                  options={[{ value: '', label: '일' }, ...generateDayOptions()]}
                  value={filters.birth_day}
                  onChange={(value) => handleFilterChange('birth_day', value)}
                />
              </div>
            </div>

            {/* 성별 */}
            <Select
              label="성별"
              options={GENDER_OPTIONS}
              value={filters.gender}
              onChange={(value) => handleFilterChange('gender', value)}
            />

            {/* 회원구분 */}
            <div className="lg:col-span-2">
              <CheckboxGroup
                label="회원구분"
                options={MEMBER_TYPE_OPTIONS}
                values={filters.member_types || []}
                onChange={(values) => handleFilterChange('member_types', values)}
              />
            </div>

            {/* 휴대폰 번호 */}
            <Input
              label="휴대폰 번호"
              value={filters.phone}
              onChange={(e) => handleFilterChange('phone', e.target.value)}
              placeholder="010********"
            />

            {/* 기업/사업장 코드 */}
            <Input
              label="기업/사업장 코드"
              value={filters.business_code}
              onChange={(e) => handleFilterChange('business_code', e.target.value)}
              placeholder="코드 입력"
            />

            {/* 가입일 */}
            <div className="lg:col-span-2">
              <DateRangePicker
                label="가입일"
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={members}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={(row) => setSelectedMemberId(row.id)}
          isLoading={isLoading}
          emptyMessage={searchTriggered ? '조회 결과가 없습니다.' : '조회조건을 입력 후 조회해주세요.'}
          getRowKey={(row) => row.id}
        />

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* 회원 상세 모달 */}
      <MemberDetailModal
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </AdminLayout>
  );
}

