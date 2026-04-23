import "@testing-library/react";

// TanStack Router scroll restoration touches window.scrollTo, which jsdom doesn't implement.
// We stub it for tests that mount the router.
Object.defineProperty(window, "scrollTo", {
  value: () => {},
  writable: true,
});
