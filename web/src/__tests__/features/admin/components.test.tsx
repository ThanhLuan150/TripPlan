// Shared admin components (AdminSidebar & co. are in layout.test.tsx).
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {IoPeopleOutline} from 'react-icons/io5';
import {describe, expect, it, vi} from 'vitest';
import AdminAvatar from '@/features/admin/components/AdminAvatar';
import AdminBarChart from '@/features/admin/components/AdminBarChart';
import AdminCard from '@/features/admin/components/AdminCard';
import AdminConfirmDialog from '@/features/admin/components/AdminConfirmDialog';
import AdminDataTable, {type AdminColumn} from '@/features/admin/components/AdminDataTable';
import AdminEmptyState from '@/features/admin/components/AdminEmptyState';
import AdminFilter from '@/features/admin/components/AdminFilter';
import AdminLoadingState from '@/features/admin/components/AdminLoadingState';
import AdminMeter from '@/features/admin/components/AdminMeter';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import AdminPagination from '@/features/admin/components/AdminPagination';
import AdminRowAction from '@/features/admin/components/AdminRowAction';
import AdminSearch from '@/features/admin/components/AdminSearch';
import AdminStatCard from '@/features/admin/components/AdminStatCard';
import AdminStatusBadge from '@/features/admin/components/AdminStatusBadge';
import NoResults from '@/features/admin/components/NoResults';
import {t} from '../../utils/render';

describe('AdminStatCard', () => {
  const card = (props: Partial<Parameters<typeof AdminStatCard>[0]> = {}) =>
    render(<AdminStatCard label="Người dùng" value="12.846" icon={IoPeopleOutline} {...props} />);

  it('shows the label and the value, and no change line without a delta', () => {
    card();

    expect(screen.getByText('Người dùng')).toBeInTheDocument();
    expect(screen.getByText('12.846')).toBeInTheDocument();
    expect(screen.queryByText(t('admin.common.increase'))).toBeNull();
  });

  it('shows a rise as good (green) with its period', () => {
    card({delta: 0.124, deltaLabel: 'so với tháng trước'});

    const change = screen.getByText(t('admin.common.increase')).parentElement!;
    expect(change).toHaveTextContent('12,4%');
    expect(change).toHaveClass('text-emerald-700');
    expect(screen.getByText('so với tháng trước')).toBeInTheDocument();
  });

  it('shows a fall as bad (red), unless less is better', () => {
    const {unmount} = card({delta: -0.032});
    expect(screen.getByText(t('admin.common.decrease')).parentElement).toHaveClass('text-rose-700');
    unmount();

    card({delta: -0.072, goodWhen: 'down'});
    expect(screen.getByText(t('admin.common.decrease')).parentElement).toHaveClass('text-emerald-700');
  });

  it('shows a rise as bad when less is better', () => {
    card({delta: 0.004, goodWhen: 'down'});
    expect(screen.getByText(t('admin.common.increase')).parentElement).toHaveClass('text-rose-700');
  });

  it('shows no change in grey', () => {
    card({delta: 0});
    expect(screen.getByText(t('admin.common.noChange')).parentElement).toHaveClass('text-slate-500');
  });
});

describe('AdminStatusBadge', () => {
  it.each(['success', 'warning', 'danger', 'info', 'neutral', 'brand'] as const)('renders the %s tone', tone => {
    render(<AdminStatusBadge tone={tone}>Nhãn</AdminStatusBadge>);
    expect(screen.getByText('Nhãn')).toBeInTheDocument();
  });

  it('colors differ by tone', () => {
    const {rerender} = render(<AdminStatusBadge tone="success">x</AdminStatusBadge>);
    const success = screen.getByText('x').className;
    rerender(<AdminStatusBadge tone="danger">x</AdminStatusBadge>);

    expect(screen.getByText('x').className).not.toBe(success);
  });
});

