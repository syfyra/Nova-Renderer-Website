// The documentation sidebar, in reading order.
export const docsNav = [
  {
    title: 'Start',
    items: [
      { slug: '', label: 'Get started' },
      { slug: 'solaris', label: 'Use in Solaris' },
      { slug: 'husk', label: 'husk and nova_cli' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { slug: 'render-settings', label: 'Render settings' },
      { slug: 'object-properties', label: 'Object properties' },
      { slug: 'karma', label: 'Karma compatibility' },
      { slug: 'materials', label: 'Materials' },
      { slug: 'limitations', label: 'Limitations' },
    ],
  },
  {
    title: 'Develop',
    items: [{ slug: 'build', label: 'Build from source' }],
  },
];

export const docsFlat = docsNav.flatMap((g) => g.items);
