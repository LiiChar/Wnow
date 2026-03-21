import { createSignal } from 'solid-js';

export type Page = 'dictionary' | 'study' | 'settings' | 'pro';

const [currentPage, setPage] = createSignal<Page>('dictionary');

export const navigateTo = (page: Page) => {
  setPage(page);
};

export { currentPage };

