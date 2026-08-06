// src/components/organisms/StickyActionBar.jsx
import Button from '../atoms/Button'

/**
 * Sticky bottom action bar (brief section 5). Save is the visually
 * dominant action (primary variant, larger), matching the brief's
 * explicit complaint that the original Save button "is not visually
 * dominant" (problem #9).
 */
export default function StickyActionBar({ onCancel, onSaveDraft, onSave, saving, dirty }) {
  return (
    <div className="sticky bottom-0 -mx-4 border-t border-app-border bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="text-xs text-slate-500" aria-live="polite">
          {saving ? 'Menyimpan…' : dirty ? 'Ada perubahan belum disimpan' : 'Semua perubahan tersimpan'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Batal</Button>
          {/* Only rendered if the caller actually wires up draft-saving --
              there's no "draft" concept in the database (employees is the
              live record, no separate drafts table), so a caller that
              doesn't pass onSaveDraft shouldn't get a button that looks
              functional but silently does nothing when clicked. */}
          {onSaveDraft && (
            <Button variant="secondary" onClick={onSaveDraft} disabled={saving}>Simpan Draf</Button>
          )}
          <Button variant="primary" size="lg" onClick={onSave} disabled={saving}>
            {saving ? 'Menyimpan…' : '💾 Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
