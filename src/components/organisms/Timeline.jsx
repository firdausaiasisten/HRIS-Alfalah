// src/components/organisms/Timeline.jsx
import Card from './Card'
import EmptyState from '../molecules/EmptyState'

/**
 * items: [{ year, title, description }], newest-first or oldest-first is
 * the caller's choice -- this component just renders the order it's given.
 */
export default function Timeline({ items = [] }) {
  return (
    <Card title="Linimasa Karier" icon="🕒" description="Riwayat mutasi, promosi, dan pencapaian">
      {items.length === 0 ? (
        <EmptyState icon="🕒" title="Belum ada riwayat" description="Riwayat karier pegawai akan muncul di sini." />
      ) : (
        <ol className="relative border-s-2 border-app-border ps-5">
          {items.map((item, i) => (
            <li key={i} className="mb-6 last:mb-0">
              <span
                className="absolute -start-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white bg-brand-primary"
                aria-hidden="true"
              />
              <time className="text-xs font-semibold text-brand-primary">{item.year}</time>
              <p className="mt-0.5 font-medium text-slate-900">{item.title}</p>
              {item.description && <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
