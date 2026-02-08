# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.0-alpha.1] - 2026-02-07

### Added
- **Market Status**: Real-time indicator for market open/closed status.
- **Portfolio Import**: New page to bulk import portfolio data via copy/paste (CSV/TSV support).
- **Visualizations**: Added 30-day performance charts to the portfolio view.
- **Data Freshness**: "Last Updated" timestamps on all data cards with manual refresh controls.
- **Backend Rate Limiting**: Moved rate limiting to the server to optimize API usage and prevent throttling on cache hits.
- **Cache Management**: Improved caching strategy for news and stock data to reduce external API calls.
- **Logs Viewer**: Added a toggle to show/hide cache hits for cleaner debugging.

### Changed
- **Performance**: Optimized data fetching to prioritize user-initiated requests (search/quote) over background updates.
- **UI/UX**: Standardized "Refresh" buttons across Dashboard, Market, and News pages.
- **Security**: Removed local database tracking from git to protect user data.

### Fixed
- Resolved linting errors across the codebase.
- Fixed `flakey` e2e tests by improving selector waits.
- Corrected API cache miss issues.