describe('AdminPagination', () => {
  const pagination = (props: Partial<Parameters<typeof AdminPagination>[0]> = {}) => {
    const onPageChange = vi.fn();
    render(<AdminPagination page={1} pageCount={4} pageSize={8} total={32} onPageChange={onPageChange} {...props} />);
    return onPageChange;
  };

  it('renders nothing for an empty list', () => {
    pagination({total: 0, pageCount: 1});
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('summarises the visible range', () => {
    pagination({page: 2});
    expect(screen.getByText(t('admin.pagination.summary', {from: 9, to: 16, total: 32}))).toBeInTheDocument();
  });

  it('caps the last range at the total', () => {
    pagination({page: 4, total: 27});
    expect(screen.getByText(t('admin.pagination.summary', {from: 25, to: 27, total: 27}))).toBeInTheDocument();
  });

  it('disables previous on the first page and next on the last', () => {
    const {unmount} = render(<AdminPagination page={1} pageCount={4} pageSize={8} total={32} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', {name: t('admin.pagination.previous')})).toBeDisabled();
    expect(screen.getByRole('button', {name: t('admin.pagination.next')})).toBeEnabled();
    unmount();

    render(<AdminPagination page={4} pageCount={4} pageSize={8} total={32} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', {name: t('admin.pagination.next')})).toBeDisabled();
  });

  it('goes to the previous, next and a chosen page', async () => {
    const user = userEvent.setup();
    const onPageChange = pagination({page: 2});

    await user.click(screen.getByRole('button', {name: t('admin.pagination.previous')}));
    await user.click(screen.getByRole('button', {name: t('admin.pagination.next')}));
    await user.click(screen.getByRole('button', {name: t('admin.pagination.page', {page: 4})}));

    expect(onPageChange.mock.calls).toEqual([[1], [3], [4]]);
  });

  it('marks the current page', () => {
    pagination({page: 3});

    expect(screen.getByRole('button', {name: t('admin.pagination.page', {page: 3})})).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', {name: t('admin.pagination.page', {page: 2})})).not.toHaveAttribute('aria-current');
  });

  it('shows "page x of y" for phones', () => {
    pagination({page: 2});
    expect(screen.getByText(t('admin.pagination.pageOf', {page: 2, pages: 4}))).toBeInTheDocument();
  });

  it('folds long ranges with … around the current page', () => {
    pagination({page: 5, pageCount: 10, total: 80});

    // 1 … 4 5 6 … 10
    expect(screen.getAllByText('…')).toHaveLength(2);
    for (const page of [1, 4, 5, 6, 10]) {
      expect(screen.getByRole('button', {name: t('admin.pagination.page', {page})})).toBeInTheDocument();
    }
    expect(screen.getByRole('button', {name: t('admin.pagination.page', {page: 4})})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('admin.pagination.page', {page: 10})})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('admin.pagination.page', {page: 7})})).toBeNull();
  });

  it('has no gap when pages are consecutive', () => {
    pagination({page: 2, pageCount: 3, total: 24});
    expect(screen.queryByText('…')).toBeNull();
  });
});

describe('AdminSearch', () => {
  it('reports typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AdminSearch value="" onChange={onChange} placeholder="Tìm người dùng" />);

    await user.type(screen.getByRole('searchbox', {name: 'Tìm người dùng'}), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('button', {name: t('admin.common.clearSearch')})).toBeNull();
  });

  it('clears the search', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AdminSearch value="abc" onChange={onChange} placeholder="Tìm" />);

    await user.click(screen.getByRole('button', {name: t('admin.common.clearSearch')}));

    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('AdminFilter', () => {
  it('lists the options and reports the choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AdminFilter
        label="Vai trò"
        value="all"
        onChange={onChange}
        options={[
          {value: 'all', label: 'Mọi vai trò'},
          {value: 'admin', label: 'Quản trị viên'},
        ]}
      />,
    );

    const select = screen.getByLabelText('Vai trò');
    expect(within(select).getAllByRole('option')).toHaveLength(2);
    expect(select).toHaveValue('all');

    await user.selectOptions(select, 'admin');
    expect(onChange).toHaveBeenCalledWith('admin');
  });
});

describe('AdminConfirmDialog', () => {
  const props = {
    title: 'Xóa?',
    description: 'Không thể hoàn tác.',
    confirmLabel: 'Xóa',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders nothing while closed', () => {
    render(<AdminConfirmDialog open={false} {...props} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('is an accessible dialog named and described by its texts', () => {
    render(<AdminConfirmDialog open {...props} />);

    const dialog = screen.getByRole('alertdialog', {name: 'Xóa?'});
    expect(dialog).toHaveAccessibleDescription('Không thể hoàn tác.');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('confirms and cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<AdminConfirmDialog open {...props} onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', {name: 'Xóa'}));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByRole('button', {name: t('common.cancel')}));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels with Escape and with a click on the backdrop', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const {container} = render(<AdminConfirmDialog open {...props} onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(container.querySelector('[aria-hidden="true"].absolute')!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('uses the danger or the primary style', () => {
    const {rerender} = render(<AdminConfirmDialog open {...props} />);
    expect(screen.getByRole('button', {name: 'Xóa'})).toHaveClass('bg-rose-600');

    rerender(<AdminConfirmDialog open {...props} tone="primary" />);
    expect(screen.getByRole('button', {name: 'Xóa'})).toHaveClass('bg-brand-700');
  });

  it('focuses Cancel, keeps the focus inside, and gives it back to the opener', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Mở</button>
          <AdminConfirmDialog open={open} {...props} onCancel={() => setOpen(false)} />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', {name: 'Mở'});
    await user.click(opener);

    const cancel = screen.getByRole('button', {name: t('common.cancel')});
    const confirm = screen.getByRole('button', {name: 'Xóa'});
    expect(cancel).toHaveFocus();

    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab({shift: true});
    expect(confirm).toHaveFocus();
    await user.tab({shift: true});
    expect(cancel).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(opener).toHaveFocus();
  });
});

