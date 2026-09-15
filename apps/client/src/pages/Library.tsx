import { SeoHead } from '@/components/seo/SeoHead';
import { formatPageTitle, PAGE_TITLES } from '@/lib/site';
import { collectionPageJsonLd } from '@/lib/jsonLd';
import { LibraryPageContent } from '@/features/library/components/LibraryPageContent';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';

export default function Library() {
  const title = formatPageTitle(PAGE_TITLES.library);
  return (
    <>
      <SeoHead
        title={PAGE_TITLES.library}
        description={LIBRARY_COPY.heroSubtitle}
        path="/library"
        jsonLd={collectionPageJsonLd({
          name: title,
          description: LIBRARY_COPY.heroSubtitle,
          path: '/library',
        })}
      />
      <LibraryPageContent />
    </>
  );
}
