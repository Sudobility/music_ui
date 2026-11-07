/**
 * What an export writes, decided before anything is written.
 *
 * The formats, their extensions, their labels and the choice of which score a
 * scope means are facts about the product (music_types' `WRITABLE_EXPORT_FORMATS`
 * and `ExportPlan`); deciding a plan is here, because export is not editing.
 * What stays with the host is everything platform- or package-bound: naming the
 * file, rendering audio, fitting a tracker module and the write itself. `route`
 * says which of those a format needs.
 */
import { WRITABLE_EXPORT_FORMATS } from '../app-library';
import type { ExportFormatId, ExportPlan, ExportScope } from '../app-library';
import { exportTargetScore } from '@sudobility/music_editing';
import type { EditingState, EditingStoreApi } from '@sudobility/music_editing';

/**
 * The plan for writing `format` at `scope`, or null with no score.
 *
 * A project file ignores the scope: it *is* the document, and hiding a track
 * is a view preference — saving the project must not throw a part away.
 */
export function planExport<T extends EditingState>(
  store: EditingStoreApi<T>,
  format: ExportFormatId,
  scope: ExportScope,
): ExportPlan | null {
  const entry = WRITABLE_EXPORT_FORMATS.find((f) => f.id === format);
  if (!entry) return null;
  const target = exportTargetScore(store, entry.route === 'project' ? 'all' : scope);
  if (!target) return null;
  return {
    format: entry.id,
    extension: entry.extension,
    route: entry.route,
    target,
    title: target.metadata.title,
  };
}
