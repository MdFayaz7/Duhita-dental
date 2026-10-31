const DOMAIN = 'https://duhitadental.com';

/** BreadcrumbList JSON-LD from [label, path] pairs, matching the visible breadcrumb trail. */
export const breadcrumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: `${DOMAIN}${path}`,
  })),
});
