import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoStar, IoStarOutline, IoTrashOutline} from 'react-icons/io5';
import {Link} from 'react-router-dom';
import {adminRoutes} from '@/app/routes';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminFilter from '../components/AdminFilter';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminRowAction from '../components/AdminRowAction';
import AdminSearch from '../components/AdminSearch';
import NoResults from '../components/NoResults';
import {adminToolbar} from '../components/styles';
import {useAdminReviews, useDeleteReview} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {useAdminToast} from '../hooks/useAdminToast';
import {ALL, useTableState} from '../hooks/useTableState';
import type {AdminReview} from '../types';

const STARS = [1, 2, 3, 4, 5];

// Destination reviews written by the travelers. The admin reads them and removes the ones that break
// the rules (the average rating of the destination follows at once).
export default function ReviewsPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const remove = useDeleteReview();
  const {data, isLoading} = useAdminReviews();
  const table = useTableState(data, {
    searchText: review => `${review.content} ${review.author} ${review.destination}`,
    filters: {
      destination: (review, value) => review.destination === value,
      rating: (review, value) => String(review.rating) === value,
    },
  });
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);
  const destinations = [...new Set((data ?? []).map(review => review.destination))].sort();

  const columns: AdminColumn<AdminReview>[] = [
    {
      key: 'review',
      header: t('admin.reviews.columns.review'),
      cell: review => (
        <div className="max-w-52 min-w-0 sm:max-w-md">
          <p className="line-clamp-2 break-words whitespace-pre-line text-slate-900">{review.content}</p>
          <p className="text-xs text-slate-500">{review.destination}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: t('admin.reviews.columns.rating'),
      cell: review => (
        <span
          role="img"
          aria-label={t('admin.reviews.stars', {count: review.rating})}
          className="inline-flex items-center gap-0.5 text-amber-500">
          {STARS.map(n => (n <= review.rating ? <IoStar key={n} size={14} /> : <IoStarOutline key={n} size={14} />))}
        </span>
      ),
    },
    {
      key: 'author',
      header: t('admin.reviews.columns.author'),
      hideBelow: 'md',
      cell: review =>
        review.authorId ? (
          <Link to={`${adminRoutes.users}/${review.authorId}`} className="text-brand-700 hover:underline">
            {review.author || review.authorId}
          </Link>
        ) : (
          review.author
        ),
    },
    {
      key: 'date',
      header: t('admin.reviews.columns.date'),
      hideBelow: 'lg',
      cell: review => (
        <span className="whitespace-nowrap">
          {format.date(review.createdAt)}
          {new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 1000 && (
            <span className="block text-xs text-slate-500">{t('admin.reviews.edited')}</span>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      pinned: true,
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      cell: review => (
        <div className="flex justify-end gap-1">
          <AdminRowAction
            danger
            icon={IoTrashOutline}
            label={t('admin.reviews.deleteItem', {name: review.author || review.destination})}
            onClick={() => setToDelete(review)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.reviews.title')} description={t('admin.reviews.description')} />

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.reviews.search')} />
          <AdminFilter
            label={t('admin.reviews.destination')}
            value={table.filter('destination')}
            onChange={value => table.setFilter('destination', value)}
            options={[
              {value: ALL, label: t('admin.reviews.allDestinations')},
              ...destinations.map(name => ({value: name, label: name})),
            ]}
          />
          <AdminFilter
            label={t('admin.reviews.rating')}
            value={table.filter('rating')}
            onChange={value => table.setFilter('rating', value)}
            options={[
              {value: ALL, label: t('admin.reviews.allRatings')},
              ...STARS.slice()
                .reverse()
                .map(n => ({value: String(n), label: t('admin.reviews.stars', {count: n})})),
            ]}
          />
        </div>
        <AdminDataTable
          caption={t('admin.reviews.title')}
          columns={columns}
          rows={table.rows}
          rowKey={review => review.id}
          loading={isLoading}
          empty={<NoResults onReset={table.reset} />}
        />
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.reviews.deleteTitle')}
        description={t('admin.reviews.deleteText', {author: toDelete?.author, destination: toDelete?.destination})}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const review = toDelete!;
          setToDelete(null);
          remove.mutate(review.id, {
            onSuccess: () => toast.done(t('admin.reviews.deleted')),
            onError: toast.failed,
          });
        }}
      />
    </>
  );
}
