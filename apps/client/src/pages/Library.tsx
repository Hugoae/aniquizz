import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { LibraryPageContent } from '@/features/library/components/LibraryPageContent';

export default function Library() {
  return (
    <>
      <SeoHead
        title={PAGE_TITLES.library}
        description="Parcourez le catalogue AniQuizz : openings et endings. Écoutez les extraits et retrouvez vos découvertes en partie."
        path="/library"
      />
      <LibraryPageContent />
    </>
  );
}
