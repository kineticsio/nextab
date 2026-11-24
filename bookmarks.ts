import {
  type BookmarkNode,
  getBookmarksTree,
  removeBookmark,
  addBookmarkListener,
} from "./src/adapters/bookmarks";
import { hasBookmarksApi } from "./src/adapters/capabilities";
import { loadFavicon } from "./src/adapters/favicon";

export function mountBookmarks() {
  if (!hasBookmarksApi()) {
    // Safari or browsers without bookmarks permission: cleanly skip mounting
    return;
  }

  const section = document.createElement("section");
  section.className = "bookmarks glass";

  const header = document.createElement("div");
  header.className = "bookmarks-header";

  const heading = document.createElement("h2");
  heading.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v18l-6-3.5-6 3.5v-18Z"/>
    </svg>
    <span>Bookmarks</span>
  `;

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "bookmarks-refresh";
  refresh.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg>`;
  refresh.title = "Refresh bookmarks";
  refresh.setAttribute("aria-label", "Refresh bookmarks");
  refresh.addEventListener("click", loadBookmarks);

  header.append(heading, refresh);

  const list = document.createElement("div");
  list.className = "bookmarks-list";

  section.append(header, list);
  document.body.append(section);

  async function loadBookmarks() {
    try {
      const tree = await getBookmarksTree();
      list.replaceChildren();

      const saved: BookmarkNode[] = [];

      function collect(nodes: BookmarkNode[]) {
        for (const node of nodes) {
          if (node.url && /^https?:\/\//i.test(node.url)) {
            saved.push(node);
          }
          if (node.children) collect(node.children);
        }
      }

      collect(tree);

      if (saved.length === 0) {
        const empty = document.createElement("p");
        empty.className = "bookmarks-empty";
        empty.textContent = "Your bookmarks will appear here.";
        list.append(empty);
        return;
      }

      for (const bookmark of saved) {
        const item = document.createElement("div");
        item.className = "bookmark-item";

        const link = document.createElement("a");
        link.className = "bookmark-link";
        link.href = bookmark.url!;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = bookmark.title || bookmark.url!;

        const icon = document.createElement("img");
        icon.alt = "";
        icon.loading = "lazy";
        loadFavicon(icon, bookmark.url!, undefined, bookmark.title);

        const name = document.createElement("span");
        name.textContent = bookmark.title || bookmark.url!;

        link.append(icon, name);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.innerHTML = `
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 2 L10 10 M10 2 L2 10"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"/>
  </svg>
`;
        remove.title = "Remove bookmark";
        remove.setAttribute("aria-label", "Remove bookmark");
        remove.className = "bookmark-remove";

        remove.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (confirm(`Remove "${bookmark.title || bookmark.url}" from bookmarks?`)) {
            await removeBookmark(bookmark.id);
            loadBookmarks();
          }
        });

        item.append(link, remove);
        list.append(item);
      }
    } catch {
      list.replaceChildren();
    }
  }

  loadBookmarks();
  addBookmarkListener(loadBookmarks);
}