describe('AdminEmptyState / AdminLoadingState / NoResults', () => {
  it('AdminEmptyState shows a title, a description and an action', () => {
    render(<AdminEmptyState title="Trống" description="Chưa có gì" action={<button>Tạo</button>} />);

    expect(screen.getByText('Trống')).toBeInTheDocument();
    expect(screen.getByText('Chưa có gì')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Tạo'})).toBeInTheDocument();
  });

  it('AdminEmptyState works with only a title and a custom icon', () => {
    render(<AdminEmptyState icon={IoPeopleOutline} title="Chỉ tiêu đề" />);
    expect(screen.getByText('Chỉ tiêu đề')).toBeInTheDocument();
  });

  it.each(['table', 'cards', 'spinner'] as const)('AdminLoadingState (%s) announces the loading', variant => {
    render(<AdminLoadingState variant={variant} />);
    expect(screen.getByRole('status')).toHaveTextContent(t('admin.common.loading'));
  });

  it('AdminLoadingState is a spinner by default', () => {
    render(<AdminLoadingState />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('NoResults resets the filters', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<NoResults onReset={onReset} />);

    expect(screen.getByText(t('admin.common.noResults'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('admin.common.resetFilters')}));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('AdminDataTable', () => {
  type Row = {id: string; name: string; score: number};
  const columns: AdminColumn<Row>[] = [
    {key: 'name', header: 'Tên', cell: row => row.name},
    {key: 'score', header: 'Điểm', align: 'right', hideBelow: 'md', cell: row => row.score},
    {key: 'wide', header: 'Rộng', hideBelow: 'lg', cell: () => 'w'},
    {key: 'huge', header: 'Rất rộng', hideBelow: 'xl', cell: () => 'h'},
    {key: 'actions', header: 'Thao tác', pinned: true, align: 'right', cell: () => 'a'},
  ];
  const rows: Row[] = [
    {id: '1', name: 'An', score: 10},
    {id: '2', name: 'Bình', score: 20},
  ];
  const table = (props: Partial<Parameters<typeof AdminDataTable<Row>>[0]> = {}) =>
    render(
      <AdminDataTable columns={columns} rows={rows} rowKey={row => row.id} caption="Danh sách" empty={<p>Không có</p>} {...props} />,
    );

  it('renders a captioned table with a header and one row per item', () => {
    table();

    const grid = screen.getByRole('table', {name: 'Danh sách'});
    expect(within(grid).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(grid).getAllByRole('row')).toHaveLength(3);
    expect(within(grid).getByText('Bình')).toBeInTheDocument();
  });

  it('hides columns on small screens, right-aligns and pins as asked', () => {
    table();

    expect(screen.getByRole('columnheader', {name: 'Điểm'})).toHaveClass('hidden', 'md:table-cell', 'text-right');
    expect(screen.getByRole('columnheader', {name: 'Rộng'})).toHaveClass('lg:table-cell');
    expect(screen.getByRole('columnheader', {name: 'Rất rộng'})).toHaveClass('xl:table-cell');
    expect(screen.getByRole('columnheader', {name: 'Tên'})).toHaveClass('text-left');
    expect(screen.getByRole('columnheader', {name: 'Thao tác'})).toHaveClass('sticky', 'right-0', 'bg-slate-50');
    expect(screen.getAllByRole('cell', {name: 'a'})[0]).toHaveClass('sticky', 'bg-white');
  });

  it('shows the skeleton while loading', () => {
    table({loading: true});

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the empty state without rows', () => {
    table({rows: []});

    expect(screen.getByText('Không có')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('small building blocks', () => {
  it('AdminAvatar shows the photo, or the first letter', () => {
    const {container, rerender} = render(<AdminAvatar name="Lan" src="http://img/lan.jpg" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'http://img/lan.jpg');

    rerender(<AdminAvatar name="lan" />);
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('AdminAvatar falls back to A and has a small size', () => {
    render(<AdminAvatar name="" size="sm" />);
    expect(screen.getByText('A')).toHaveClass('size-7');
  });

  it('AdminRowAction is a labelled button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const {rerender} = render(<AdminRowAction icon={IoPeopleOutline} label="Xem An" onClick={onClick} />);

    await user.click(screen.getByRole('button', {name: 'Xem An'}));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Xem An'})).toHaveAttribute('title', 'Xem An');
    expect(screen.getByRole('button')).not.toHaveClass('hover:text-rose-600');

    rerender(<AdminRowAction icon={IoPeopleOutline} label="Xóa An" onClick={onClick} danger />);
    expect(screen.getByRole('button', {name: 'Xóa An'})).toHaveClass('hover:text-rose-600');
  });

  it('AdminMeter fills the ratio and never overflows', () => {
    const {container, rerender} = render(<AdminMeter ratio={0.4} />);
    expect((container.firstElementChild!.firstElementChild as HTMLElement).style.width).toBe('40%');

    rerender(<AdminMeter ratio={1.7} />);
    expect((container.firstElementChild!.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('AdminCard has an optional header', () => {
    const {container, rerender} = render(<AdminCard>nội dung</AdminCard>);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('nội dung')).toBeInTheDocument();

    rerender(
      <AdminCard title="Tiêu đề" description="Mô tả" actions={<button>Làm gì đó</button>} className="extra">
        nội dung
      </AdminCard>,
    );
    expect(screen.getByRole('heading', {name: 'Tiêu đề'})).toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Làm gì đó'})).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('extra');
  });

  it('AdminCard with a title but no description or actions', () => {
    render(<AdminCard title="Chỉ tiêu đề">x</AdminCard>);
    expect(screen.getByRole('heading', {name: 'Chỉ tiêu đề'})).toBeInTheDocument();
  });

  it('AdminPageHeader shows the title, description and actions', () => {
    const {rerender} = render(<AdminPageHeader title="Người dùng" />);
    expect(screen.getByRole('heading', {level: 1, name: 'Người dùng'})).toBeInTheDocument();

    rerender(<AdminPageHeader title="Người dùng" description="Quản lý tài khoản" actions={<button>Thêm</button>} />);
    expect(screen.getByText('Quản lý tài khoản')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Thêm'})).toBeInTheDocument();
  });
});

describe('AdminBarChart', () => {
  const data = [
    {label: 'T1', value: 120},
    {label: 'T2', value: 480},
    {label: 'T3', value: 0},
  ];
  const format = (n: number) => `${n}đ`;

  it('draws one bar per point scaled to a round top', () => {
    const {container} = render(<AdminBarChart title="Doanh thu" data={data} format={format} />);

    const heights = [...container.querySelectorAll<HTMLElement>('.rounded-t-\\[4px\\]')].map(bar => bar.style.height);
    // axis top: 500
    expect(heights).toEqual(['24%', '96%', '0%']);
    // axis ticks: top, middle, zero
    for (const tick of ['500đ', '250đ', '0đ']) {
      expect(screen.getAllByText(tick).length).toBeGreaterThan(0);
    }
  });

  it('has a tooltip per bar and the same numbers as a table', () => {
    render(<AdminBarChart title="Doanh thu" data={data} format={format} />);

    const table = screen.getByRole('table', {name: 'Doanh thu'});
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('row', {name: /T2.*480đ/})).toBeInTheDocument();
    expect(screen.getByText(t('admin.common.showTable'))).toBeInTheDocument();
  });

  it('labels at most six points of a long series', () => {
    const long = Array.from({length: 30}, (_, i) => ({label: `d${i}`, value: i + 1}));
    const {container} = render(<AdminBarChart title="Dài" data={long} format={String} />);

    const labels = [...container.querySelectorAll('div.ml-14 span.absolute')].map(span => span.textContent);
    // every 5th point: d0, d5, ...
    expect(labels).toEqual(['d0', 'd5', 'd10', 'd15', 'd20', 'd25']);
  });

  it('copes with a series of zeros', () => {
    const {container} = render(<AdminBarChart title="Rỗng" data={[{label: 'a', value: 0}]} format={String} />);
    expect(container.querySelector<HTMLElement>('.rounded-t-\\[4px\\]')!.style.height).toBe('0%');
  });

  it('rounds the top of the axis up to one significant digit', () => {
    render(<AdminBarChart title="x" data={[{label: 'a', value: 1840}]} format={String} />);
    expect(screen.getAllByText('2000').length).toBeGreaterThan(0);
  });
});
